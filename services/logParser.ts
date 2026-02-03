
import { LogEntry, LogCategory, SessionMetadata, ParsedData, ConnectionDiagnosis, BillingEntry, BillingFlow, LifecycleEvent, StorageStatus } from '../types';
import { parseObdLine, aggregateMetrics } from './obdParser';

const REGEX_GUIDE_TIMESTAMP = /^\[(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}:\d{3})\]\/\/(.*)/;
const SECTION_HEADER = /^={3,}\s*(.*?)\s*={3,}/;
const KEY_VALUE_PAIR = /^([^:]+?)\s*:\s*(.*)/;

const parseLogDate = (timestampStr: string): Date => {
  try {
    const isoStr = timestampStr.replace(' ', 'T').replace(/:(\d{3})$/, '.$1');
    return new Date(isoStr);
  } catch {
    return new Date();
  }
};

const determineBillingType = (msg: string): BillingEntry['type'] => {
  const m = msg.toLowerCase();
  if (m.includes('purchase :')) return 'PURCHASE';
  if (m.includes('signature :')) return 'SIGNATURE';
  if (m.includes('receiptresponse :') || m.includes('createreceiptresponse')) return 'RECEIPT';
  if (m.includes('verifyreceiptbody')) return 'VERIFY_REQ';
  if (m.includes('restore')) return 'RESTORE';
  if (m.includes('expiry') || m.includes('expired')) return 'EXPIRY';
  if (m.includes('available storage') || m.includes('prefs file')) return 'STORAGE';
  return 'INFO';
};

export const parseLogFile = (content: string, fileName: string, billingContent: string = ''): ParsedData => {
  const lines = content.split(/\r?\n/);
  const logs: LogEntry[] = [];
  const lifecycleEvents: LifecycleEvent[] = [];
  const billingLogs: BillingEntry[] = [];
  const obdSeries: any[] = [];
  
  const metadata: SessionMetadata = {
    fileName, model: '알 수 없음', userOS: '알 수 없음', appVersion: '알 수 없음', carName: '알 수 없음', userId: '알 수 없음',
    logCount: 0, startTime: null, endTime: null, deviceInfo: {}, protocolInfo: {}, obd2Info: {}, userInfo: {}, carInfo: {}, settingInfo: {}
  };

  const storageInfo: StorageStatus = { availableBytes: 'Unknown', settingsSize: 'Unknown', exists: false, readable: false, writable: false };

  let currentSection = 'UNKNOWN';
  let lastLogEntry: LogEntry | null = null;

  const allLines = [...lines, ...billingContent.split(/\r?\n/)];

  allLines.forEach((line, idx) => {
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
      if (k === 'model') metadata.model = v;
      if (k === 'carName') metadata.carName = v;
      if (k === 'userId' || k === 'userKey') metadata.userId = v;
      if (k === 'userOS') metadata.userOS = v;
      if (k === 'version' || k === 'App version') metadata.appVersion = v;
      
      const targetMap = (metadata as any)[`${currentSection.toLowerCase()}Info`];
      if (targetMap) targetMap[k] = v;
      return;
    }

    const tsMatch = line.match(REGEX_GUIDE_TIMESTAMP);
    if (tsMatch) {
      const rawTimestamp = tsMatch[1];
      const timestamp = parseLogDate(rawTimestamp);
      const message = tsMatch[2];
      
      const isBilling = /purchase|signature|receipt|verifyReceipt|available storage|Setting\.xml/i.test(message) || fileName.includes('billing');
      const category = isBilling ? LogCategory.BILLING : (message.includes('01 0D') ? LogCategory.OBD : LogCategory.INFO);

      const logEntry: LogEntry = {
        id: logs.length, timestamp, rawTimestamp, message,
        category, isError: /fail|exception|error|unable/i.test(message),
        originalLine: line
      };
      logs.push(logEntry);
      lastLogEntry = logEntry;

      // 1. Connection / Protocol Events
      const isBluetoothFlow = /Classic init|RX BLE init|scanConnect|SCAN Result|connectBluetooth|bluetoothConnectSuccess|connectionSuccess|connectionClose|connected_Finish|autoConnect/i.test(message);
      const isProtocolEmoji = /[🚀⏩✅⛔🚩👆🧹]/.test(message);
      if (isBluetoothFlow || isProtocolEmoji) {
        lifecycleEvents.push({
          id: logs.length, timestamp, rawTimestamp, type: 'CONNECTION',
          message: message, details: isProtocolEmoji ? '프로토콜 검색/변경' : '블루투스 연결 상태'
        });
      }

      // 2. Screen Tracking (Enhanced Regex)
      const screenMatch = message.match(/setScreen\s*[:\s(]*\s*([^\s)]+)/i);
      if (screenMatch) {
        const screenName = screenMatch[1];
        lifecycleEvents.push({
          id: logs.length, timestamp, rawTimestamp, type: 'SCREEN',
          message: `화면 이동: ${screenName}`, details: screenName
        });
      }

      // 3. Billing Logic
      if (isBilling || category === LogCategory.BILLING) {
        const bType = determineBillingType(message);
        const bStatus = logEntry.isError ? 'FAILURE' : (message.includes('Success') || message.includes('OK') ? 'SUCCESS' : 'INFO');
        let jsonData: string | undefined;
        if (message.includes('{')) jsonData = message.substring(message.indexOf('{'));

        billingLogs.push({
          id: billingLogs.length, timestamp, rawTimestamp, type: bType, 
          status: bStatus, message, jsonData, rawLog: line
        });

        if (message.includes('Available storage')) storageInfo.availableBytes = message.split(':')[1]?.trim();
        if (message.includes('Setting.xml size')) storageInfo.settingsSize = message.split(':')[1]?.trim();
        if (message.includes('Setting.xml does not exist')) storageInfo.exists = false;
        if (message.includes('readable')) storageInfo.readable = true;
        if (message.includes('writable')) storageInfo.writable = true;
      }

      const obdPoint = parseObdLine(line);
      if (obdPoint) obdSeries.push(obdPoint);
    } else if (lastLogEntry) {
      lastLogEntry.message += '\n' + line;
    }
  });

  // 4. Billing Grouping Logic (Refined)
  const billingFlows: BillingFlow[] = [];
  let currentFlow: BillingFlow | null = null;

  billingLogs.forEach(entry => {
    if (['PURCHASE', 'SIGNATURE', 'RECEIPT', 'VERIFY_REQ'].includes(entry.type)) {
      const isNewStart = entry.type === 'PURCHASE';
      const timeGap = currentFlow ? entry.timestamp.getTime() - currentFlow.lastUpdateTime.getTime() : 0;
      
      if (isNewStart || !currentFlow || timeGap > 600000) { // 10 min window
        currentFlow = {
          id: `FLOW_${entry.timestamp.getTime()}`,
          startTime: entry.timestamp,
          lastUpdateTime: entry.timestamp,
          steps: [entry],
          finalStatus: entry.status === 'FAILURE' ? 'FAILURE' : 'PENDING',
          hasPurchase: entry.type === 'PURCHASE',
          hasSignature: entry.type === 'SIGNATURE',
          hasReceipt: entry.type === 'RECEIPT'
        };
        billingFlows.push(currentFlow);
      } else {
        // Avoid duplicate log lines within the same flow step
        const isDuplicate = currentFlow.steps.some(s => s.message === entry.message);
        if (!isDuplicate) {
          currentFlow.steps.push(entry);
          currentFlow.lastUpdateTime = entry.timestamp;
          if (entry.type === 'PURCHASE') currentFlow.hasPurchase = true;
          if (entry.type === 'SIGNATURE') currentFlow.hasSignature = true;
          if (entry.type === 'RECEIPT') currentFlow.hasReceipt = true;
          if (entry.status === 'FAILURE') currentFlow.finalStatus = 'FAILURE';
          if (currentFlow.hasReceipt && currentFlow.finalStatus !== 'FAILURE') currentFlow.finalStatus = 'SUCCESS';
        }
      }
    }
  });

  metadata.logCount = logs.length;
  if (logs.length > 0) {
    metadata.startTime = logs[0].timestamp;
    metadata.endTime = logs[logs.length - 1].timestamp;
  }

  return { 
    metadata, logs, lifecycleEvents, billingLogs, billingFlows, 
    storageInfo, diagnosis: { status: 'SUCCESS', summary: '정상', issues: [], csType: 'NONE' }, 
    fileList: [], obdSeries, metrics: aggregateMetrics(obdSeries) 
  };
};
