
import React from 'react';
import { SessionMetadata } from '../types';
import { User, Car, Settings, Smartphone, Database } from 'lucide-react';

interface SessionInfoProps {
  metadata: SessionMetadata;
}

// Key Translation Mapping
const KEY_TRANSLATIONS: Record<string, string> = {
  // User Info
  userInfo: '유저 정보 목록 (User Info List)',
  userKey: '유저 고유 키 (User Key)',
  userEmail: '이메일 (User Email)',
  userSignType: '가입 유형 (Sign Type)',
  userId: '유저 ID (User ID)',
  userOS: '운영체제 (OS)',
  'Device Model': '기기 모델 (Device Model)',
  
  // Car Info
  carKey: '차량 고유 키 (Car Key)',
  carID: '차량 ID (Car ID)',
  carName: '차량 이름 (Car Name)',
  carVin: '차대 번호 (VIN)',
  carYear: '차량 연식 (Car Year)',
  carCC: '배기량 (Car CC)',
  carFuelType: '연료 타입 (Fuel Type)',
  carISG: 'ISG 유무 (Idle Stop & Go)',
  carMakerCode: '제조사 코드 (Maker Code)',
  carModelCode: '모델 코드 (Model Code)',

  // Settings
  autoDrivingFinish: '자동 주행 종료 (Auto Driving Finish)',
  fuelEfficientUnitsCheck: '연비 단위 설정 (Fuel Unit)',
  hudSpeedLimit: 'HUD 속도 제한 (HUD Speed Limit)',
  isDisableAlarmSound: '알림음 비활성화 (Disable Alarm)',
  oilPrice: '유가 정보 (Oil Price)',
  gasolinePrice: '휘발유 가격 (Gasoline Price)',
  dieselPrice: '경유 가격 (Diesel Price)',
  lpgPrice: 'LPG 가격 (LPG Price)',
  ethanolPrice: '에탄올 가격 (Ethanol Price)',
  electricPrice: '전기료 (Electric Price)',
  setCurrency: '통화 설정 (Currency)',
  setCurrencyCheck: '통화 체크 (Currency Check)',
  setTemperatureUnitsCheck: '온도 단위 (Temp Unit)',
  setTimeUnitsCheck: '시간 단위 (Time Unit)',
  setPressureUnitsCheck: '압력 단위 (Pressure Unit)',
  setTorqueUnitsCheck: '토크 단위 (Torque Unit)',
  setConnectProtocolSetting: 'OBD 프로토콜 (Protocol)',
  setResponseTimeOutSetting: '응답 타임아웃 (Timeout)',
  setReConnectCount: '재연결 시도 횟수 (Reconnect Count)',
  isFeulCorrectionActive: '연비 보정 활성화 (Fuel Correction)',
  feulCalcType: '연비 계산 방식 (Fuel Calc Type)',
  totalDistanceValue: '총 주행 거리 (Total Distance)',
  backgroundScannerConnect: '백그라운드 연결 (Background Connect)',
  drivingStartFinishNotification: '주행 시작/종료 알림 (Driving Notification)',
  adConsentStatus: '광고 동의 여부 (Ad Consent)',
  isIgnoringBatteryOptimizations: '배터리 최적화 제외 여부 (Ignore Battery Opt)',
  ACCESS_BACKGROUND_LOCATION: '백그라운드 위치 권한 (Background Loc)',
  ACCESS_FINE_LOCATION: '정밀 위치 권한 (Fine Loc)',
  BLUETOOTH_CONNECT: '블루투스 권한 (Bluetooth)',
  
  // App Info
  'App version': '앱 버전 (App Version)',
  
  // Protocol Info (Extra)
  'AT DPN': '현재 프로토콜 (AT DPN)',
  'User Setting Protocol': '사용자 설정 프로토콜',
  'User Setting Timeout': '타임아웃 설정 (Timeout)',
  'Adaptive Timing': '적응형 타이밍 (Adaptive Timing)',
  'MultiFrame Safe Mode': '멀티프레임 안전 모드',
  'Response Filter Optimized': '응답 필터 최적화',
  'Fast Supported Pid Scan': '빠른 PID 스캔',
  'Comm. Open': '통신 오픈 여부 (Comm Open)'
};

const formatKey = (key: string): string => {
  if (KEY_TRANSLATIONS[key]) {
    return KEY_TRANSLATIONS[key];
  }
  
  // Fallback: CamelCase to Space (e.g., simpleCorrectFuelValue -> Simple Correct Fuel Value)
  return key
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
    .trim() + ` (${key})`;
};

const InfoBlock: React.FC<{ title: string; icon: React.ReactNode; data: Record<string, string> }> = ({ title, icon, data }) => {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-4">
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center gap-2">
        {icon}
        <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {entries.map(([key, value]) => (
          <div key={key} className="flex flex-col border-b border-slate-100 pb-2 last:border-0 last:pb-0">
            <span className="text-xs text-slate-500 font-medium mb-1">{formatKey(key)}</span>
            <span className="text-sm text-slate-800 break-words font-bold">{value || '-'}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SessionInfo: React.FC<SessionInfoProps> = ({ metadata }) => {
  return (
    <div className="space-y-4">
      <InfoBlock 
        title="사용자 정보 (User Info)" 
        icon={<User className="w-4 h-4 text-blue-600" />} 
        data={metadata.userInfo} 
      />
      
      <InfoBlock 
        title="차량 정보 (Car Info)" 
        icon={<Car className="w-4 h-4 text-emerald-600" />} 
        data={metadata.carInfo} 
      />
      
      <InfoBlock 
        title="앱 설정 (Settings)" 
        icon={<Settings className="w-4 h-4 text-slate-600" />} 
        data={metadata.settingInfo} 
      />

      <InfoBlock 
        title="앱 정보 (App Info)" 
        icon={<Smartphone className="w-4 h-4 text-purple-600" />} 
        data={metadata.appInfo} 
      />

       <InfoBlock 
        title="프로토콜 및 기타 정보 (Protocol & Extra)" 
        icon={<Database className="w-4 h-4 text-slate-400" />} 
        data={metadata.extraInfo} 
      />
    </div>
  );
};
