
import { LogEntry, LogCategory, SessionMetadata, ParsedData, LifecycleEvent, BillingEntry, ConnectionDiagnosis, CsDiagnosisType } from '../types';

// Regex Patterns
const REGEX_FULL_TIMESTAMP = /^\[(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}[:\.]\d{3})\]\s*(?:\/\/|:|;)?\s*(.*)/;
const REGEX_SHORT_TIMESTAMP = /^\[(\d{2}:\d{2}:\d{2}[:\.]\d{3})\]\s*(?:\/\/|:|;)?\s*(.*)/;
const REGEX_COMPACT = /^\[(\d{14})\]\s*(?::|;)?\s*(.*)/; // For Billing [20241210121212] : Msg
const SECTION_HEADER = /^={5}\s(.*?)\s={5}/;
const KEY_VALUE_PAIR = /^([^:]+)\s:\s(.*)/;

// Extract date from filename (YYYY-MM-DD pattern)
const getDateFromFileName = (fileName: string): Date => {
  try {
    const match = fileName.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
    }
  } catch {
    // ignore
  }
  return new Date(); // Fallback to today
};

// Helper to normalize timestamp string to Date object
const parseLogDate = (timestampStr: string, baseDate: Date): Date => {
  try {
    // Case 1: Full Timestamp "2024-12-10 14:20:30.123" (or :123)
    if (timestampStr.length > 15) {
      const cleanTs = timestampStr.replace(/:(\d{3})$/, '.$1').replace(' ', 'T');
      return new Date(cleanTs);
    }
    
    // Case 2: Short Timestamp "14:20:30.123" (or :123)
    // Combine with baseDate
    const timeParts = timestampStr.split(/[:\.]/); // HH, mm, ss, ms
    if (timeParts.length >= 4) {
      const d = new Date(baseDate);
      d.setHours(parseInt(timeParts[0]));
      d.setMinutes(parseInt(timeParts[1]));
      d.setSeconds(parseInt(timeParts[2]));
      d.setMilliseconds(parseInt(timeParts[3]));
      return d;
    }
    
    return new Date();
  } catch {
    return new Date();
  }
};

const parseBillingDate = (timestampStr: string): Date => {
  try {
     // Check if it is compact YYYYMMDDHHmmss
     if (/^\d{14}$/.test(timestampStr)) {
        const year = parseInt(timestampStr.substring(0, 4));
        const month = parseInt(timestampStr.substring(4, 6)) - 1;
        const day = parseInt(timestampStr.substring(6, 8));
        const hour = parseInt(timestampStr.substring(8, 10));
        const min = parseInt(timestampStr.substring(10, 12));
        const sec = parseInt(timestampStr.substring(12, 14));
        return new Date(year, month, day, hour, min, sec);
     }
     // Fallback to standard parsing
     return parseLogDate(timestampStr, new Date());
  } catch {
    return new Date();
  }
}

const determineCategory = (message: string): LogCategory => {
  const msgUpper = message.toUpperCase();
  
  if (
    msgUpper.includes('FAIL') || 
    msgUpper.includes('UNABLETOCONNECT') || 
    msgUpper.includes('EXCEPTION') || 
    msgUpper.includes('ERROR') ||
    msgUpper.includes('NODATA') ||
    msgUpper.includes('NO DATA') ||
    msgUpper.includes('LV RESET') || // Low Voltage Reset
    msgUpper.includes('BUFFER FULL') ||
    msgUpper.includes('STOPPED') ||
    msgUpper.includes(' 204 ')
  ) {
    return LogCategory.ERROR;
  }

  if (
    msgUpper.includes('7DF') || 
    msgUpper.includes('ATZ') || 
    msgUpper.includes('ATSP') || 
    /^[0-9A-F]{2,}\s?>/.test(message) || 
    msgUpper.includes('PID')
  ) {
    return LogCategory.OBD;
  }

  if (
    msgUpper.includes('CONNECT') || 
    msgUpper.includes('BLE') || 
    msgUpper.includes('SCANNER') || 
    msgUpper.includes('PERIPHERAL') || 
    msgUpper.includes('CHARACTERISTIC') || 
    msgUpper.includes('SCAN RESULT') ||
    msgUpper.includes('OBDBLE')
  ) {
    return LogCategory.BLUETOOTH;
  }

  if (
    msgUpper.includes('SETSCREEN') || 
    msgUpper.includes('MOVE TO') ||
    msgUpper.includes('TOAST') || 
    msgUpper.includes('FRAGMENT') || 
    msgUpper.includes('ACTIVITY') || 
    msgUpper.includes('VIEW') ||
    msgUpper.includes('SCENE')
  ) {
    return LogCategory.UI;
  }

  return LogCategory.INFO;
};

// Check for significant lifecycle events
const identifyLifecycleEvent = (message: string, timestamp: Date, rawTimestamp: string, id: number): LifecycleEvent | null => {
  const msgUpper = message.toUpperCase();
  const msgTrimmed = message.trim();
  
  // 1. Screen Transitions
  if (msgUpper.includes('SETSCREEN')) {
    const screenName = message.replace(/.*setScreen\s+/, '').trim();
    return { id, timestamp, rawTimestamp, type: 'SCREEN', message: `화면 이동: ${screenName}`, details: message };
  }
  
  if (msgUpper.includes('MOVE TO')) {
    let rawName = message;
    const bracketMatch = message.match(/<([^>]+)>/);
    if (bracketMatch) {
        rawName = bracketMatch[1].split(':')[0].trim();
    } else {
        const match = message.match(/move to\s+(.*)/i);
        if (match) {
            rawName = match[1].trim();
        }
    }
    const shortName = rawName.split('.').pop() || rawName;
    const finalName = shortName.replace('ViewController', '').trim();

    return { id, timestamp, rawTimestamp, type: 'SCREEN', message: `화면 이동: ${finalName}`, details: message };
  }

  if (msgUpper.includes('SCENEDIDBECOMEACTIVE')) {
     return { id, timestamp, rawTimestamp, type: 'APP_STATE', message: '앱 활성화 (Active)', details: message };
  }
  if (msgUpper.includes('SCENEDIDENTERBACKGROUND')) {
     return { id, timestamp, rawTimestamp, type: 'APP_STATE', message: '앱 백그라운드 전환', details: message };
  }

  // 2. Connection States
  // Connection Start
  if (msgUpper.includes('CONNECTED STATE : 2') || msgUpper.includes('START SCANNER COMMUNICATION')) {
    return { id, timestamp, rawTimestamp, type: 'CONNECTION', message: '🔗 스캐너 연결 성공', details: message };
  }
  
  // Connection End
  if (msgUpper.includes('SOCKET CLOSED') || msgUpper.includes('CONNECTED_FINISH') || msgUpper.includes('BT SOCKET CLOSED')) {
    return { id, timestamp, rawTimestamp, type: 'CONNECTION', message: '🔌 연결 종료 (Android)', details: message };
  }
  if ((msgUpper.includes('DISCONNECT') || msgUpper.includes('CANCELCONNECTION')) && !msgUpper.includes('RPM')) {
    return { id, timestamp, rawTimestamp, type: 'CONNECTION', message: '🔌 연결 종료 (iOS)', details: message };
  }
  if (msgUpper.includes('UNABLETOCONNECT')) {
    return { id, timestamp, rawTimestamp, type: 'CONNECTION', message: '⚠️ 연결 실패', details: message };
  }
  if (msgUpper.includes('LV RESET')) {
    return { id, timestamp, rawTimestamp, type: 'CONNECTION', message: '⚠️ LV RESET (저전압 재부팅)', details: '차량 전압 부족으로 인한 모듈 리셋 감지' };
  }

  // 3. Protocol & Initialization
  // ATSP: Set Protocol
  if (msgUpper.includes('ATSP')) {
      return { id, timestamp, rawTimestamp, type: 'CONNECTION', message: '📝 프로토콜 설정 (ATSP)', details: message };
  }
  // ATDPN: Describe Protocol Number
  if (msgUpper.includes('ATDPN')) {
      return { id, timestamp, rawTimestamp, type: 'CONNECTION', message: '🔍 프로토콜 조회 (ATDPN)', details: message };
  }

  // Standard OBD Init PID (0100) - Critical for establishing communication
  if ((msgUpper.includes('01 00') || msgUpper.includes('0100')) && !msgUpper.includes('NODATA') && !msgUpper.includes('NO DATA')) {
      // NOTE: 01 0D detection is handled in the main loop to catch the FIRST occurrence only
      return { id, timestamp, rawTimestamp, type: 'CONNECTION', message: 'OBD 초기화 요청 (0100)', details: message };
  }
  
  if (/^OK[\r\n]*$/i.test(msgTrimmed) || /(^|[\s>])OK([\r\n]|$)/.test(message)) {
      return { id, timestamp, rawTimestamp, type: 'CONNECTION', message: '프로토콜 응답: OK', details: message };
  }
  
  if (msgUpper.includes('SEARCHING...') || msgUpper.includes('BUS INIT')) {
    return { id, timestamp, rawTimestamp, type: 'CONNECTION', message: '프로토콜 초기화 중...', details: message };
  }
  
  if (msgUpper.includes('AUTO,') || msgUpper.includes('ISO 15765')) {
     return { id, timestamp, rawTimestamp, type: 'CONNECTION', message: `프로토콜 감지: ${message}`, details: message };
  }

  return null;
};

// --- Connection Diagnosis Logic ---
// Removed 'metadata' parameter if present, and any unused variables to fix TS6133
const analyzeConnection = (logs: LogEntry[]): ConnectionDiagnosis => {
  const issues: string[] = [];
  let status: ConnectionDiagnosis['status'] = 'UNKNOWN';
  let csType: CsDiagnosisType = 'NONE';

  // Check for successful connection
  const connected = logs.some(l => l.message.includes('Connected state : 2') || l.message.includes('start scanner communication'));
  
  // Check for failures
  const busInitErrors = logs.filter(l => l.message.includes('BUSINIT') && l.message.includes('ERROR'));
  const unableToConnect = logs.filter(l => l.message.includes('UNABLETOCONNECT'));
  const canErrors = logs.filter(l => l.message.includes('CANERROR'));
  const lvResetErrors = logs.filter(l => l.message.includes('LV RESET'));

  // CS SCENARIO 3: Wi-Fi Scanner Connection Issue
  const scanAttempted = logs.some(l => {
      const msg = l.message.toUpperCase();
      return msg.includes('START SCAN') || msg.includes('SCAN STARTED') || msg.includes('DISCOVERING');
  });

  const wifiObdDiscovered = logs.some(l => {
      const msg = l.message.toUpperCase();
      const isDiscovery = msg.includes('DISCOVERED') || msg.includes('SCAN RESULT') || msg.includes('PERIPHERAL') || (msg.includes('SCAN') && msg.includes('NAME'));
      const hasWifiName = (msg.includes('WIFI') || msg.includes('WI-FI') || msg.includes('WI FI')) && msg.includes('OBD');
      return isDiscovery && hasWifiName;
  });
  
  const scannerFound = logs.some(l => {
    const msg = l.message.toLowerCase();
    const isDiscovery = 
        msg.includes('discovered') || 
        msg.includes('peripheral') || 
        msg.includes('scan result') || 
        (msg.includes('scan') && msg.includes('name')) || 
        (msg.includes('scan') && msg.includes('address')); 

    const hasTarget = 
        msg.includes('infocar') || 
        msg.includes('obdii') || 
        msg.includes('wifi obd') ||
        msg.includes('obdble'); 
    
    return isDiscovery && hasTarget;
  });

  // CS SCENARIO 4: HUD / Y-Cable Interference
  const hasHudInterference = logs.some((log, index) => {
      const msg = log.message.toUpperCase();
      
      if (msg.includes('ATZ')) {
          const CAN_IDS = ['7E8', '7E9', '7EE'];
          if (CAN_IDS.some(id => msg.includes(id))) return true;
          const nextLog = logs[index + 1];
          if (nextLog) {
              const nextMsg = nextLog.message.toUpperCase();
              if (CAN_IDS.some(id => nextMsg.includes(id))) return true;
          }
      }
      return false;
  });

  // CS SCENARIO 2: NO DATA (Protocol mismatch)
  const noDataLogs = logs.filter(l => {
      const msg = l.message.toUpperCase();
      // Check 0100, 010C, 010D
      const isPid = msg.includes('01 0D') || msg.includes('01 0C') || msg.includes('01 00') || msg.includes('0100');
      // Check both "NODATA" and "NO DATA"
      const isNoData = msg.includes('NODATA') || msg.includes('NO DATA');
      return isPid && isNoData;
  });
  const noDataCount = noDataLogs.length;
  const hasInitNoData = noDataLogs.some(l => l.message.includes('01 00') || l.message.includes('0100'));
  
  // LOGIC TO DETERMINE CS TYPE
  if (hasHudInterference) {
      csType = 'HUD_INTERFERENCE';
      issues.push('ATZ 초기화 명령에 대해 표준(ELM327) 응답 대신 CAN 데이터(7E8/7E9...)가 감지되었습니다. (HUD, Y케이블 간섭 강력 의심)');
  } else if (scanAttempted && wifiObdDiscovered && !connected) {
      csType = 'WIFI_CONNECTION';
      issues.push('스캔 시도 중 "WI FI OBD" 기기가 검색되었으나 연결에 실패했습니다.');
  } else if (hasInitNoData || (connected && noDataCount > 5)) {
      csType = 'NO_DATA_PROTOCOL';
      if (hasInitNoData) {
         issues.push('초기화 명령어(0100)에 대해 NO DATA 응답이 감지되었습니다. 차량과 프로토콜이 호환되지 않아 연결에 실패했습니다.');
      } else {
         issues.push(`주요 PID(RPM, 속도) 요청에 대해 NO DATA 응답이 ${noDataCount}회 발생했습니다. (프로토콜 호환성 문제)`);
      }
  } else if (!connected && (unableToConnect.length > 0 || !scannerFound)) {
      csType = 'GENERAL_CONNECTION';
  } else if (connected) {
      csType = 'SUCCESS';
  }

  if (connected) {
    status = 'SUCCESS';
    
    if (hasInitNoData || noDataCount > 5) {
      status = 'WARNING';
    }
    if (busInitErrors.length > 0) {
      status = 'WARNING';
      issues.push('BUSINIT ERROR 발생: 차량과 통신 초기화 실패. 시동이 켜져 있는지 확인하거나 전압이 부족할 수 있습니다.');
    }
    if (lvResetErrors.length > 0) {
      status = 'WARNING';
      issues.push('LV RESET 발생: 저전압으로 인한 모듈 리셋이 감지되었습니다. 차량 배터리 상태 확인이 필요합니다.');
    }
  } else {
    // Never connected
    if (logs.length > 0) status = 'FAILURE';
    
    if (!scannerFound && !wifiObdDiscovered) { 
      issues.push('인포카 스캐너가 검색되지 않았습니다. (검색된 기기 중 Infocar, OBDII, WIFI OBD, OBDBLE 이름이 없습니다)');
    }

    if (unableToConnect.length > 0) {
      issues.push('UNABLETOCONNECT: 블루투스 연결을 시도했으나 실패했습니다. 다른 기기와 이미 연결되어 있는지 확인하세요.');
    }
    if (busInitErrors.length > 0) {
      issues.push('BUSINIT ERROR: OBD 프로토콜 초기화 실패. 지원하지 않는 프로토콜이거나 시동 OFF 상태입니다.');
    }
    if (canErrors.length > 0) {
      issues.push('CAN ERROR: CAN 통신 오류. 배선 접촉 불량이나 OBD 단자 문제를 의심해볼 수 있습니다.');
    }
    if (lvResetErrors.length > 0) {
        issues.push('LV RESET: 저전압 리셋 발생. 전원 공급이 불안정합니다.');
    }
  }

  // Summary message
  let summary = '로그 데이터가 충분하지 않습니다.';
  if (status === 'SUCCESS') summary = '정상적으로 연결되었습니다.';
  if (status === 'WARNING') summary = '연결은 되었으나 통신 불안정이 감지됩니다.';
  if (status === 'FAILURE') {
    if (!scannerFound && !wifiObdDiscovered) {
        summary = '스캐너가 검색되지 않아 연결을 시도하지 못했습니다.';
    } else {
        summary = '차량 연결에 실패했습니다.';
    }
  }

  return { status, summary, issues, csType };
};

// --- Billing Log Parser ---
export const parseBillingLog = (content: string): BillingEntry[] => {
  const lines = content.split(/\r?\n/);
  const entries: BillingEntry[] = [];
  let id = 0;

  lines.forEach(line => {
    let timestampStr: string | null = null;
    let message: string | null = null;

    // Try multiple formats for billing logs
    // 1. Compact: [20241210121212] : Msg
    const compactMatch = line.match(REGEX_COMPACT);
    
    // 2. Full: [2024-12-10 12:12:12.123]//Msg (Used in user provided example)
    const fullMatch = line.match(REGEX_FULL_TIMESTAMP);

    if (compactMatch) {
        timestampStr = compactMatch[1];
        message = compactMatch[2];
    } else if (fullMatch) {
        timestampStr = fullMatch[1];
        message = fullMatch[2];
    }

    if (timestampStr && message) {
      const logDate = parseBillingDate(timestampStr);
      entries.push({
        id: id++,
        timestamp: logDate,
        rawTimestamp: timestampStr,
        message: message,
        isError: message.toLowerCase().includes('fail') || message.toLowerCase().includes('error') || message.includes('USER_CANCELED') || message.includes('SERVICE_UNAVAILABLE')
      });
    }
  });

  return entries;
};

// --- Main Parser ---
export const parseLogFile = (content: string, fileName: string, billingContent?: string): ParsedData => {
  const lines = content.split(/\r?\n/);
  const logs: LogEntry[] = [];
  const lifecycleEvents: LifecycleEvent[] = [];
  
  // Base date for short timestamps
  const baseDate = getDateFromFileName(fileName);
  
  const isIosFile = fileName.startsWith('log_');
  const detectedOS = isIosFile ? 'iOS (파일명 감지)' : 'Android (파일명 감지)';

  const metadata: SessionMetadata = {
    fileName: fileName,
    model: 'Unknown',
    userOS: detectedOS,
    appVersion: 'Unknown',
    carName: 'Unknown',
    userId: 'Unknown',
    logCount: 0,
    startTime: null,
    endTime: null,
    userInfo: {},
    carInfo: {},
    settingInfo: {},
    appInfo: {},
    extraInfo: {}
  };

  let idCounter = 0;
  let currentSection = 'extraInfo';
  let firstRealDataDetected = false;

  lines.forEach((line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    // 1. Detect Sections
    const sectionMatch = trimmedLine.match(SECTION_HEADER);
    if (sectionMatch) {
      const sectionName = sectionMatch[1].toLowerCase();
      if (sectionName.includes('user')) currentSection = 'userInfo';
      else if (sectionName.includes('car')) currentSection = 'carInfo';
      else if (sectionName.includes('setting')) currentSection = 'settingInfo';
      else if (sectionName.includes('app')) currentSection = 'appInfo';
      else currentSection = 'extraInfo'; // Protocol info goes here
      return;
    }

    // 2. Parse Key-Value Pairs
    const kvMatch = trimmedLine.match(KEY_VALUE_PAIR);
    if (kvMatch && !trimmedLine.startsWith('[')) { 
      const key = kvMatch[1].trim();
      const value = kvMatch[2].trim();
      
      if (key === 'model' || key === 'Device Model') metadata.model = value;
      if (key === 'userOS') metadata.userOS = value;
      if (key === 'appVersion' || key === 'App version') metadata.appVersion = value;
      if (key === 'carName') metadata.carName = value;
      if (key === 'userId') metadata.userId = value;
      if (key.toLowerCase().includes('country')) metadata.countryCode = value;

      if (currentSection === 'userInfo') metadata.userInfo[key] = value;
      else if (currentSection === 'carInfo') metadata.carInfo[key] = value;
      else if (currentSection === 'settingInfo') metadata.settingInfo[key] = value;
      else if (currentSection === 'appInfo') metadata.appInfo[key] = value;
      else metadata.extraInfo[key] = value;
    }

    // 3. Parse Log Entries
    let timestampStr: string | null = null;
    let message: string | null = null;

    const fullMatch = line.match(REGEX_FULL_TIMESTAMP);
    const shortMatch = line.match(REGEX_SHORT_TIMESTAMP);
    const compactMatch = line.match(REGEX_COMPACT);

    if (fullMatch) {
      timestampStr = fullMatch[1];
      message = fullMatch[2];
    } else if (shortMatch) {
      timestampStr = shortMatch[1];
      message = shortMatch[2];
    } else if (compactMatch) {
      // Typically billing logs, but safe to handle
      timestampStr = compactMatch[1];
      message = compactMatch[2];
    }

    if (timestampStr && message) {
      let logDate: Date;
      // Heuristic: if timestampStr is exactly 14 chars digits, use billing date parser
      // Otherwise use log date parser
      if (/^\d{14}$/.test(timestampStr)) {
        logDate = parseBillingDate(timestampStr);
      } else {
        logDate = parseLogDate(timestampStr, baseDate);
      }
      
      const category = determineCategory(message);
      
      logs.push({
        id: idCounter,
        timestamp: logDate,
        rawTimestamp: timestampStr,
        message: message,
        category: category,
        isError: category === LogCategory.ERROR,
        originalLine: line
      });

      // Special Check for First 01 0D Success
      // Logic: 01 0D request AND Valid CAN Response (41 0D or 7E8...) AND NOT Error
      if (!firstRealDataDetected) {
           const msgUpper = message.toUpperCase();
           // Remove spaces for easier checking
           const msgCompact = msgUpper.replace(/\s/g, '');
           
           const isSpeedRequest = msgCompact.includes('010D');
           // Valid responses usually look like "41 0D ..." or "7E8 03 41 0D..."
           // We check for "410D" or header "7E8"
           const isResponse = msgCompact.includes('410D') || msgCompact.includes('7E8');
           const isError = msgUpper.includes('NODATA') || msgUpper.includes('NO DATA') || msgUpper.includes('ERROR');
           
           // Must be a response line, usually indicated by ":"
           if (message.includes(':') && isSpeedRequest && isResponse && !isError) {
               firstRealDataDetected = true;
               lifecycleEvents.push({
                   id: idCounter,
                   timestamp: logDate,
                   rawTimestamp: timestampStr,
                   type: 'CONNECTION',
                   message: '🚀 실시간 데이터 통신 시작 (01 0D 수신)',
                   details: message
               });
           }
      }

      const evt = identifyLifecycleEvent(message, logDate, timestampStr, idCounter);
      if (evt) {
        lifecycleEvents.push(evt);
      }

      idCounter++;
    }
  });

  metadata.logCount = logs.length;
  if (logs.length > 0) {
    metadata.startTime = logs[0].timestamp;
    metadata.endTime = logs[logs.length - 1].timestamp;
  }

  const billingLogs = billingContent ? parseBillingLog(billingContent) : [];
  const diagnosis = analyzeConnection(logs);

  return { metadata, logs, lifecycleEvents, billingLogs, diagnosis, fileList: [] };
};
