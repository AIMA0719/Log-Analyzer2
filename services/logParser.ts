
import { LogEntry, LogCategory, SessionMetadata, ParsedData, ConnectionDiagnosis, BillingEntry, LifecycleEvent } from '../types';
import { parseObdLine, aggregateMetrics } from './obdParser';

// Regex Patterns
const REGEX_FULL_TIMESTAMP = /^\[(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}[:\.]\d{3})\]\s*(?:\/\/|:|;)?\s*(.*)/;
const REGEX_SHORT_TIMESTAMP = /^\[(\d{2}:\d{2}:\d{2}[:\.]\d{3})\]\s*(?:\/\/|:|;)?\s*(.*)/;
const SECTION_HEADER = /^={5}\s(.*?)\s={5}/;
const KEY_VALUE_PAIR = /^([^:]+)\s : \s(.*)/;

// Billing Patterns
const REGEX_GPA_ORDER = /GPA\.\d{4}-\d{4}-\d{4}-\d{5}/;
const REGEX_IOS_PRODUCT = /Found product:\s*([^,]+),([^,]+),([^,]+),([^,]+)/;
const REGEX_IOS_VERIFY = /\[vertifyReceipt\]\s*(ok:\s*(true|false)|result\s*(success|faill))/i;

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

const parseBillingContent = (content: string, baseDate: Date): BillingEntry[] => {
  if (!content) return [];
  const lines = content.split(/\r?\n/);
  const entries: BillingEntry[] = [];
  
  let currentSessionProducts: any[] = [];

  lines.forEach((line, idx) => {
    const tsMatch = line.match(REGEX_FULL_TIMESTAMP) || line.match(REGEX_SHORT_TIMESTAMP);
    if (!tsMatch) return;

    const timestamp = parseLogDate(tsMatch[1], baseDate);
    const message = tsMatch[2];
    
    // Android Detection
    const gpaMatch = message.match(REGEX_GPA_ORDER);
    if (gpaMatch) {
      entries.push({
        id: idx,
        timestamp,
        rawTimestamp: tsMatch[1],
        os: 'ANDROID',
        status: 'SUCCESS',
        orderId: gpaMatch[0],
        message: 'Google Play 주문 감지',
        rawLog: message
      });
      return;
    }

    // iOS Product Found
    const productMatch = message.match(REGEX_IOS_PRODUCT);
    if (productMatch) {
      currentSessionProducts.push({
        id: productMatch[1].trim(),
        name: productMatch[2].trim(),
        price: `${productMatch[3].trim()} ${productMatch[4].trim()}`
      });
      return;
    }

    // iOS Verify Receipt
    const verifyMatch = message.match(REGEX_IOS_VERIFY);
    if (verifyMatch) {
      const isSuccess = verifyMatch[0].toLowerCase().includes('true') || verifyMatch[0].toLowerCase().includes('success');
      // If we have product info in this block, use the latest one or generic
      entries.push({
        id: idx,
        timestamp,
        rawTimestamp: tsMatch[1],
        os: 'IOS',
        status: isSuccess ? 'SUCCESS' : 'FAILURE',
        productId: currentSessionProducts.length > 0 ? currentSessionProducts[0].id : undefined,
        productName: currentSessionProducts.length > 0 ? currentSessionProducts[0].name : undefined,
        price: currentSessionProducts.length > 0 ? currentSessionProducts[0].price : undefined,
        message: isSuccess ? '영수증 검증 성공' : '영수증 검증 실패',
        rawLog: message
      });
      // Clear session after verification
      currentSessionProducts = [];
      return;
    }

    // Section Reset
    if (line.includes('Purchase Log Started')) {
      currentSessionProducts = [];
    }
  });

  return entries;
};

export const parseLogFile = (content: string, fileName: string, billingContent: string = ''): ParsedData => {
  const lines = content.split(/\r?\n/);
  const logs: LogEntry[] = [];
  const lifecycleEvents: LifecycleEvent[] = [];
  const obdSeries: any[] = [];
  const baseDate = getDateFromFileName(fileName);
  
  const metadata: SessionMetadata = {
    fileName, model: 'Unknown', userOS: 'Unknown', appVersion: 'Unknown', carName: 'Unknown', userId: 'Unknown',
    logCount: 0, startTime: null, endTime: null, userInfo: {}, carInfo: {}, settingInfo: {}, appInfo: {}, extraInfo: {}
  };

  lines.forEach((line, idx) => {
    const obdPoint = parseObdLine(line);
    if (obdPoint) obdSeries.push(obdPoint);

    const sectionMatch = line.match(SECTION_HEADER);
    if (sectionMatch) return;

    const kvMatch = line.match(KEY_VALUE_PAIR);
    if (kvMatch && !line.startsWith('[')) {
      const k = kvMatch[1].trim(), v = kvMatch[2].trim();
      if (k === 'model') metadata.model = v;
      if (k === 'carName') metadata.carName = v;
      if (k === 'AT DPN') metadata.protocol = v;
      metadata.extraInfo[k] = v;
      return;
    }

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

  const billingLogs = parseBillingContent(billingContent, baseDate);
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

  return { metadata, logs, lifecycleEvents, billingLogs, diagnosis, fileList: [], obdSeries, metrics };
};
