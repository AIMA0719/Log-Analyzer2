
import React, { useState, useMemo } from 'react';
import { SessionMetadata } from '../types';
import { 
  User, Car, Settings, Smartphone, Database, Copy, Check, 
  Fingerprint, Shield, Radio, ShieldAlert, ShieldCheck, 
  Search, Info, Terminal, Timer, Gauge
} from 'lucide-react';

interface SessionInfoProps {
  metadata: SessionMetadata;
}

const KEY_TRANSLATIONS: Record<string, string> = {
  // Device Info
  manufacturer: '제조사',
  model: '기기 모델명',
  userOS: '운영체제',
  country: '국가 코드',
  
  // Protocol Info
  'AT DPN': '현재 프로토콜',
  'User Setting Protocol': '수동 설정 프로토콜',
  'User Setting Timeout': '타임아웃 설정 (ATST)',
  'Adaptive Timing': '적응형 타이밍',
  'MultiFrame Safe Mode': '멀티프레임 안전 모드',
  'Response Filter Optimized': '응답 필터 최적화',
  'Fast Supported Pid Scan': '빠른 PID 스캔',
  'Comm. Open': '통신 채널 상태',

  // User Info
  companyCode: '회사 코드/명',
  userKey: '사용자 고유 키',
  version: '앱 버전',
  userType: '사용자 유형',
  userId: '사용자 ID',
  userEmail: '이메일 주소',
  settingGps: 'GPS 설정',
  
  // Car Info
  carKey: '차량 고유 키',
  carName: '차량명',
  carVin: '차대 번호 (VIN)',
  carYear: '차량 연식',
  carCC: '배기량',
  carFuelType: '연료 타입',
  carISG: 'ISG 유무',
  carMakerCode: '제조사 코드',
  carModelCode: '모델 코드',
  FuelEffciency: '기준 연비',
  currentFuelEffciencyType: '연비 계산 방식',
  SimpleFuelEffciency: '간편 연비 보정값',
  OilingFuelEffciency: '주유 보정값',

  // Settings
  connectType: '연결 방식 (BT/WiFi)',
  autoDrivingStart: '자동 주행 시작',
  autoDrivingFinish: '자동 주행 종료',
  gpsAccuracy: 'GPS 정확도',
  fuelEfficientUnitsCheck: '연비 단위',
  hudSpeedLimit: 'HUD 속도 제한',
  gasolinePrice: '휘발유 가격',
  dieselPrice: '경유 가격',
  lpgPrice: 'LPG 가격',
  isIgnoringBatteryOptimizations: '배터리 최적화 예외',
  ACCESS_FINE_LOCATION: '정밀 위치 권한',
  ACCESS_COARSE_LOCATION: '대략적 위치 권한',
  ACCESS_BACKGROUND_LOCATION: '백그라운드 위치 권한',
  BLUETOOTH_CONNECT: '블루투스 연결 권한',
  BLUETOOTH_SCAN: '블루투스 스캔 권한',
  RECORD_AUDIO: '마이크 권한',
  CAMERA: '카메라 권한',
  WRITE_EXTERNAL_STORAGE: '저장소 쓰기 권한'
};

const AT_TIMEOUT_MAP: Record<string, string> = {
  'ATST08': '32ms',
  'ATST16': '88ms',
  'ATST32': '200ms',
  'ATST48': '288ms',
  'ATST64': '400ms',
  'ATST96': '600ms',
  'ATSTFF': '1020ms'
};

const formatKey = (key: string): string => {
  return KEY_TRANSLATIONS[key] || key;
};

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-400 hover:text-indigo-600">
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
    </button>
  );
};

const StatusBadge: React.FC<{ value: string; isPermission: boolean }> = ({ value, isPermission }) => {
  // Fix for line 131: Property 'toLowerCase' does not exist on type 'unknown'.
  // Using String(value) to ensure the compiler treats it as a string.
  const normalized = String(value).toLowerCase().trim();
  const isPositive = normalized === 'true' || normalized === 'enabled' || normalized === 'active';
  const isNegative = normalized === 'false' || normalized === 'disabled' || normalized === 'none';

  if (!isPermission && !isPositive && !isNegative) return null;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter ${
      isPositive ? 'bg-emerald-100 text-emerald-700' : isNegative ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
    }`}>
      {isPositive ? <ShieldCheck className="w-3 h-3" /> : isNegative ? <ShieldAlert className="w-3 h-3" /> : null}
      {value}
    </span>
  );
};

const InfoBlock: React.FC<{ 
  title: string; 
  icon: React.ReactNode; 
  data: Record<string, string>; 
  colorClass: string;
  filter?: string;
}> = ({ title, icon, data, colorClass, filter }) => {
  const entries = Object.entries(data).filter(([k, v]) => {
    if (!filter) return true;
    const search = filter.toLowerCase();
    const valueStr = String(v);
    return k.toLowerCase().includes(search) || valueStr.toLowerCase().includes(search) || formatKey(k).toLowerCase().includes(search);
  });

  if (entries.length === 0 && !filter) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md flex flex-col">
      <div className={`px-5 py-3 border-b border-slate-100 flex items-center justify-between ${colorClass}`}>
        <div className="flex items-center gap-2 font-bold text-sm">
          {icon}
          <h3>{title}</h3>
        </div>
        <span className="text-[10px] bg-white/50 px-2 py-0.5 rounded-full font-bold">{entries.length}개 항목</span>
      </div>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 p-5">
        {entries.map(([key, value]) => {
          const isPermission = key.startsWith('ACCESS_') || key.includes('BLUETOOTH_') || key.includes('Permission');
          // Fix for line 148: Type 'unknown' cannot be used as an index type.
          // Explicitly casting value to string for indexing AT_TIMEOUT_MAP.
          const timeoutDesc = key === 'User Setting Timeout' ? AT_TIMEOUT_MAP[value as string] : null;

          return (
            <div key={key} className="flex flex-col group border-b border-slate-50 pb-2 last:border-0 last:pb-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{formatKey(key)}</span>
                <div className="flex items-center gap-1">
                  <StatusBadge value={value as string} isPermission={isPermission} />
                  <CopyButton text={value as string} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-700 font-mono font-bold truncate flex-1" title={value as string}>
                  {(value as string) || '-'}
                </span>
                {timeoutDesc && (
                  <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Timer className="w-3 h-3" /> {timeoutDesc}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {entries.length === 0 && filter && (
          <div className="col-span-full py-4 text-center text-slate-400 text-xs italic">
            검색 결과가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export const SessionInfo: React.FC<SessionInfoProps> = ({ metadata }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const identifiers = {
    '유저 키': metadata.userId,
    '모델': metadata.deviceInfo['model'] || metadata.model,
    '버전': metadata.appVersion,
    '프로토콜': metadata.protocol || '-',
    '국가': metadata.countryCode || '-'
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <Fingerprint className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-slate-900 leading-tight">세션 상세 기술 리포트</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Session Technical Metadata Inspector</p>
          </div>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="메타데이터 필드 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* 2. Key Identifiers */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(identifiers).map(([label, value]) => (
          <div key={label} className="bg-slate-900 p-4 rounded-2xl text-white shadow-lg flex flex-col justify-center">
            <span className="text-[10px] font-bold opacity-50 uppercase mb-1 tracking-wider">{label}</span>
            <div className="flex items-center justify-between">
              <span className="text-sm font-black truncate">{value}</span>
              <button onClick={() => navigator.clipboard.writeText(value)} className="hover:scale-110 transition-transform opacity-40 hover:opacity-100">
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Categorized Blocks */}
      <div className="grid grid-cols-1 gap-6">
        <InfoBlock 
          title="기기 정보 (Device Info)" 
          icon={<Smartphone className="w-4 h-4" />} 
          data={metadata.deviceInfo} 
          colorClass="bg-blue-50 text-blue-700"
          filter={searchTerm}
        />

        <InfoBlock 
          title="프로토콜 설정 (Protocol Info)" 
          icon={<Radio className="w-4 h-4" />} 
          data={metadata.protocolInfo} 
          colorClass="bg-orange-50 text-orange-700"
          filter={searchTerm}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InfoBlock 
            title="사용자 프로필 (User Info)" 
            icon={<User className="w-4 h-4" />} 
            data={metadata.userInfo} 
            colorClass="bg-slate-100 text-slate-700"
            filter={searchTerm}
          />
          <InfoBlock 
            title="스캐너 장치 (OBD2 Info)" 
            icon={<Terminal className="w-4 h-4" />} 
            data={metadata.obd2Info} 
            colorClass="bg-indigo-50 text-indigo-700"
            filter={searchTerm}
          />
        </div>

        <InfoBlock 
          title="차량 및 연비 설정 (Car Info)" 
          icon={<Car className="w-4 h-4" />} 
          data={metadata.carInfo} 
          colorClass="bg-emerald-50 text-emerald-700"
          filter={searchTerm}
        />

        <InfoBlock 
          title="환경 설정 및 시스템 권한 (Setting Info)" 
          icon={<Settings className="w-4 h-4" />} 
          data={metadata.settingInfo} 
          colorClass="bg-purple-50 text-purple-700"
          filter={searchTerm}
        />
      </div>

      {/* 4. Help Footer */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl flex gap-3 items-start">
        <Info className="w-5 h-5 text-indigo-500 shrink-0" />
        <div className="text-[11px] text-slate-500 leading-relaxed">
          <p className="font-bold text-slate-700 mb-1">인포카 로그 기술 정보 안내</p>
          <p>
            위 정보는 앱 실행 시 기록된 환경 변수들입니다. 
            <span className="font-bold text-indigo-600 mx-1">Adaptive Timing</span> 및 <span className="font-bold text-indigo-600 mx-1">User Setting Timeout</span>은 통신 안정성에 직접적인 영향을 미치는 주요 파라미터입니다. 
            권한 필드의 상태가 <span className="text-red-500 font-bold">false</span>인 경우 해당 기능(GPS, 블루투스 등)이 정상 작동하지 않을 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
};
