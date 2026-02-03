
export enum LogCategory {
  OBD = 'OBD',
  BLUETOOTH = 'BLUETOOTH',
  ERROR = 'ERROR',
  UI = 'UI',
  INFO = 'INFO',
  BILLING = 'BILLING',
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

export interface StorageStatus {
  availableBytes: string;
  settingsSize: string;
  exists: boolean;
  readable: boolean;
  writable: boolean;
}

export interface PurchasedProfile {
  id: string;
  region: string;
  modelName: string;
  year: string;
  engine: string;
  isMobdPlus: boolean;
  updateTime: string;
}

export interface BillingEntry {
  id: number;
  timestamp: Date;
  rawTimestamp: string;
  type: 'PURCHASE' | 'SIGNATURE' | 'RECEIPT' | 'VERIFY_REQ' | 'RESTORE' | 'STORAGE' | 'EXPIRY' | 'INFO';
  status: 'SUCCESS' | 'FAILURE' | 'PENDING' | 'INFO';
  message: string;
  jsonData?: string;
  rawLog: string;
}

export interface BillingFlow {
  id: string;
  startTime: Date;
  lastUpdateTime: Date;
  steps: BillingEntry[];
  finalStatus: 'SUCCESS' | 'FAILURE' | 'PENDING';
  hasPurchase: boolean;
  hasSignature: boolean;
  hasReceipt: boolean;
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
  
  deviceInfo: Record<string, string>;
  protocolInfo: Record<string, string>;
  obd2Info: Record<string, string>;
  userInfo: Record<string, string>;
  carInfo: Record<string, string>;
  settingInfo: Record<string, string>;
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
  billingFlows: BillingFlow[];
  purchasedProfiles: PurchasedProfile[];
  orderIds: string[];
  storageInfo: StorageStatus;
  diagnosis: ConnectionDiagnosis;
  fileList: LogFileContext[];
  obdSeries: ObdDataPoint[];
  metrics: Record<string, ObdMetric>;
}
