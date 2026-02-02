
import { LogEntry, LogCategory, SessionMetadata, ParsedData, LifecycleEvent, BillingEntry, ConnectionDiagnosis, CsDiagnosisType } from '../types';
import { parseObdLine, aggregateMetrics } from './obdParser';

// Regex Patterns
const REGEX_FULL_TIMESTAMP = /^\[(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}[:\.]\d{3})\]\s*(?:\/\/|:|;)?\s*(.*)/;
const REGEX_SHORT_TIMESTAMP = /^\[(\d{2}:\d{2}:\d{2}[:\.]\d{3})\]\s*(?:\/\/|:|;)?\s*(.*)/;
const REGEX_COMPACT = /^\[(\d{14})\]\s*(?::|;)?\s*(.*)/;
const SECTION_HEADER = /^={5}\s(.*?)\s={5}/;
const KEY_VALUE_PAIR = /^([^:]+)\s:\s(.*)/;

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

export const parseLogFile = (content: string, fileName: string, billingContent?: string): ParsedData => {
  const lines = content.split(/\r?\n/);
  const logs: LogEntry[] = [];
  const obdSeries: any[] = [];
  const baseDate = getDateFromFileName(fileName);
  
  const metadata: SessionMetadata = {
    fileName, model: 'Unknown', userOS: 'Unknown', appVersion: 'Unknown', carName: 'Unknown', userId: 'Unknown',
    logCount: 0, startTime: null, endTime: null, userInfo: {}, carInfo: {}, settingInfo: {}, appInfo: {}, extraInfo: {}
  };

  lines.forEach((line, idx) => {
    // Attempt OBD Parse First for data stream
    const obdPoint = parseObdLine(line);
    if (obdPoint) obdSeries.push(obdPoint);

    // Section Header / Metadata Parsing
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

    // Standard Log Entry
    const tsMatch = line.match(REGEX_FULL_TIMESTAMP) || line.match(REGEX_SHORT_TIMESTAMP);
    if (tsMatch) {
      const timestamp = parseLogDate(tsMatch[1], baseDate);
      const message = tsMatch[2];
      logs.push({
        id: idx, timestamp, rawTimestamp: tsMatch[1], message,
        category: determineCategory(message), isError: determineCategory(message) === LogCategory.ERROR,
        originalLine: line
      });
    }
  });

  metadata.logCount = logs.length;
  if (logs.length > 0) {
    metadata.startTime = logs[0].timestamp;
    metadata.endTime = logs[logs.length - 1].timestamp;
  }

  const metrics = aggregateMetrics(obdSeries);
  const diagnosis: ConnectionDiagnosis = { status: 'SUCCESS', summary: '정상', issues: [], csType: 'NONE' };

  return { metadata, logs, lifecycleEvents: [], billingLogs: [], diagnosis, fileList: [], obdSeries, metrics };
};
