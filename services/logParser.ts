
import { LogEntry, LogCategory, SessionMetadata, ParsedData, BillingEntry, LifecycleEvent, StorageStatus, PurchasedProfile } from '../types';
import { parseObdLine, aggregateMetrics, calculateTripStats } from './obdParser';

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

const isValidValue = (v: any): boolean => {
  if (v === null || v === undefined) return false;
  const s = String(v).trim();
  const lower = s.toLowerCase();
  return (
    s !== "" && 
    lower !== "null" && 
    lower !== "none" && 
    lower !== "undefined" && 
    lower !== "알 수 없음" &&
    lower !== "알수없음" &&
    lower !== "unknown" &&
    lower !== "-"
  );
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

  // Helper to update metadata fields with validation
  const updateMetadataField = (field: string, value: string, subMap?: string) => {
    if (!isValidValue(value)) return;

    if (subMap) {
      const map = (metadata as any)[subMap];
      if (map && (!isValidValue(map[field]) || map[field] === '알 수 없음')) {
        map[field] = value.trim();
      }
    } else {
      const current = (metadata as any)[field];
      if (!isValidValue(current) || current === '알 수 없음') {
        (metadata as any)[field] = value.trim();
      }
    }
  };

  // 주요 식별자 리스트 (전체 라인에서 스캔)
  const USER_KEYS = ['userId', 'userKey', 'userType', 'userEmail', 'companyCode'];
  const CAR_KEYS = ['carName', 'carKey', 'carVin', 'carFuelType', 'carYear'];

  allLines.forEach((line) => {
    if (!line.trim()) return;

    // 1. 섹션 헤더 처리 (우선순위는 낮지만 컨텍스트 파악용)
    const sectionMatch = line.match(SECTION_HEADER);
    if (sectionMatch) {
      currentSection = sectionMatch[1].toUpperCase().replace(/\sINFO/g, '');
      return;
    }

    // 2. 로그 데이터 파싱 (타임스탬프 기반)
    const tsMatch = line.match(REGEX_GUIDE_TIMESTAMP);
    let message = "";
    if (tsMatch) {
      const rawTimestamp = tsMatch[1];
      const timestamp = parseLogDate(rawTimestamp);
      message = tsMatch[2];

      const isBilling = /purchase|signature|receipt|verifyReceipt|available storage|Setting\.xml|userPurchasedProfiles/i.test(message) || fileName.includes('billing');
      const category = isBilling ? LogCategory.BILLING : (message.includes('01 ') ? LogCategory.OBD : LogCategory.INFO);
      
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

      // 라이프사이클 이벤트
      const isScreen = message.includes('Move to screen') || message.includes('setScreen') || message.includes('onStart') || message.includes('onResume');
      const isConnection = message.includes('Bluetooth') || message.includes('connectionSuccess') || message.includes('AT ') || message.includes('ELM');
      if (isScreen || isConnection) {
        lifecycleEvents.push({
          id: lifecycleEvents.length, timestamp, rawTimestamp,
          type: isScreen ? 'SCREEN' : 'CONNECTION',
          message: message.trim(), details: line
        });
      }

      const obdPoint = parseObdLine(line);
      if (obdPoint) obdSeries.push(obdPoint);

      // 로그 메시지 내부에서도 Key-Value 패턴이 있으면 추출 시도 (Rough Scan)
      const innerKv = message.match(/([a-zA-Z0-9_]+)\s*[:=]\s*([^,\s}]+)/);
      if (innerKv) {
        const k = innerKv[1].trim();
        const v = innerKv[2].trim();
        if (USER_KEYS.includes(k)) updateMetadataField(k, v, 'userInfo');
        if (CAR_KEYS.includes(k)) updateMetadataField(k, v, 'carInfo');
      }
    } else {
      message = line;
      if (lastLogEntry) lastLogEntry.message += '\n' + line;
    }

    // 3. Key-Value 파싱 (섹션 헤더 바로 아래 혹은 메시지 내 패턴 모두 대응)
    const kvMatch = line.match(KEY_VALUE_PAIR);
    if (kvMatch) {
      const k = kvMatch[1].trim();
      const v = kvMatch[2].trim();
      
      // 전역 매핑 시도
      if (k === 'model' || k === 'deviceModel') updateMetadataField('model', v);
      if (k === 'carName') updateMetadataField('carName', v);
      if (k === 'userOS' || k === 'osVersion') updateMetadataField('userOS', v);
      if (k === 'version' || k === 'App version' || k === 'appVersion') updateMetadataField('appVersion', v);
      if (k === 'countryCode' || k === 'country') updateMetadataField('countryCode', v);
      if (k === 'protocol' || k === 'AT DPN') updateMetadataField('protocol', v);

      // 유저 정보는 어디서 나오든 캡처
      if (USER_KEYS.includes(k)) {
        updateMetadataField(k, v, 'userInfo');
        if (k === 'userId' || k === 'userKey') updateMetadataField('userId', v);
      }
      
      if (CAR_KEYS.includes(k)) {
        updateMetadataField(k, v, 'carInfo');
      }

      // 현재 섹션 기반 보조 정보
      const subMapName = `${currentSection.toLowerCase()}Info`;
      if ((metadata as any)[subMapName]) {
        updateMetadataField(k, v, subMapName);
      }
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
    fileList: [], obdSeries, metrics: aggregateMetrics(obdSeries),
    tripStats: calculateTripStats(obdSeries)
  };
};
