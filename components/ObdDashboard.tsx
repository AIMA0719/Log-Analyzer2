
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { ObdDataPoint, ObdMetric } from '../types';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { Play, Pause, RotateCcw, Activity, Zap, Thermometer, Gauge, Wind, Map, Eye, Target } from 'lucide-react';
import { detectSegments, ObdSegment } from '../services/obdParser';

export interface ObdDashboardProps {
  series: ObdDataPoint[];
  metrics: Record<string, ObdMetric>;
}

const MetricCard: React.FC<any> = ({ name, value, unit, isAvailable, isSelected, icon, onClick }) => (
  <div 
    onClick={isAvailable ? onClick : undefined}
    className={`bg-white p-4 rounded-xl border-2 transition-all hover:shadow-md flex items-center justify-between group ${
      isSelected ? 'border-indigo-500 shadow-indigo-100 ring-2 ring-indigo-50' : 'border-slate-200'
    } ${isAvailable ? 'cursor-pointer' : 'opacity-40 grayscale cursor-not-allowed'}`}
  >
    <div className="flex items-center gap-4">
      <div className={`p-2.5 rounded-lg transition-colors ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{name}</span>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-black text-slate-800">{isAvailable ? value : '--'}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">{unit}</span>
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
  
  // 분석 모드 설정
  const [activeSegmentId, setActiveSegmentId] = useState<number>(0); // 0: 전체
  const [isFollowMode, setIsFollowMode] = useState(true);
  const [viewWindowMs, setViewWindowMs] = useState(120000); // 2분 기본

  const requestRef = useRef<number>();
  const lastUpdateRef = useRef<number>();

  // 세션 분할
  const segments = useMemo(() => detectSegments(series), [series]);
  
  // 현재 활성화된 데이터 셋
  const activeSeries = useMemo(() => {
    if (activeSegmentId === 0) return series;
    return segments.find(s => s.id === activeSegmentId)?.dataPoints || [];
  }, [activeSegmentId, series, segments]);

  const startTime = activeSeries[0]?.unix || 0;
  const endTime = activeSeries[activeSeries.length - 1]?.unix || 0;
  const totalDuration = endTime - startTime;
  
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
  }, [isPlaying, playbackSpeed]);

  // 재생 위치에 따른 현재 데이터 값
  const currentValues = useMemo(() => {
    const currentUnix = startTime + currentTime;
    const latest: Record<string, number> = {};
    activeSeries.forEach((p: ObdDataPoint) => {
      if (p.unix <= currentUnix) {
        latest[p.pid] = p.value;
      }
    });
    return latest;
  }, [currentTime, activeSeries, startTime]);

  // 차트 가시 영역 계산 (Follow Mode)
  const chartData = useMemo(() => {
    const fullData: any[] = [];
    const dataBySec: Record<number, any> = {};
    
    activeSeries.forEach((p: ObdDataPoint) => {
      const sec = Math.floor((p.unix - startTime) / 1000) * 1000;
      if (!dataBySec[sec]) {
        dataBySec[sec] = { t: sec, timeLabel: formatSimTime(sec) };
      }
      dataBySec[sec][p.pid] = p.value;
    });
    
    const sorted = Object.values(dataBySec).sort((a: any, b: any) => a.t - b.t);

    if (!isFollowMode) return sorted;

    // Follow Mode: 현재 시간 기준으로 window 크기만큼만 보여줌
    const halfWindow = viewWindowMs / 2;
    const minT = Math.max(0, currentTime - halfWindow);
    const maxT = minT + viewWindowMs;

    return sorted.filter((d: any) => d.t >= minT && d.t <= maxT);
  }, [activeSeries, startTime, isFollowMode, currentTime, viewWindowMs]);

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
      {/* 1. 세션 선택 탭 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        <button
          onClick={() => { setActiveSegmentId(0); setCurrentTime(0); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all border ${
            activeSegmentId === 0 ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Map className="w-4 h-4" /> 전체 주행
        </button>
        {segments.map(seg => (
          <button
            key={seg.id}
            onClick={() => { setActiveSegmentId(seg.id); setCurrentTime(0); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all border ${
              activeSegmentId === seg.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Trip {seg.id} ({seg.startLabel} ~ {seg.endLabel})
          </button>
        ))}
      </div>

      {/* 2. 재생 컨트롤러 */}
      <div className="bg-slate-900 p-4 md:p-6 rounded-2xl shadow-xl border border-slate-800 flex flex-col md:flex-row items-center gap-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-12 h-12 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-all shadow-lg shadow-indigo-500/20"
          >
            {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
          </button>
          <button 
            onClick={() => { setIsPlaying(false); setCurrentTime(0); }}
            className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-all"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 w-full space-y-2">
          <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span>재생 위치: {formatSimTime(currentTime)}</span>
            <span>트립 시간: {formatSimTime(totalDuration)}</span>
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
          {[1, 4, 16, 32].map(speed => (
            <button
              key={speed}
              onClick={() => setPlaybackSpeed(speed)}
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${playbackSpeed === speed ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* 3. 카드 뷰 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* 4. 차트 분석 영역 */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 shrink-0">
              <Activity className="w-5 h-5 text-indigo-600" /> 주행 데이터 정밀 분석
            </h3>
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
               <button 
                onClick={() => setIsFollowMode(!isFollowMode)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all ${isFollowMode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
               >
                 <Target className="w-3.5 h-3.5" /> 추적 모드
               </button>
               <div className="w-px h-4 bg-slate-200 mx-1" />
               <select 
                className="bg-transparent border-none text-[11px] font-bold text-slate-500 focus:ring-0 outline-none cursor-pointer"
                value={viewWindowMs}
                onChange={(e) => setViewWindowMs(Number(e.target.value))}
               >
                 <option value={30000}>30초 뷰</option>
                 <option value={120000}>2분 뷰</option>
                 <option value={300000}>5분 뷰</option>
                 <option value={600000}>10분 뷰</option>
               </select>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {[...selectedPids].map((pid: string, idx: number) => (
              <div key={pid} className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold text-slate-600 shadow-sm">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }} />
                {metrics[pid]?.name}
              </div>
            ))}
          </div>
        </div>

        <div className="h-[450px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="t" 
                fontSize={10} 
                tickFormatter={(val) => formatSimTime(val)} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis fontSize={10} axisLine={false} tickLine={false} />
              <Tooltip 
                labelFormatter={(val) => `Time: ${formatSimTime(Number(val))}`}
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                itemStyle={{ padding: '2px 0' }}
              />
              <Legend verticalAlign="top" height={36}/>
              {[...selectedPids].map((pid: string, idx: number) => (
                <Line 
                  key={pid}
                  type="monotone" 
                  dataKey={pid} 
                  name={metrics[pid]?.name}
                  stroke={colors[idx % colors.length]} 
                  strokeWidth={2.5} 
                  dot={false} 
                  isAnimationActive={false} 
                />
              ))}
              <ReferenceLine x={currentTime} stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 p-3 bg-indigo-50 rounded-lg flex items-center justify-between gap-2 text-[11px] text-indigo-700 font-medium">
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5" />
            <span>추적 모드를 켜면 시뮬레이션 위치에 따라 차트가 자동으로 스크롤됩니다.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">전체 데이터: {activeSeries.length.toLocaleString()} pts</span>
          </div>
        </div>
      </div>
    </div>
  );
};
