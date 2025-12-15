
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

export interface LifecycleEvent {
  id: number;
  timestamp: Date;
  rawTimestamp: string;
  type: 'CONNECTION' | 'SCREEN' | 'APP_STATE';
  message: string;
  details?: string;
}

export interface SessionInfoBlock {
  title: string;
  data: Record<string, string>;
}

export interface BillingEntry {
  id: number;
  timestamp: Date;
  rawTimestamp: string;
  message: string;
  isError: boolean;
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
  countryCode?: string; // Added for CS response localization
  
  // Detailed Blocks
  userInfo: Record<string, string>;
  carInfo: Record<string, string>;
  settingInfo: Record<string, string>;
  appInfo: Record<string, string>;
  extraInfo: Record<string, string>;
}

export interface LogFileContext {
  fileName: string;
  content: string;
  date?: Date;
}

export interface ParsedData {
  metadata: SessionMetadata;
  logs: LogEntry[];
  lifecycleEvents: LifecycleEvent[];
  billingLogs: BillingEntry[];
  diagnosis: ConnectionDiagnosis;
  fileList: LogFileContext[]; // List of available files in the ZIP
}