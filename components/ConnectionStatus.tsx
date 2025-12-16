import React, { useState, useMemo, useEffect } from 'react';
import { ConnectionDiagnosis, SessionMetadata, CsDiagnosisType, ParsedData } from '../types';
import { Stethoscope, MessageSquare, Copy, Check, Globe, Sparkles, RefreshCw, AlertTriangle, Edit3, Key, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { generateAiDiagnosis, AiAnalysisResult } from '../services/aiAnalyzer';

interface ConnectionStatusProps {
  diagnosis: ConnectionDiagnosis;
  metadata: SessionMetadata;
  // We need the full data for AI analysis
  fullData?: ParsedData; 
}

type LanguageCode = 
  | 'KO' | 'EN' | 'JA' | 'ZH-CN' | 'ZH-TW' | 'FR' | 'DE' | 'HI' | 'ID' 
  | 'IT' | 'MS' | 'FA' | 'PL' | 'PT' | 'RU' | 'ES' | 'TH' | 'TR' | 'UK' | 'VI' | 'AR';

const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  'KO': '한국어 (Korean)',
  'EN': 'English',
  'JA': '日本語 (Japanese)',
  'ZH-CN': '简体中文 (Chinese Simplified)',
  'ZH-TW': '繁體中文 (Chinese Traditional)',
  'FR': 'Français (French)',
  'DE': 'Deutsch (German)',
  'HI': 'हिन्दी (Hindi)',
  'ID': 'Bahasa Indonesia',
  'IT': 'Italiano (Italian)',
  'MS': 'Bahasa Melayu (Malay)',
  'FA': 'فارسی (Persian)',
  'PL': 'Polski (Polish)',
  'PT': 'Português (Portuguese)',
  'RU': 'Русский (Russian)',
  'ES': 'Español (Spanish)',
  'TH': 'ไทย (Thai)',
  'TR': 'Türkçe (Turkish)',
  'UK': 'Українська (Ukrainian)',
  'VI': 'Tiếng Việt (Vietnamese)',
  'AR': 'العربية (Arabic)',
};

// Unified Template Dictionary
const CS_TEMPLATES: Record<LanguageCode, Record<CsDiagnosisType, string>> = {
  // 1. 한국어 (Korean)
  'KO': {
    'GENERAL_CONNECTION': `안녕하십니까 인포카입니다.
이용에 불편함을 드려 죄송의 말씀 드립니다.
\n
고객님께서 프로토콜로 인한 연결 관련 어려움을 겪으신 것으로 보입니다.
네트워크가 원활한 상태에서 설정 -> 스캐너 연결 -> 상단의 "연결 문제 확인하기" 탭을 누르신 뒤 해당 내용 확인 부탁 드립니다.

또한 
1. 앱 내 [설정] -> [프로토콜&데이터] 기능을 통해 [응답 대기시간] 및 [재연결 횟수] 늘리기.
2. [프로토콜 종류]에서 프로토콜을 순차적으로 바꾸면서 데이터가 정상적으로 표시되어지는지 확인 부탁 드립니다. (먼저 6번 시도 부탁 드립니다.)

추가적으로 다른 궁금하신 사항이 있으시다면 앱 메인 페이지에서 "사용 가이드" 확인 부탁 드립니다.
\n
감사합니다.`,
    'NO_DATA_PROTOCOL': `안녕하십니까 인포카입니다.
이용에 불편함을 드려 죄송의 말씀 드립니다.
\n
고객님께서 호환되는 프로토콜과 연결이 되지 않아 초기 통신(0100) 또는 데이터 요청 시 "NO DATA" 가 응답 되며, 이로 인한 연결 실패가 발생한 것으로 보입니다.

아래 사항 참고 부탁 드립니다.
1. 앱 내 [설정] -> [프로토콜&데이터] 기능을 통해 [응답 대기시간] 및 [재연결 횟수] 늘리기.
2. [프로토콜 종류]에서 프로토콜을 순차적으로 바꾸면서 데이터가 정상적으로 표시되어지는지 확인 부탁 드립니다. (먼저 6번 시도 부탁 드립니다.)

그럼에도 데이터가 정상적으로 나오지 않는다면 고객님의 차량과 호환이 되지 않아 데이터가 나오지 않는것으로 판단됩니다.

추가적으로 다른 궁금하신 사항이 있으시다면 앱 메인 페이지에서 "사용 가이드" 확인 부탁 드립니다.
\n
감사합니다.`,
    'WIFI_CONNECTION': `안녕하세요 인포카입니다.
Wi-Fi 모듈 스캐너 연결에 어려움을 겪으신 것으로 보입니다.
이용에 불편함을 드려 죄송의 말씀 드립니다.
\n
해당 연결의 경우 
1. 디바이스 시스템 설정에서 Wi-Fi 와 Wi-Fi 스캐너와 연결
2. 그 후 인포카 앱 내에서 올바른 IP와 포트 연결 시도 부탁드립니다.

자세한 사항은 앱 내 사용 가이드 - 연결 부분 참고 부탁 드립니다.
\n
감사합니다`,
    'HUD_INTERFERENCE': `안녕하세요 인포카입니다
먼저 이용에 불편함을 드려서 죄송합니다
\n
보내주신 로그파일을 보았을때에 HUD 제품과 같이사용하시는 것으로 보입니다
HUD 제품과 동시에 사용 시 제품 간 데이터 충돌로 인해 데이터 수집이 어려울 수 있습니다.
Y 케이블을 사용하게 되면, 두 가지 제품에서 동시에 데이터 호출하여 ECU에서 정상적인 데이터를 보내지 않을 수 있습니다.
obd단자함에 인포카스캐너만 연결해주시기 바랍니다
\n
감사합니다.`,
    'SUCCESS': '',
    'NONE': ''
  },
  // Fallback for other languages
  'EN': {
     'GENERAL_CONNECTION': 'Please check network and protocol settings.',
     'NO_DATA_PROTOCOL': 'No compatible protocol found. Please try manual selection.',
     'WIFI_CONNECTION': 'Please check Wi-Fi connection settings.',
     'HUD_INTERFERENCE': 'HUD device interference detected. Please unplug other OBD devices.',
     'SUCCESS': '',
     'NONE': ''
  }
} as any; 

const getLanguageFromCountry = (countryCode: string | undefined): LanguageCode => {
  if (!countryCode) return 'EN';
  const code = countryCode.toUpperCase().trim();
  if (['KR', 'KOR', '82'].includes(code)) return 'KO';
  return 'EN'; 
};

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ diagnosis, metadata, fullData }) => {
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiAnalysisResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [userContext, setUserContext] = useState<string>('');
  
  // API Key Management
  const [userApiKey, setUserApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  // Initialize Key from localStorage or check Env
  useEffect(() => {
    const savedKey = localStorage.getItem('GEMINI_API_KEY');
    const envKey = process.env.API_KEY;

    if (savedKey) {
        setUserApiKey(savedKey);
    } 
    
    // Automatically show input if no key is available anywhere
    if (!envKey && !savedKey) {
        setShowKeyInput(true);
    }
  }, []);

  const saveApiKey = (key: string) => {
    setUserApiKey(key);
    localStorage.setItem('GEMINI_API_KEY', key);
  };

  // Determine Language Template based on Country Code
  const { csText, languageName, langCode } = useMemo(() => {
    const code = getLanguageFromCountry(metadata.countryCode);
    const templateGroup = CS_TEMPLATES[code] || CS_TEMPLATES['EN']; // Fallback
    
    return {
      csText: templateGroup[diagnosis.csType] || '',
      languageName: LANGUAGE_NAMES[code] || 'English',
      langCode: code
    };
  }, [metadata.countryCode, diagnosis.csType]);

  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedMap(prev => ({ ...prev, [id]: true }));
    setTimeout(() => setCopiedMap(prev => ({ ...prev, [id]: false })), 2000);
  };

  const handleAiAnalysis = async () => {
    if (!fullData) return;
    
    // 1. IDX/AI Studio Environment Check
    if (typeof window !== 'undefined' && (window as any).aistudio) {
        const aistudio = (window as any).aistudio;
        try {
            const hasKey = await aistudio.hasSelectedApiKey();
            if (!hasKey) await aistudio.openSelectKey();
        } catch (e) {
            console.warn("API Key selection check failed", e);
        }
    }

    setAiLoading(true);
    setAiError(null);
    try {
        // Pass userApiKey explicitly. The service will prioritize it over process.env.API_KEY
        const result = await generateAiDiagnosis(fullData, userContext, userApiKey);
        setAiResult(result);
        setShowKeyInput(false); // Hide input on success
    } catch (err: any) {
        console.error(err);
        let errorMsg = 'AI 분석에 실패했습니다.';
        
        // Error Handling Logic
        if (err.message?.includes('API Key is missing')) {
            errorMsg = 'API Key가 없습니다. 설정에서 키를 입력해주세요.';
            setShowKeyInput(true);
        } else if (err.message?.includes('API key not valid') || err.message?.includes('400')) {
             errorMsg = 'API Key가 유효하지 않습니다. 올바른 키를 입력해주세요.';
             setShowKeyInput(true);
             
             // If IDX environment
             if (typeof window !== 'undefined' && (window as any).aistudio) {
                 setTimeout(() => { (window as any).aistudio.openSelectKey().catch(() => {}); }, 1000);
             }
        } else if (err.message?.includes('429')) {
             errorMsg = 'API 사용량 초과(429). 잠시 후 다시 시도하거나 다른 키를 사용해주세요.';
        } else {
            errorMsg += ` (${err.message || 'Unknown error'})`;
        }
        
        setAiError(errorMsg);
    } finally {
        setAiLoading(false);
    }
  };

  const isRTL = langCode === 'AR' || langCode === 'FA';

  return (
    <div className="bg-white rounded-lg border border-slate-200 mb-6 shadow-sm overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
        
        {/* Left Column: Technical Diagnosis */}
        <div className="p-6">
            <div className="flex items-start gap-4 h-full">
                <div className="mt-1">
                    <Stethoscope className="w-8 h-8 text-slate-400" />
                </div>
                <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                    연결 진단 리포트 (Rule-based)
                </h3>
                <p className="text-slate-700 font-medium mb-3">{diagnosis.summary}</p>

                {diagnosis.issues.length > 0 ? (
                    <div className="bg-slate-50 rounded-md p-4 border border-slate-200">
                    <p className="text-xs font-semibold text-slate-500 mb-3 uppercase">감지된 이슈 사항</p>
                    <ul className="space-y-2">
                        {diagnosis.issues.map((issue, idx) => (
                        <li key={idx} className="flex items-start text-sm text-slate-700 gap-2">
                            <span className="mt-2 w-1.5 h-1.5 bg-slate-400 rounded-full shrink-0" />
                            {issue}
                        </li>
                        ))}
                    </ul>
                    </div>
                ) : (
                    <div className="text-sm text-slate-500">
                        특이 사항이 발견되지 않았습니다.
                    </div>
                )}
                </div>
            </div>
        </div>

        {/* Right Column: CS Response Generator */}
        <div className="flex flex-col">
            {/* 1. Template Section */}
            <div className="p-6 bg-slate-50/50 flex-1">
                <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-base font-bold text-slate-900">CS 템플릿 답변</h3>
                     </div>
                     <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-[10px] bg-white border border-slate-200 px-2 py-1 rounded-full text-slate-500">
                             <Globe className="w-3 h-3" />
                             <span>{languageName}</span>
                        </div>
                        {csText && (
                            <button 
                                onClick={() => handleCopy(csText, 'template')}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm"
                            >
                                <Copy className="w-3 h-3" /> {copiedMap['template'] ? '완료' : '복사'}
                            </button>
                        )}
                     </div>
                </div>

                <div className="flex-1">
                    {csText ? (
                         <div dir="auto" className={`w-full min-h-[100px] bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-700 font-mono whitespace-pre-wrap ${isRTL ? 'text-right' : 'text-left'}`}>
                            {csText}
                         </div>
                    ) : (
                        <div className="w-full min-h-[100px] flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-300 rounded-lg bg-slate-50">
                            <p className="text-sm">매칭되는 템플릿이 없습니다.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. AI Analysis Section */}
            <div className="p-6 border-t border-slate-200 bg-indigo-50/30">
                 <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        <h3 className="text-base font-bold text-slate-900">AI 맞춤형 답변 생성</h3>
                     </div>
                     <button 
                        onClick={() => setShowKeyInput(!showKeyInput)}
                        className={`text-xs flex items-center gap-1 px-2 py-1 rounded-full border transition-colors ${userApiKey ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}`}
                     >
                        {userApiKey ? <ShieldCheck className="w-3 h-3" /> : <Key className="w-3 h-3" />}
                        {userApiKey ? 'Key 적용됨' : 'Key 설정'}
                        {showKeyInput ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                     </button>
                 </div>

                 {/* API Key Input Section (Toggleable) */}
                 {showKeyInput && (
                    <div className="mb-4 animate-in fade-in slide-in-from-top-2">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Key className="h-4 w-4 text-slate-400" />
                            </div>
                            <input
                                type="password"
                                className="w-full pl-10 pr-3 py-2 text-xs border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white placeholder-slate-400"
                                placeholder="Gemini API Key 입력 (sk-...)"
                                value={userApiKey}
                                onChange={(e) => saveApiKey(e.target.value)}
                            />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 ml-1">
                            * 본인의 Google AI Studio Key를 입력하세요. 브라우저에만 저장됩니다.
                        </p>
                    </div>
                 )}

                 {/* User Input for Context */}
                 <div className="mb-4">
                    <div className="relative">
                        <textarea 
                            className="w-full text-sm p-3 pr-10 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none bg-white text-slate-700 placeholder-slate-400"
                            placeholder="AI에게 참고할 사항을 알려주세요 (예: 환불 요청임, 차량 배터리 확인하라고 해줘)"
                            rows={2}
                            value={userContext}
                            onChange={(e) => setUserContext(e.target.value)}
                        />
                        <Edit3 className="absolute right-3 top-3 w-4 h-4 text-slate-300" />
                    </div>
                 </div>

                 {/* Action Button */}
                 {!aiLoading && !aiResult && (
                    <button 
                        onClick={handleAiAnalysis}
                        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold bg-purple-600 text-white hover:bg-purple-700 transition-all shadow-sm"
                    >
                        <Sparkles className="w-4 h-4" /> 답변 생성하기
                    </button>
                 )}
                 {!aiLoading && aiResult && (
                    <button 
                        onClick={handleAiAnalysis}
                        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold bg-white text-purple-600 border border-purple-200 hover:bg-purple-50 transition-all shadow-sm mb-4"
                    >
                        <RefreshCw className="w-4 h-4" /> 다시 생성하기
                    </button>
                 )}

                {aiLoading && (
                    <div className="flex items-center justify-center p-8 bg-white border border-slate-200 rounded-lg">
                        <RefreshCw className="w-6 h-6 text-purple-600 animate-spin mr-2" />
                        <span className="text-sm text-slate-600 font-medium">로그 분석 및 답변 작성 중...</span>
                    </div>
                )}

                {aiError && (
                     <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
                        <AlertTriangle className="w-4 h-4 shrink-0" /> 
                        <span>{aiError}</span>
                     </div>
                )}

                {aiResult && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-4">
                        
                        {/* 1. Korean Response (Always Shown) */}
                        <div className="relative bg-white p-4 rounded-lg border border-purple-100 shadow-sm">
                             <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">KR</div>
                                    <h4 className="text-xs font-bold text-slate-700 uppercase">한국어 답변</h4>
                                </div>
                                <button 
                                    onClick={() => handleCopy(aiResult.koreanResponse, 'kr_ai')}
                                    className="text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
                                >
                                    {copiedMap['kr_ai'] ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} 
                                    {copiedMap['kr_ai'] ? '복사됨' : '복사'}
                                </button>
                             </div>
                             <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-mono bg-slate-50 p-3 rounded border border-slate-100">
                                {aiResult.koreanResponse}
                             </p>
                        </div>

                        {/* 2. Translated Response (Shown if exists) */}
                        {aiResult.translatedResponse && (
                            <div className="relative bg-white p-4 rounded-lg border border-indigo-100 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                                            {aiResult.targetLanguage?.substring(0, 2).toUpperCase() || 'Local'}
                                        </div>
                                        <h4 className="text-xs font-bold text-slate-700 uppercase">
                                            현지 언어 번역 ({aiResult.targetLanguage})
                                        </h4>
                                    </div>
                                    <button 
                                        onClick={() => handleCopy(aiResult.translatedResponse!, 'tr_ai')}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                                    >
                                        {copiedMap['tr_ai'] ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} 
                                        {copiedMap['tr_ai'] ? '복사됨' : '복사'}
                                    </button>
                                </div>
                                <p dir="auto" className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-mono bg-indigo-50/50 p-3 rounded border border-indigo-50">
                                    {aiResult.translatedResponse}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
};