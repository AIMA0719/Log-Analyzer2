
export enum LogCategory {
  OBD = 'OBD',
  BLUETOOTH = 'BLUETOOTH',
  ERROR = 'ERROR',
  UI = 'UI',
  INFO = 'INFO',
}

export interface LogEntry {
  id: number;
  timestamp: Date;
  rawTimestamp: string;
  category: LogCategory;
  isError: boolean;
  message: string;
  originalLine: string;
}

export interface ObdDataPoint {
  timestamp: Date;
  timeStr: string;
  unix: number;
  pid: string;
  name: string;
  value: number;
  unit: string;
  delay: number;
  ecuId: string;
}

export interface ObdMetric {
  id: string;
  name: string;
  unit: string;
  currentValue: number;
  history: { t: number; v: number }[];
  isAvailable: boolean;
}

export interface LifecycleEvent {
  id: number;
  timestamp: Date;
  rawTimestamp: string;
  type: 'CONNECTION' | 'SCREEN' | 'APP_STATE';
  message: string;
  details?: string;
}

export interface BillingEntry {
  id: number;
  timestamp: Date;
  rawTimestamp: string;
  os: 'ANDROID' | 'IOS' | 'UNKNOWN';
  status: 'SUCCESS' | 'FAILURE' | 'PENDING' | 'INFO';
  orderId?: string;
  productId?: string;
  productName?: string;
  price?: string;
  message: string;
  rawLog?: string;
}

export type CsDiagnosisType = 'HUD_INTERFERENCE' | 'NO_DATA_PROTOCOL' | 'WIFI_CONNECTION' | 'GENERAL_CONNECTION' | 'SUCCESS' | 'NONE';

export interface ConnectionDiagnosis {
  status: 'SUCCESS' | 'WARNING' | 'FAILURE' | 'UNKNOWN';
  summary: string;
  issues: string[];
  csType: CsDiagnosisType;
}

export interface SessionMetadata {
  fileName: string;
  model: string;
  userOS: string;
  appVersion: string;
  carName: string;
  userId: string;
  logCount: number;
  startTime: Date | null;
  endTime: Date | null;
  countryCode?: string;
  protocol?: string;
  
  userInfo: Record<string, string>;
  carInfo: Record<string, string>;
  settingInfo: Record<string, string>;
  appInfo: Record<string, string>;
  extraInfo: Record<string, string>;
}

export interface LogFileContext {
  fileName: string;
  content: string;
}

export interface ParsedData {
  metadata: SessionMetadata;
  logs: LogEntry[];
  lifecycleEvents: LifecycleEvent[];
  billingLogs: BillingEntry[];
  diagnosis: ConnectionDiagnosis;
  fileList: LogFileContext[];
  obdSeries: ObdDataPoint[];
  metrics: Record<string, ObdMetric>;
}
