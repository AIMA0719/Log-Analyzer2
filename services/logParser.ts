
import { LogEntry, LogCategory, SessionMetadata, ParsedData, LifecycleEvent, BillingEntry, ConnectionDiagnosis, CsDiagnosisType } from '../types';

// Regex Patterns
const REGEX_ANDROID = /^\[(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}:\d{3})\]\/\/(.*)/;
const REGEX_IOS = /^\[(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}:\d{3})\]\s:\s(.*)/;
const REGEX_COMPACT = /^\[(\d{14})\]\s:\s(.*)/; // For Billing
const SECTION_HEADER = /^={5}\s(.*?)\s={5}/;
const KEY_VALUE_PAIR = /^([^:]+)\s:\s(.*)/;

// Helper to normalize timestamp string to ISO format
const parseDateString = (timestamp: string, format: 'standard' | 'compact'): Date => {
  try {
    if (format === 'compact') {
      // YYYYMMDDHHmmss
      const year = parseInt(timestamp.substring(0, 4));
      const month = parseInt(timestamp.substring(4, 6)) - 1;
      const day = parseInt(timestamp.substring(6, 8));
      const hour = parseInt(timestamp.substring(8, 10));
      const min = parseInt(timestamp.substring(10, 12));
      const sec = parseInt(timestamp.substring(12, 14));
      return new Date(year, month, day, hour, min, sec);
    } else {
      // YYYY-MM-DD HH:mm:ss:ms -> YYYY-MM-DDTHH:mm:ss.ms
      // Replace last colon with dot for milliseconds
      const lastColonIndex = timestamp.lastIndexOf(':');
      const cleanTs = timestamp.substring(0, lastColonIndex) + '.' + timestamp.substring(lastColonIndex + 1);
      return new Date(cleanTs.replace(' ', 'T'));
    }
  } catch (e) {
    return new Date();
  }
};

const determineCategory = (message: string): LogCategory => {
  const msgUpper = message.toUpperCase();
  
  if (
    msgUpper.includes('FAIL') || 
    msgUpper.includes('UNABLETOCONNECT') || 
    msgUpper.includes('EXCEPTION') || 
    msgUpper.includes('ERROR') ||
    msgUpper.includes('NODATA') ||
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
  if (msgUpper.includes('CONNECTED STATE : 2') || msgUpper.includes('START SCANNER COMMUNICATION')) {
    return { id, timestamp, rawTimestamp, type: 'CONNECTION', message: '스캐너 연결 성공', details: message };
  }
  if (msgUpper.includes('DISCONNECT') && !msgUpper.includes('RPMDETECT')) {
    return { id, timestamp, rawTimestamp, type: 'CONNECTION', message: '연결 종료/해제', details: message };
  }
  if (msgUpper.includes('UNABLETOCONNECT')) {
    return { id, timestamp, rawTimestamp, type: 'CONNECTION', message: '연결 실패', details: message };
  }

  // 3. Protocol & Initialization (Critical for debugging connection)
  // Check for AT Commands: ATZ, ATSP, ATDP, ATDPN, ATE0, or Response 0100
  // Expanded regex to capture AT commands cleanly
  if (/(^|[\s>])(AT[A-Z0-9]+)([\r\n]|$)/i.test(message)) {
    const cmdMatch = message.match(/(AT[A-Z0-9]+)/i);
    const cmd = cmdMatch ? cmdMatch[1].toUpperCase() : 'AT Command';
    
    // Filter out common noise if needed, but for now capture all AT commands
    // We will filter in the UI
    return { id, timestamp, rawTimestamp, type: 'CONNECTION', message: `프로토콜 요청: ${cmd}`, details: message };
  }
  
  // Check for responses to AT commands (Simple 'OK' or 'ELM327' etc)
  // This is a heuristic: if the message is short and says "OK", it's likely a response
  if (/^OK[\r\n]*$/i.test(msgTrimmed) || /(^|[\s>])OK([\r\n]|$)/.test(message)) {
      return { id, timestamp, rawTimestamp, type: 'CONNECTION', message: '프로토콜 응답: OK', details: message };
  }
  
  // Check for specific OBD initialization responses that indicate protocol negotiation
  if (msgUpper.includes('SEARCHING...') || msgUpper.includes('BUS INIT')) {
    return { id, timestamp, rawTimestamp, type: 'CONNECTION', message: '프로토콜 초기화 중...', details: message };
  }
  
  // Check for Protocol Description response (usually a number or code like 'A6') - hard to detect reliably without context
  // but if we see 'AUTO' or ISO in response
  if (msgUpper.includes('AUTO,') || msgUpper.includes('ISO 15765')) {
     return { id, timestamp, rawTimestamp, type: 'CONNECTION', message: `프로토콜 감지: ${message}`, details: message };
  }

  return null;
};

// --- Connection Diagnosis Logic ---
// Removed unused 'metadata' parameter
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

  // CS SCENARIO 3: Wi-Fi Scanner Connection Issue
  // Detect if user is attempting to scan and WI-FI OBD is actually found
  // Condition 1: Scan was attempted (START SCAN, DISCOVERING, etc)
  const scanAttempted = logs.some(l => {
      const msg = l.message.toUpperCase();
      return msg.includes('START SCAN') || msg.includes('SCAN STARTED') || msg.includes('DISCOVERING');
  });

  // Condition 2: "WI FI OBD" (or similar) was explicitly discovered in the logs
  const wifiObdDiscovered = logs.some(l => {
      const msg = l.message.toUpperCase();
      // Look for discovery context
      const isDiscovery = msg.includes('DISCOVERED') || msg.includes('SCAN RESULT') || msg.includes('PERIPHERAL') || (msg.includes('SCAN') && msg.includes('NAME'));
      // Look for WI-FI related names: "WIFI OBD", "WI FI OBD", "WI-FI OBD"
      // We check if "WIFI" and "OBD" exist in the string to cover spacing variations
      const hasWifiName = (msg.includes('WIFI') || msg.includes('WI-FI') || msg.includes('WI FI')) && msg.includes('OBD');
      return isDiscovery && hasWifiName;
  });
  
  // Check if any target scanner was found in logs (General detection)
  const scannerFound = logs.some(l => {
    const msg = l.message.toLowerCase();
    
    // Check for discovery keywords
    const isDiscovery = 
        msg.includes('discovered') || 
        msg.includes('peripheral') || 
        msg.includes('scan result') || // Matches "SCAN Result"
        (msg.includes('scan') && msg.includes('name')) || 
        (msg.includes('scan') && msg.includes('address')); 

    // Check for target device names
    const hasTarget = 
        msg.includes('infocar') || 
        msg.includes('obdii') || 
        msg.includes('wifi obd') ||
        msg.includes('obdble'); // Added OBDBLE
    
    return isDiscovery && hasTarget;
  });

  // CS SCENARIO 4: HUD / Y-Cable Interference
  // Logic: Look for ATZ commands. 
  // A valid ATZ response is usually "ELM327 v1.5" or "OK".
  // Interference is characterized by the ATZ command returning RAW CAN FRAMES (e.g. 7E8..., 7E9...).
  // We strictly check for the presence of '7E8', '7E9', or '7EE' in the SAME log or the IMMEDIATE NEXT log.
  const hasHudInterference = logs.some((log, index) => {
      const msg = log.message.toUpperCase();
      
      if (msg.includes('ATZ')) {
          const CAN_IDS = ['7E8', '7E9', '7EE'];
          
          // 1. Check SAME LINE (e.g. "7DF, ATZ : 7E8...")
          if (CAN_IDS.some(id => msg.includes(id))) {
              return true;
          }

          // 2. Check IMMEDIATE NEXT LINE only
          // Avoid looking too far ahead to prevent flagging valid responses to subsequent commands.
          const nextLog = logs[index + 1];
          if (nextLog) {
              const nextMsg = nextLog.message.toUpperCase();
              // Ensure the next message actually looks like a CAN ID dump and NOT a new command or valid simple response
              if (CAN_IDS.some(id => nextMsg.includes(id))) {
                  return true;
              }
          }
      }
      return false;
  });

  // CS SCENARIO 2: NO DATA (Protocol mismatch)
  // Check if we have many NO DATA responses to standard PIDs (010C, 010D)
  const noDataCount = logs.filter(l => {
      const msg = l.message.toUpperCase();
      return (msg.includes('01 0D') || msg.includes('01 0C')) && msg.includes('NODATA');
  }).length;
  
  // LOGIC TO DETERMINE CS TYPE
  if (hasHudInterference) {
      csType = 'HUD_INTERFERENCE';
      issues.push('ATZ 초기화 명령에 대해 표준(ELM327) 응답 대신 CAN 데이터(7E8/7E9...)가 감지되었습니다. (HUD, Y케이블 간섭 강력 의심)');
  } else if (scanAttempted && wifiObdDiscovered && !connected) {
      // Modified Logic: Only trigger if Scan was attempted AND Wifi OBD was actually found
      csType = 'WIFI_CONNECTION';
      issues.push('스캔 시도 중 "WI FI OBD" 기기가 검색되었으나 연결에 실패했습니다.');
  } else if (connected && noDataCount > 5) {
      csType = 'NO_DATA_PROTOCOL';
      issues.push(`주요 PID(RPM, 속도) 요청에 대해 NO DATA 응답이 ${noDataCount}회 발생했습니다. (프로토콜 호환성 문제)`);
  } else if (!connected && (unableToConnect.length > 0 || !scannerFound)) {
      csType = 'GENERAL_CONNECTION';
  } else if (connected) {
      csType = 'SUCCESS';
  }

  if (connected) {
    status = 'SUCCESS';
    
    // Post-connection checks
    if (noDataCount > 5) {
      status = 'WARNING';
      // Issue pushed above in CS logic
    }
    if (busInitErrors.length > 0) {
      status = 'WARNING';
      issues.push('BUSINIT ERROR 발생: 차량과 통신 초기화 실패. 시동이 켜져 있는지 확인하거나 전압이 부족할 수 있습니다.');
    }
  } else {
    // Never connected
    if (logs.length > 0) status = 'FAILURE';
    
    // Scanner detection issue
    // For Wifi scenario, we rely on the specific check above
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
    const match = line.match(REGEX_COMPACT);
    if (match) {
      const timestamp = match[1];
      const message = match[2];
      const logDate = parseDateString(timestamp, 'compact');
      
      entries.push({
        id: id++,
        timestamp: logDate,
        rawTimestamp: timestamp,
        message: message,
        isError: message.toLowerCase().includes('fail') || message.toLowerCase().includes('error')
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
      else currentSection = 'extraInfo';
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
      // Extract Country Code
      if (key.toLowerCase().includes('country')) metadata.countryCode = value;

      if (currentSection === 'userInfo') metadata.userInfo[key] = value;
      else if (currentSection === 'carInfo') metadata.carInfo[key] = value;
      else if (currentSection === 'settingInfo') metadata.settingInfo[key] = value;
      else if (currentSection === 'appInfo') metadata.appInfo[key] = value;
      else metadata.extraInfo[key] = value;
    }

    // 3. Parse Log Entries
    let timestamp: string | null = null;
    let message: string | null = null;
    let tsFormat: 'standard' | 'compact' = 'standard';

    const androidMatch = line.match(REGEX_ANDROID);
    const iosMatch = line.match(REGEX_IOS);
    const compactMatch = line.match(REGEX_COMPACT);

    if (androidMatch) {
      timestamp = androidMatch[1];
      message = androidMatch[2];
      tsFormat = 'standard';
    } else if (iosMatch) {
      timestamp = iosMatch[1];
      message = iosMatch[2];
      tsFormat = 'standard';
    } else if (compactMatch) {
      timestamp = compactMatch[1];
      message = compactMatch[2];
      tsFormat = 'compact';
    }

    if (timestamp && message) {
      const category = determineCategory(message);
      const logDate = parseDateString(timestamp, tsFormat);
      
      logs.push({
        id: idCounter,
        timestamp: logDate,
        rawTimestamp: timestamp,
        message: message,
        category: category,
        isError: category === LogCategory.ERROR,
        originalLine: line
      });

      const evt = identifyLifecycleEvent(message, logDate, timestamp, idCounter);
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

  // Parse billing logs if provided
  const billingLogs = billingContent ? parseBillingLog(billingContent) : [];

  // Analyze Connection
  // Updated call to match new signature (metadata removed)
  const diagnosis = analyzeConnection(logs);

  return { metadata, logs, lifecycleEvents, billingLogs, diagnosis, fileList: [] };
};
