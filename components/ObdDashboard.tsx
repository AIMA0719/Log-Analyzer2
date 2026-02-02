
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { ObdDataPoint, ObdMetric } from '../types';
import { detectSegments, ObdSegment } from '../services/obdParser';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, ReferenceLine, AreaChart, Area
} from 'recharts';
import { Play, Pause, RotateCcw, Activity, Zap, Thermometer, Gauge, Wind, Info, Map as MapIcon, Eye, EyeOff, Timer } from 'lucide-react';

export interface ObdDashboardProps {
  series: ObdDataPoint[];
  metrics: Record<string, ObdMetric>;
}

interface MetricCardProps {
  name: string;
  value: string | number;
  unit: string;
  isAvailable: boolean;
  isSelected: boolean;
  icon: React.ReactNode;
  onClick: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({ name, value, unit, isAvailable, isSelected, icon, onClick }) => (
  <div 
    onClick={isAvailable ? onClick : undefined}
    className={`bg-white p-3 rounded-xl border-2 transition-all hover:shadow-md flex items-center justify-between group ${
      isSelected ? 'border-indigo-500 shadow-indigo-100 ring-2 ring-indigo-50' : 'border-slate-200'
    } ${isAvailable ? 'cursor-pointer' : 'opacity-40 grayscale cursor-not-allowed'}`}
  >
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg transition-colors ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 truncate">{name}</span>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-black text-slate-800">{isAvailable ? value : '--'}</span>
          <span className="text-[9px] font-bold text-slate-400 uppercase">{unit}</span>
        </div>
      </div>
    </div>
  </div>
);

export const ObdDashboard: React.FC<ObdDashboardProps> = ({ series, metrics }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0); 
  const [selectedPids, setSelectedPids] = useState<Set<string>>(new Set(['0C', '0D']));
  const [followMode, setFollowMode] = useState(true);
  const [windowSize, setWindowSize] = useState<number | 'ALL'>(300000); // Default 5 mins

  // 세션 분할 분석
  const segments = useMemo(() => detectSegments(series), [series]);
  const [activeSegmentId, setActiveSegmentId] = useState<number>(1);
  const activeSegment = useMemo(() => segments.find(s => s.id === activeSegmentId) || segments[0], [segments, activeSegmentId]);

  const requestRef = useRef<number>();
  const lastUpdateRef = useRef<number>();

  const startTime = activeSegment?.startTime || 0;
  const totalDuration = activeSegment ? (activeSegment.endTime - activeSegment.startTime) : 0;
  
  const animate = (time: number) => {
    if (lastUpdateRef.current !== undefined) {
      const deltaTime = time - lastUpdateRef.current;
      setCurrentTime(prev => {
        const next = prev + deltaTime * playbackSpeed;
        if (next >= totalDuration) {
          setIsPlaying(false);
          return totalDuration;
        }
        return next;
      });
    }
    lastUpdateRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      lastUpdateRef.current = undefined;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, playbackSpeed, totalDuration]);

  // 세션 변경 시 시간 초기화
  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(false);
  }, [activeSegmentId]);

  const currentValues = useMemo(() => {
    const currentUnix = startTime + currentTime;
    const latest: Record<string, number> = {};
    activeSegment.dataPoints.forEach((p: ObdDataPoint) => {
      if (p.unix <= currentUnix) {
        latest[p.pid] = p.value;
      }
    });
    return latest;
  }, [currentTime, activeSegment, startTime]);

  // 차트 데이터 가공 (X축 윈도잉 포함)
  const fullChartData = useMemo(() => {
    const dataBySec: Record<number, any> = {};
    activeSegment.dataPoints.forEach((p: ObdDataPoint) => {
      const sec = Math.floor((p.unix - startTime) / 1000) * 1000;
      if (!dataBySec[sec]) {
        dataBySec[sec] = { t: sec, timeLabel: formatSimTime(sec) };
      }
      dataBySec[sec][p.pid] = p.value;
    });
    return Object.values(dataBySec).sort((a: any, b: any) => a.t - b.t);
  }, [activeSegment, startTime]);

  const filteredChartData = useMemo(() => {
    if (windowSize === 'ALL' || !followMode) return fullChartData;
    
    // 현재 시간 기준 앞뒤로 윈도우 설정 (기본은 현재 시간을 우측 끝에)
    const viewStart = Math.max(0, currentTime - windowSize * 0.8);
    const viewEnd = viewStart + windowSize;
    
    return fullChartData.filter(d => d.t >= viewStart && d.t <= viewEnd);
  }, [fullChartData, currentTime, windowSize, followMode]);

  const togglePid = (pid: string) => {
    setSelectedPids(prev => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  function formatSimTime(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  const getIcon = (pid: string) => {
    switch(pid) {
      case '0C': return <Activity className="w-5 h-5" />;
      case '0D': return <Zap className="w-5 h-5" />;
      case '05': return <Thermometer className="w-5 h-5" />;
      case '04': return <Gauge className="w-5 h-5" />;
      default: return <Wind className="w-5 h-5" />;
    }
  };

  const colors = ['#6366f1', '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Trip Selector (세션 분할 UI) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter whitespace-nowrap mr-2">주행 세션:</span>
        {segments.map((seg) => (
          <button
            key={seg.id}
            onClick={() => setActiveSegmentId(seg.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all whitespace-nowrap ${
              activeSegmentId === seg.id 
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            Trip {seg.id} <span className="opacity-60 text-[10px] ml-1">({seg.startLabel} ~ {seg.endLabel})</span>
          </button>
        ))}
      </div>

      {/* 2. 재생 컨트롤러 */}
      <div className="bg-slate-900 p-4 rounded-2xl shadow-xl border border-slate-800 flex flex-col md:flex-row items-center gap-6">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-10 h-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-all"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
          </button>
          <button 
            onClick={() => { setIsPlaying(false); setCurrentTime(0); }}
            className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 w-full space-y-2">
          <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            <span className="flex items-center gap-1"><Timer className="w-3 h-3"/> 현재: {formatSimTime(currentTime)}</span>
            <span>종료: {formatSimTime(totalDuration)}</span>
          </div>
          <input 
            type="range"
            min={0}
            max={totalDuration}
            value={currentTime}
            onChange={(e) => setCurrentTime(parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        <div className="flex items-center bg-slate-800 p-1 rounded-lg">
          {[1, 2, 8, 16].map(speed => (
            <button
              key={speed}
              onClick={() => setPlaybackSpeed(speed)}
              className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${playbackSpeed === speed ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* 3. 카드 뷰 그리드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {(Object.values(metrics) as ObdMetric[]).map((m: ObdMetric) => (
          <MetricCard 
            key={m.id}
            name={m.name}
            value={currentValues[m.id] !== undefined ? currentValues[m.id] : '--'}
            unit={m.unit}
            isAvailable={m.isAvailable}
            isSelected={selectedPids.has(m.id)}
            icon={getIcon(m.id)}
            onClick={() => togglePid(m.id)}
          />
        ))}
      </div>

      {/* 4. 개선된 차트 섹션 */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex flex-col">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" /> 주행 흐름 분석 (Trip Flow Analysis)
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">상단 카드를 클릭하여 항목을 추가하거나 제거하세요.</p>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-50 p-1 rounded-lg border border-slate-100">
            <div className="flex items-center gap-1 pr-3 border-r border-slate-200">
                <button 
                  onClick={() => setFollowMode(!followMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                    followMode ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-slate-400 border border-slate-200'
                  }`}
                >
                  {followMode ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {followMode ? '추적 중' : '고정 뷰'}
                </button>
            </div>
            <div className="flex gap-1">
                {[
                    { label: '30초', val: 30000 },
                    { label: '2분', val: 120000 },
                    { label: '5분', val: 300000 },
                    { label: '전체', val: 'ALL' }
                ].map((opt) => (
                    <button
                        key={opt.label}
                        onClick={() => setWindowSize(opt.val as any)}
                        className={`px-2 py-1.5 rounded text-[10px] font-bold transition-all ${
                            windowSize === opt.val ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
          </div>
        </div>

        <div className="h-[360px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="t" 
                fontSize={9} 
                tickFormatter={(val) => formatSimTime(val)} 
                axisLine={false} 
                tickLine={false}
                minTickGap={40}
              />
              <YAxis fontSize={9} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
              <Tooltip 
                labelFormatter={(val) => `Time: ${formatSimTime(Number(val))}`}
                contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.95)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                itemStyle={{ padding: '1px 0' }}
              />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingBottom: '20px' }} />
              {[...selectedPids].map((pid: string, idx: number) => (
                <Line 
                  key={pid}
                  type="monotone" 
                  dataKey={pid} 
                  name={metrics[pid]?.name.split(' (')[0] || pid}
                  stroke={colors[idx % colors.length]} 
                  strokeWidth={2} 
                  dot={false} 
                  isAnimationActive={false} 
                />
              ))}
              <ReferenceLine x={currentTime} stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
          
          {/* Overlay info when no data in window */}
          {filteredChartData.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-[1px]">
                <Info className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs text-slate-500">이 시간 구간에 데이터가 없습니다.</p>
            </div>
          )}
        </div>

        <div className="mt-4 p-3 bg-indigo-50/50 rounded-lg flex items-center justify-center gap-2 text-[10px] text-indigo-700 font-medium border border-indigo-100">
          <Info className="w-3.5 h-3.5" />
          '추적 중' 모드에서는 재생 시점에 맞춰 차트가 자동으로 이동하며, 상세한 파형 변화를 관찰하기 좋습니다.
        </div>
      </div>
    </div>
  );
};
