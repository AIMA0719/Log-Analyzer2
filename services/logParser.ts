
import { LogEntry, LogCategory, SessionMetadata, ParsedData, BillingEntry, LifecycleEvent, StorageStatus, PurchasedProfile } from '../types';
import { parseObdLine, aggregateMetrics } from './obdParser';

const REGEX_GUIDE_TIMESTAMP = /^\[(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}:\d{3})\]\/\/(.*)/;
const SECTION_HEADER = /^={3,}\s*(.*?)\s*={3,}/;
const KEY_VALUE_PAIR = /^([^:]+?)\s*:\s*(.*)/;
const REGEX_GPA_ID = /GPA\.\d{4}-\d{4}-\d{4}-\d{4}/g;

const parseLogDate = (timestampStr: string): Date => {
  try {
    const isoStr = timestampStr.replace(' ', 'T').replace(/:(\d{3})$/, '.$1');
    return new Date(isoStr);
  } catch {
    return new Date();
  }
};

const parseProfiles = (message: string): PurchasedProfile[] => {
  const profiles: PurchasedProfile[] = [];
  const match = message.match(/userPurchasedProfiles\s*:\s*\[(.*?)\]/s);
  if (!match) return [];

  const profilesContent = match[1];
  const profileBlocks = profilesContent.split(/Profile\(/).filter(p => p.trim());

  profileBlocks.forEach(block => {
    try {
      const getVal = (key: string) => {
        const regex = new RegExp(`${key}=(?:Model\\{)?(?:['"]?)([^,'"}]+)(?:['"]?)(?:\\})?`, 'i');
        return block.match(regex)?.[1] || 'Unknown';
      };
      const modelKo = block.match(/modelName_ko='([^']+)'/)?.[1];
      const modelEn = block.match(/modelName_en='([^']+)'/)?.[1];

      profiles.push({
        id: getVal('id'),
        region: getVal('regionName'),
        modelName: modelKo || modelEn || 'Unknown Model',
        year: getVal('modelYear'),
        engine: getVal('engineType'),
        isMobdPlus: getVal('isMobdPlus') === 'true',
        updateTime: getVal('updateTime')
      });
    } catch (e) {
      console.warn("Failed to parse profile block", block);
    }
  });
  return profiles;
};

export const parseLogFile = (content: string, fileName: string, billingContent: string = ''): ParsedData => {
  const lines = content.split(/\r?\n/);
  const logs: LogEntry[] = [];
  const lifecycleEvents: LifecycleEvent[] = [];
  const billingLogs: BillingEntry[] = [];
  const purchasedProfiles: PurchasedProfile[] = [];
  const orderIdSet = new Set<string>();
  const obdSeries: any[] = [];
  
  const metadata: SessionMetadata = {
    fileName, model: '알 수 없음', userOS: '알 수 없음', appVersion: '알 수 없음', carName: '알 수 없음', userId: '알 수 없음',
    logCount: 0, startTime: null, endTime: null, deviceInfo: {}, protocolInfo: {}, obd2Info: {}, userInfo: {}, carInfo: {}, settingInfo: {}
  };

  const storageInfo: StorageStatus = { availableBytes: 'Unknown', settingsSize: 'Unknown', exists: false, readable: false, writable: false };

  let currentSection = 'UNKNOWN';
  let lastLogEntry: LogEntry | null = null;

  const allLines = [...lines, ...billingContent.split(/\r?\n/)];

  allLines.forEach((line) => {
    if (!line.trim()) return;

    const sectionMatch = line.match(SECTION_HEADER);
    if (sectionMatch) {
      currentSection = sectionMatch[1].toUpperCase().replace(/\sINFO/g, '');
      return;
    }

    const kvMatch = line.match(KEY_VALUE_PAIR);
    if (kvMatch && !line.trim().startsWith('[')) {
      const k = kvMatch[1].trim();
      const v = kvMatch[2].trim();
      
      // Essential metadata extraction
      if (k === 'model') metadata.model = v;
      if (k === 'carName') metadata.carName = v;
      if (k === 'userId' || k === 'userKey') metadata.userId = v;
      if (k === 'userOS') metadata.userOS = v;
      if (k === 'version' || k === 'App version') metadata.appVersion = v;
      if (k === 'countryCode' || k === 'country') metadata.countryCode = v;
      if (k === 'protocol' || k === 'AT DPN') metadata.protocol = v;
      
      const targetMap = (metadata as any)[`${currentSection.toLowerCase()}Info`];
      if (targetMap) targetMap[k] = v;
      return;
    }

    const tsMatch = line.match(REGEX_GUIDE_TIMESTAMP);
    if (tsMatch) {
      const rawTimestamp = tsMatch[1];
      const timestamp = parseLogDate(rawTimestamp);
      const message = tsMatch[2];
      
      const isBilling = /purchase|signature|receipt|verifyReceipt|available storage|Setting\.xml|userPurchasedProfiles/i.test(message) || fileName.includes('billing');
      const category = isBilling ? LogCategory.BILLING : (message.includes('01 0D') ? LogCategory.OBD : LogCategory.INFO);

      // Order IDs & Profiles
      const gpaMatches = message.match(REGEX_GPA_ID);
      if (gpaMatches) gpaMatches.forEach(id => orderIdSet.add(id));
      if (message.includes('userPurchasedProfiles')) {
        const found = parseProfiles(message);
        if (found.length > 0) purchasedProfiles.push(...found.filter(f => !purchasedProfiles.some(p => p.id === f.id)));
      }

      const logEntry: LogEntry = {
        id: logs.length, timestamp, rawTimestamp, message,
        category, isError: /fail|exception|error|unable/i.test(message),
        originalLine: line
      };
      logs.push(logEntry);
      lastLogEntry = logEntry;

      // Extract Lifecycle Events (Timeline) - Included Android "setScreen"
      const isScreen = message.includes('Move to screen') || 
                       message.includes('setScreen') || 
                       message.includes('onStart') || 
                       message.includes('onResume');
                       
      const isConnection = message.includes('Bluetooth') || 
                           message.includes('connectionSuccess') || 
                           message.includes('AT ') || 
                           message.includes('ELM');
      
      if (isScreen || isConnection) {
        lifecycleEvents.push({
          id: lifecycleEvents.length,
          timestamp,
          rawTimestamp,
          type: isScreen ? 'SCREEN' : 'CONNECTION',
          message: message.trim(),
          details: line
        });
      }

      // Billing Storage Info
      if (isBilling) {
        if (message.includes('Available storage')) storageInfo.availableBytes = message.split(':')[1]?.trim();
        if (message.includes('Setting.xml size')) storageInfo.settingsSize = message.split(':')[1]?.trim();
        if (message.includes('Setting.xml does not exist')) storageInfo.exists = false;
        if (message.includes('Setting.xml size')) storageInfo.exists = true;
      }

      const obdPoint = parseObdLine(line);
      if (obdPoint) obdSeries.push(obdPoint);
    } else if (lastLogEntry) {
      lastLogEntry.message += '\n' + line;
    }
  });

  metadata.logCount = logs.length;
  if (logs.length > 0) {
    metadata.startTime = logs[0].timestamp;
    metadata.endTime = logs[logs.length - 1].timestamp;
  }

  return { 
    metadata, logs, lifecycleEvents, billingLogs, billingFlows: [], 
    purchasedProfiles, orderIds: Array.from(orderIdSet),
    storageInfo, diagnosis: { status: 'SUCCESS', summary: '정상', issues: [], csType: 'NONE' }, 
    fileList: [], obdSeries, metrics: aggregateMetrics(obdSeries) 
  };
};
