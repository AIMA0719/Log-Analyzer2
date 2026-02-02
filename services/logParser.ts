
import { LogEntry, LogCategory, SessionMetadata, ParsedData, ConnectionDiagnosis, BillingEntry, LifecycleEvent } from '../types';
import { parseObdLine, aggregateMetrics } from './obdParser';

// 정규식 패턴
const REGEX_FULL_TIMESTAMP = /^\[(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}[:\.]\d{3})\]\s*(?:\/\/|:|;)?\s*(.*)/;
const REGEX_SHORT_TIMESTAMP = /^\[(\d{2}:\d{2}:\d{2}[:\.]\d{3})\]\s*(?:\/\/|:|;)?\s*(.*)/;
const SECTION_HEADER = /^={3,}\s*(.*?)\s*={3,}/;
const KEY_VALUE_PAIR = /^([^:]+?)\s*:\s*(.*)/;

const getDateFromFileName = (fileName: string): Date => {
  try {
    const match = fileName.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
    }
  } catch {}
  return new Date();
};

const parseLogDate = (timestampStr: string, baseDate: Date): Date => {
  try {
    if (timestampStr.length > 15) {
      const cleanTs = timestampStr.replace(/:(\d{3})$/, '.$1').replace(' ', 'T');
      return new Date(cleanTs);
    }
    const timeParts = timestampStr.split(/[:\.]/);
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

const determineCategory = (message: string): LogCategory => {
  const msgUpper = message.toUpperCase();
  if (msgUpper.includes('FAIL') || msgUpper.includes('ERROR') || msgUpper.includes('EXCEPTION')) return LogCategory.ERROR;
  if (msgUpper.includes('7DF') || msgUpper.includes('7E8') || msgUpper.includes('01 0D') || message.includes('//')) return LogCategory.OBD;
  if (msgUpper.includes('BLE') || msgUpper.includes('CONNECT')) return LogCategory.BLUETOOTH;
  if (msgUpper.includes('SCREEN') || msgUpper.includes('MOVE TO')) return LogCategory.UI;
  return LogCategory.INFO;
};

export const parseLogFile = (content: string, fileName: string, billingContent: string = ''): ParsedData => {
  const lines = content.split(/\r?\n/);
  const logs: LogEntry[] = [];
  const lifecycleEvents: LifecycleEvent[] = [];
  const obdSeries: any[] = [];
  const baseDate = getDateFromFileName(fileName);
  
  const metadata: SessionMetadata = {
    fileName, model: '알 수 없음', userOS: '알 수 없음', appVersion: '알 수 없음', carName: '알 수 없음', userId: '알 수 없음',
    logCount: 0, startTime: null, endTime: null, userInfo: {}, carInfo: {}, settingInfo: {}, appInfo: {}, extraInfo: {}
  };

  let currentSection = 'EXTRA';

  lines.forEach((line, idx) => {
    // 1. 섹션 헤더 감지
    const sectionMatch = line.match(SECTION_HEADER);
    if (sectionMatch) {
      const sectionName = sectionMatch[1].toUpperCase();
      if (sectionName.includes('USER INFO')) currentSection = 'USER';
      else if (sectionName.includes('CAR INFO')) currentSection = 'CAR';
      else if (sectionName.includes('SETTING INFO')) currentSection = 'SETTING';
      else if (sectionName.includes('APP INFO')) currentSection = 'APP';
      else currentSection = 'EXTRA';
      return;
    }

    // 2. 키-값 쌍 파싱 (메타데이터)
    const kvMatch = line.match(KEY_VALUE_PAIR);
    if (kvMatch && !line.trim().startsWith('[')) {
      const k = kvMatch[1].trim();
      const v = kvMatch[2].trim();

      if (k === 'model') metadata.model = v;
      if (k === 'carName') metadata.carName = v;
      if (k === 'AT DPN') metadata.protocol = v;
      if (k === 'userId' || k === 'userKey') metadata.userId = v;
      if (k === 'userOS') metadata.userOS = v;
      if (k === 'App version') metadata.appVersion = v;

      switch (currentSection) {
        case 'USER': metadata.userInfo[k] = v; break;
        case 'CAR': metadata.carInfo[k] = v; break;
        case 'SETTING': metadata.settingInfo[k] = v; break;
        case 'APP': metadata.appInfo[k] = v; break;
        default: metadata.extraInfo[k] = v; break;
      }
      return;
    }

    // 3. OBD 데이터 파싱
    const obdPoint = parseObdLine(line);
    if (obdPoint) obdSeries.push(obdPoint);

    // 4. 로그 항목 파싱
    const tsMatch = line.match(REGEX_FULL_TIMESTAMP) || line.match(REGEX_SHORT_TIMESTAMP);
    if (tsMatch) {
      const timestamp = parseLogDate(tsMatch[1], baseDate);
      const message = tsMatch[2];
      const category = determineCategory(message);
      
      const logEntry: LogEntry = {
        id: idx, timestamp, rawTimestamp: tsMatch[1], message,
        category, isError: category === LogCategory.ERROR,
        originalLine: line
      };
      logs.push(logEntry);

      if (category === LogCategory.BLUETOOTH || message.includes('CONNECT')) {
        lifecycleEvents.push({
          id: idx, timestamp, rawTimestamp: tsMatch[1], type: 'CONNECTION', message
        });
      } else if (category === LogCategory.UI) {
        lifecycleEvents.push({
          id: idx, timestamp, rawTimestamp: tsMatch[1], type: 'SCREEN', message
        });
      }
    }
  });

  metadata.logCount = logs.length;
  if (logs.length > 0) {
    metadata.startTime = logs[0].timestamp;
    metadata.endTime = logs[logs.length - 1].timestamp;
  }

  const metrics = aggregateMetrics(obdSeries);
  
  let diagnosis: ConnectionDiagnosis = { status: 'SUCCESS', summary: '정상', issues: [], csType: 'NONE' };
  if (content.includes('NO DATA') || content.includes('NODATA')) {
    diagnosis = { 
      status: 'FAILURE', 
      summary: '데이터 응답 없음 (NO DATA)', 
      issues: ['ECU에서 데이터를 보내지 않거나 호환되지 않는 프로토콜입니다.'], 
      csType: 'NO_DATA_PROTOCOL' 
    };
  }

  return { metadata, logs, lifecycleEvents, billingLogs: [], diagnosis, fileList: [], obdSeries, metrics };
};
