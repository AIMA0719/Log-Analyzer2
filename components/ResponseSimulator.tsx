
import React, { useState, useMemo, useRef } from 'react';
import { LogEntry, LogCategory } from '../types';
import { FileCode, Copy, Check, Play, Loader2, Clock, AlertCircle, FileJson } from 'lucide-react';

interface ResponseSimulatorProps {
  logs: LogEntry[];
  startTime: Date | null;
  endTime: Date | null;
}

interface CommandGroup {
  command: string;
  responses: string[];
}

// Format Date for display
const formatDisplayTime = (date: Date) => {
  return date.toLocaleString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

const formatDuration = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}초`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}분 ${seconds % 60}초`;
};

export const ResponseSimulator: React.FC<ResponseSimulatorProps> = ({ logs, startTime, endTime }) => {
  const [range, setRange] = useState<[number, number]>([0, 100]); // Percentage 0-100
  const [results, setResults] = useState<CommandGroup[]>([]);
  const [generatedJson, setGeneratedJson] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  
  const sliderRef = useRef<HTMLDivElement>(null);

  // 1. Calculate Session Data & Active Ranges
  const { minTime, maxTime, activeRanges } = useMemo(() => {
    if (!logs.length || !startTime || !endTime) {
      return { minTime: 0, maxTime: 0, activeRanges: [] };
    }

    const originalMin = startTime.getTime();
    const originalMax = endTime.getTime();
    
    // Store ranges in absolute timestamps first
    const absoluteRanges: { start: number; end: number }[] = [];
    let detectedStartTime: number | null = null;

    // State Machine for detection
    // States: IDLE -> 0100_OK -> SESSION_ACTIVE -> IDLE
    let state: 'IDLE' | '0100_OK' | 'SESSION_ACTIVE' = 'IDLE';
    let sessionStartTime = 0;

    for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        const msg = log.message.toUpperCase();
        
        // Check for Disconnect/Finish first to close any active session
        if (msg.includes('CONNECTED_FINISH') || msg.includes('DISCONNECT') || msg.includes('UNABLETOCONNECT')) {
            if (state === 'SESSION_ACTIVE') {
                // Close session
                absoluteRanges.push({
                    start: sessionStartTime,
                    end: log.timestamp.getTime()
                });
            }
            state = 'IDLE';
            continue;
        }

        if (state === 'IDLE') {
            // Check for 01 00 (Support PIDs) Response
            // Pattern: "01 00", "0100" in command, response usually "41 00 ..." or valid data
            if ((msg.includes('01 00') || msg.includes('0100')) && !log.isError && !msg.includes('NODATA')) {
                state = '0100_OK';
                // If this is the FIRST detection, set it as the timeline start
                if (detectedStartTime === null) {
                    detectedStartTime = log.timestamp.getTime();
                }
            }
        } else if (state === '0100_OK') {
            // Look for 01 0D (Speed)
            if ((msg.includes('01 0D') || msg.includes('010D')) && !log.isError && !msg.includes('NODATA')) {
                state = 'SESSION_ACTIVE';
                sessionStartTime = log.timestamp.getTime();
            }
        }
    }

    // If still active at the end, close it at maxTime
    if (state === 'SESSION_ACTIVE') {
        absoluteRanges.push({
            start: sessionStartTime,
            end: originalMax
        });
    }

    // Determine the effective start time (Trim lead time)
    // If we found a start time (0100), use it. Otherwise fallback to file start.
    const effectiveMin = detectedStartTime !== null ? detectedStartTime : originalMin;
    const duration = originalMax - effectiveMin;

    // Convert absolute ranges to percentages relative to effectiveMin
    // Filter out ranges that ended before effectiveMin
    const ranges = absoluteRanges
        .filter(r => r.end > effectiveMin)
        .map(r => {
            const start = Math.max(r.start, effectiveMin);
            return {
                startPercent: ((start - effectiveMin) / duration) * 100,
                widthPercent: ((r.end - start) / duration) * 100
            };
        });

    return { minTime: effectiveMin, maxTime: originalMax, activeRanges: ranges };
  }, [logs, startTime, endTime]);

  // Derived selected times
  const selectedStartTime = useMemo(() => new Date(minTime + (maxTime - minTime) * (range[0] / 100)), [minTime, maxTime, range]);
  const selectedEndTime = useMemo(() => new Date(minTime + (maxTime - minTime) * (range[1] / 100)), [minTime, maxTime, range]);
  const selectionDuration = selectedEndTime.getTime() - selectedStartTime.getTime();

  // 2. Drag Logic
  const handleMouseDown = (index: 0 | 1) => (e: React.MouseEvent) => {
    e.preventDefault();
    const slider = sliderRef.current;
    if (!slider) return;

    const startX = e.clientX;
    const startPercent = range[index];
    const { width } = slider.getBoundingClientRect();

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaPercent = (deltaX / width) * 100;
      let newPercent = startPercent + deltaPercent;

      // Clamp
      newPercent = Math.max(0, Math.min(100, newPercent));

      setRange(prev => {
        const newRange = [...prev] as [number, number];
        newRange[index] = newPercent;
        
        // Prevent crossing
        if (index === 0 && newRange[0] > newRange[1]) newRange[0] = newRange[1];
        if (index === 1 && newRange[1] < newRange[0]) newRange[1] = newRange[0];
        
        return newRange;
      });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const generateJson = (groups: CommandGroup[]) => {
    const obj: Record<string, string[]> = {};
    groups.forEach(g => {
        obj[g.command] = g.responses;
    });
    return JSON.stringify(obj, null, 2);
  };

  const handleAnalyze = () => {
    if (!selectedStartTime || !selectedEndTime) return;
    
    setIsAnalyzing(true);
    setHasAnalyzed(false);

    setTimeout(() => {
      const filteredLogs = logs.filter(log => {
        return log.timestamp >= selectedStartTime && 
               log.timestamp <= selectedEndTime && 
               (log.category === LogCategory.OBD || log.category === LogCategory.BLUETOOTH);
      });

      const groups: Record<string, string[]> = {};
      // Regex Update: Support optional generic prefix before command (e.g., "ECU, ", "7DF, ")
      // Format: [Prefix, ] Command : Response [ , delay ...]
      const regex = /(?:[^,]+,\s*)?([0-9A-F\s]{2,})\s:\s(.*?)(?=, delay|$)/;

      filteredLogs.forEach(log => {
        const msg = log.message;
        const match = msg.match(regex);
        
        if (match) {
          const cmd = match[1].trim();
          const resp = match[2].trim();

          if (resp && !resp.includes('NO DATA') && !resp.includes('ERROR') && !resp.includes('NODATA')) {
             if (!groups[cmd]) groups[cmd] = [];
             groups[cmd].push(resp);
          }
        }
      });

      const resultArray = Object.keys(groups).sort().map(cmd => ({
        command: cmd,
        responses: groups[cmd]
      }));

      setResults(resultArray);
      setGeneratedJson(generateJson(resultArray));
      setIsAnalyzing(false);
      setHasAnalyzed(true);
    }, 100);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedJson);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!startTime || !endTime) return null;

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-start gap-4 mb-8">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <FileCode className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900">OBD 응답 데이터 추출</h2>
            <p className="text-sm text-slate-500 mt-1">
              선택한 구간의 OBD 응답 값을 JSON 형식으로 추출합니다. 추출된 파일은 <code>assets/obd_mock_data.json</code>으로 저장하여 로더 클래스에서 사용하세요.
            </p>
          </div>
        </div>

        {/* Custom Range Slider Area */}
        <div className="flex flex-col md:flex-row gap-8 px-2 pb-4">
          
          {/* Left: Slider */}
          <div className="flex-1 pt-6">
            <div className="flex justify-between text-xs font-semibold text-slate-400 mb-2">
               <span title="첫 통신 시작 시점 (Lead Time 제거됨)">{formatDisplayTime(new Date(minTime))}</span>
               <span>{formatDisplayTime(new Date(maxTime))}</span>
            </div>

            <div className="relative h-6 select-none flex items-center" ref={sliderRef}>
              <div className="absolute w-full h-4 bg-slate-200 rounded-full overflow-hidden">
                 {activeRanges.map((r, i) => (
                   <div 
                      key={i}
                      className="absolute h-full bg-green-400 opacity-80"
                      style={{ left: `${r.startPercent}%`, width: `${r.widthPercent}%` }}
                   />
                 ))}
              </div>

              <div 
                className="absolute h-4 bg-indigo-600 opacity-20 pointer-events-none rounded-sm"
                style={{ left: `${range[0]}%`, width: `${range[1] - range[0]}%` }}
              />

              {/* Handle 1 */}
              <div 
                className="absolute top-[-20px] w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] border-t-indigo-600 cursor-ew-resize z-10 hover:scale-110 transition-transform drop-shadow-md"
                style={{ left: `calc(${range[0]}% - 8px)` }}
                onMouseDown={handleMouseDown(0)}
              >
                  <div className="absolute -top-[24px] -left-[12px] w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-[10px] text-white font-bold shadow-sm">S</div>
              </div>

              {/* Handle 2 */}
              <div 
                className="absolute top-[-20px] w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] border-t-indigo-600 cursor-ew-resize z-10 hover:scale-110 transition-transform drop-shadow-md"
                style={{ left: `calc(${range[1]}% - 8px)` }}
                onMouseDown={handleMouseDown(1)}
              >
                  <div className="absolute -top-[24px] -left-[12px] w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-[10px] text-white font-bold shadow-sm">E</div>
              </div>
            </div>
          </div>

          {/* Right: Info Panel */}
          <div className="w-full md:w-64 shrink-0 bg-slate-50 rounded-lg p-4 border border-slate-200 flex flex-col justify-center space-y-3">
             <div className="flex items-center gap-2 text-indigo-900 font-bold border-b border-slate-200 pb-2 mb-1">
                <Clock className="w-4 h-4" />
                <span>선택된 구간</span>
             </div>
             <div>
                <span className="text-xs text-slate-500 block uppercase">시작 (Start)</span>
                <span className="font-mono text-sm font-semibold text-slate-700">{formatDisplayTime(selectedStartTime)}</span>
             </div>
             <div>
                <span className="text-xs text-slate-500 block uppercase">종료 (End)</span>
                <span className="font-mono text-sm font-semibold text-slate-700">{formatDisplayTime(selectedEndTime)}</span>
             </div>
             <div className="pt-2 border-t border-slate-200">
                <span className="text-xs text-slate-500 block uppercase">기간 (Duration)</span>
                <span className="font-mono text-sm font-bold text-indigo-600">{formatDuration(selectionDuration)}</span>
             </div>
          </div>
        </div>

        {/* Analyze Action */}
        <div className="flex justify-center mt-6">
            <button 
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className={`flex items-center justify-center gap-2 px-8 py-3 rounded-full font-bold shadow-lg transition-all ${
                isAnalyzing 
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:-translate-y-0.5'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  분석 및 추출 중...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  데이터 추출하기 (JSON)
                </>
              )}
            </button>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 ? (
        <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
           {/* Toolbar */}
           <div className="bg-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                 <FileJson className="w-4 h-4 text-yellow-400" />
                 <span className="text-sm font-mono text-slate-300">src/main/assets/obd_mock_data.json</span>
              </div>
              <button 
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-md"
              >
                {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {isCopied ? '복사 완료!' : 'JSON 데이터 복사'}
              </button>
           </div>
           
           {/* Code View */}
           <div className="p-4 overflow-x-auto max-h-[500px] custom-scrollbar bg-[#1e1e1e]">
             <pre className="text-xs font-mono text-[#d4d4d4] leading-relaxed whitespace-pre">
               {generatedJson}
             </pre>
           </div>
           
           {/* Instructions Footer */}
           <div className="bg-slate-900 p-4 border-t border-slate-700 text-xs text-slate-400 flex items-start gap-2">
             <InfoIcon className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
             <p>
                이 JSON 데이터를 복사하여 안드로이드 프로젝트의 
                <span className="text-white font-mono mx-1">src/main/assets/obd_mock_data.json</span> 
                경로에 덮어쓰세요. <span className="text-slate-300">ObdMockData</span> 클래스가 자동으로 로드합니다.
             </p>
           </div>
        </div>
      ) : (
        <div className="bg-white p-12 text-center rounded-lg border border-dashed border-slate-300">
            {hasAnalyzed ? (
                 <>
                    <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                    <h3 className="text-slate-900 font-medium text-lg">결과가 없습니다</h3>
                    <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
                        선택하신 시간 범위 내에서 유효한 OBD 응답 패턴을 찾을 수 없습니다.<br/>
                        시크바의 <span className="text-green-600 font-bold">초록색 구간</span>을 포함하도록 범위를 넓혀보세요.
                    </p>
                 </>
            ) : (
                 <>
                    <FileCode className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-slate-900 font-medium">데이터 추출 대기 중</h3>
                    <p className="text-slate-500 text-sm mt-1">
                        위 타임라인에서 범위를 설정하고 '데이터 추출하기' 버튼을 눌러주세요.
                    </p>
                 </>
            )}
        </div>
      )}
    </div>
  );
};

const InfoIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
);
