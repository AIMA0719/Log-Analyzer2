
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

// Added BillingEntry as an extension of LogEntry to resolve import errors
export interface BillingEntry extends LogEntry {}

export interface TripStats {
  totalDistanceKm: number;
  averageSpeedKmh: number;
  maxRpm: number;
  maxSpeedKmh: number;
  idleDurationMs: number;
  durationMs: number;
  hardBrakingCount: number;
  rapidAccelerationCount: number;
  estimatedFuelEconomy?: number; // km/L
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

// Added StorageStatus to resolve import errors in logParser
export interface StorageStatus {
  availableBytes: string;
  settingsSize: string;
  exists: boolean;
  readable: boolean;
  writable: boolean;
}

// Added PurchasedProfile to resolve import errors in logParser and BillingList
export interface PurchasedProfile {
  id: string;
  region: string;
  modelName: string;
  year: string;
  engine: string;
  isMobdPlus: boolean;
  updateTime: string;
}

// Added CsDiagnosisType for unified CS response management
export type CsDiagnosisType = 'GENERAL_CONNECTION' | 'NO_DATA_PROTOCOL' | 'WIFI_CONNECTION' | 'HUD_INTERFERENCE' | 'SUCCESS' | 'NONE';

// Added ConnectionDiagnosis to provide detailed diagnostic info to UI
export interface ConnectionDiagnosis {
  status: string;
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
  billingLogs: BillingEntry[]; // Updated from any[]
  billingFlows: any[];
  purchasedProfiles: PurchasedProfile[]; // Updated from any[]
  orderIds: string[];
  storageInfo: StorageStatus; // Updated from any
  diagnosis: ConnectionDiagnosis; // Updated from any
  fileList: LogFileContext[];
  obdSeries: ObdDataPoint[];
  metrics: Record<string, ObdMetric>;
  tripStats?: TripStats;
}
