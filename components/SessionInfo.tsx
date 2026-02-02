
import React, { useState } from 'react';
import { SessionMetadata } from '../types';
import { User, Car, Settings, Smartphone, Database, Copy, Check, Fingerprint, Shield } from 'lucide-react';

interface SessionInfoProps {
  metadata: SessionMetadata;
}

const KEY_TRANSLATIONS: Record<string, string> = {
  // 사용자 정보
  userKey: '사용자 고유 키',
  userEmail: '이메일 주소',
  userSignType: '로그인 유형',
  userId: '사용자 ID',
  userOS: '운영체제',
  'Device Model': '기기 모델명',
  countryCode: '국가 코드',
  
  // 차량 정보
  carKey: '차량 고유 키',
  carID: '차량 ID',
  carName: '차량명',
  carVin: '차대 번호 (VIN)',
  carYear: '차량 연식',
  carCC: '배기량',
  carFuelType: '연료 타입',
  carISG: 'ISG 유무',
  carMakerCode: '제조사 코드',
  carModelCode: '모델 코드',

  // 설정
  autoDrivingFinish: '자동 주행 종료 설정',
  fuelEfficientUnitsCheck: '연비 단위 설정',
  hudSpeedLimit: 'HUD 속도 제한',
  isDisableAlarmSound: '알림음 비활성화',
  oilPrice: '유가 정보',
  gasolinePrice: '휘발유 가격',
  dieselPrice: '경유 가격',
  lpgPrice: 'LPG 가격',
  ethanolPrice: '에탄올 가격',
  electricPrice: '전기료',
  setCurrency: '통화 설정',
  setTemperatureUnitsCheck: '온도 단위',
  setTimeUnitsCheck: '시간 단위',
  setPressureUnitsCheck: '압력 단위',
  setTorqueUnitsCheck: '토크 단위',
  setConnectProtocolSetting: 'OBD 프로토콜',
  setResponseTimeOutSetting: '응답 대기시간',
  setReConnectCount: '재연결 횟수',
  isFeulCorrectionActive: '연비 보정 사용',
  feulCalcType: '연비 계산 방식',
  totalDistanceValue: '누적 주행 거리',
  backgroundScannerConnect: '백그라운드 연결',
  drivingStartFinishNotification: '주행 알림 설정',
  adConsentStatus: '광고 동의 여부',
  isIgnoringBatteryOptimizations: '배터리 최적화 예외',
  ACCESS_BACKGROUND_LOCATION: '백그라운드 위치 권한',
  ACCESS_FINE_LOCATION: '정밀 위치 권한',
  BLUETOOTH_CONNECT: '블루투스 연결 권한',
  
  // 앱 정보
  'App version': '앱 버전',
  
  // 프로토콜 정보
  'AT DPN': '현재 프로토콜',
  'User Setting Protocol': '수동 설정 프로토콜',
  'User Setting Timeout': '타임아웃 설정',
  'Adaptive Timing': '적응형 타이밍',
  'MultiFrame Safe Mode': '멀티프레임 안전 모드',
  'Response Filter Optimized': '응답 필터 최적화',
  'Fast Supported Pid Scan': '빠른 PID 스캔',
  'Comm. Open': '통신 채널 상태'
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

const InfoBlock: React.FC<{ title: string; icon: React.ReactNode; data: Record<string, string>; colorClass: string }> = ({ title, icon, data, colorClass }) => {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
      <div className={`px-5 py-3 border-b border-slate-100 flex items-center justify-between ${colorClass}`}>
        <div className="flex items-center gap-2 font-bold text-sm">
          {icon}
          <h3>{title}</h3>
        </div>
        <span className="text-[10px] bg-white/50 px-2 py-0.5 rounded-full font-bold">{entries.length}개 항목</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 p-5">
        {entries.map(([key, value]) => (
          <div key={key} className="flex flex-col group border-b border-slate-50 pb-2 last:border-0 last:pb-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase">{formatKey(key)}</span>
              <CopyButton text={value} />
            </div>
            <span className="text-sm text-slate-700 font-semibold truncate" title={value}>{value || '-'}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SessionInfo: React.FC<SessionInfoProps> = ({ metadata }) => {
  // 주요 식별자만 따로 추출
  const identifiers = {
    '사용자 키(userKey)': metadata.userId,
    '차량 키(carKey)': metadata.carInfo['carKey'] || '-',
    '앱 버전': metadata.appVersion,
    '기기 OS': metadata.userOS,
    '프로토콜': metadata.protocol || '-'
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* 1. 주요 식별자 섹션 (High Priority) */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row gap-6 items-center">
        <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
          <Fingerprint className="w-10 h-10" />
        </div>
        <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-4 w-full">
          {Object.entries(identifiers).map(([label, value]) => (
            <div key={label} className="flex flex-col">
              <span className="text-[10px] font-bold opacity-60 uppercase mb-1">{label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black truncate max-w-[120px]">{value}</span>
                <button onClick={() => navigator.clipboard.writeText(value)} className="hover:scale-110 transition-transform opacity-60 hover:opacity-100">
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="shrink-0 bg-yellow-400 text-indigo-900 px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2">
          <Shield className="w-4 h-4" /> 주요 식별 데이터
        </div>
      </div>

      {/* 2. 상세 정보 블록들 */}
      <InfoBlock 
        title="사용자 정보" 
        icon={<User className="w-4 h-4" />} 
        data={metadata.userInfo} 
        colorClass="bg-blue-50 text-blue-700"
      />
      
      <InfoBlock 
        title="차량 상세 정보" 
        icon={<Car className="w-4 h-4" />} 
        data={metadata.carInfo} 
        colorClass="bg-emerald-50 text-emerald-700"
      />
      
      <InfoBlock 
        title="환경 설정 및 권한" 
        icon={<Settings className="w-4 h-4" />} 
        data={metadata.settingInfo} 
        colorClass="bg-orange-50 text-orange-700"
      />

      <InfoBlock 
        title="통신 및 시스템 정보" 
        icon={<Database className="w-4 h-4" />} 
        data={metadata.extraInfo} 
        colorClass="bg-slate-100 text-slate-700"
      />
    </div>
  );
};
