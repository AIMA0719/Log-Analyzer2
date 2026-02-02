
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { ObdDataPoint, ObdMetric } from '../types';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, Brush, ReferenceLine
} from 'recharts';
import { Play, Pause, RotateCcw, Activity, Zap, Thermometer, Gauge, Wind } from 'lucide-react';

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
    {isAvailable && (
      <div className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-tighter transition-all ${
        isSelected ? 'bg-indigo-600 text-white' : 'bg-emerald-100 text-emerald-600 opacity-0 group-hover:opacity-100'
      }`}>
        {isSelected ? '차트 표시 중' : '추가하기'}
      </div>
    )}
  </div>
);

export const ObdDashboard: React.FC<ObdDashboardProps> = ({ series, metrics }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0); 
  const [selectedPids, setSelectedPids] = useState<Set<string>>(new Set(['0C', '0D'])); // 기본: RPM, 속도
  
  const requestRef = useRef<number>();
  const lastUpdateRef = useRef<number>();

  const startTime = series[0]?.unix || 0;
  const totalDuration = series.length > 0 ? (series[series.length - 1].unix - startTime) : 0;
  
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

  const currentValues = useMemo(() => {
    const currentUnix = startTime + currentTime;
    const latest: Record<string, number> = {};
    series.forEach((p: ObdDataPoint) => {
      if (p.unix <= currentUnix) {
        latest[p.pid] = p.value;
      }
    });
    return latest;
  }, [currentTime, series, startTime]);

  const chartData = useMemo(() => {
    const dataBySec: Record<number, any> = {};
    series.forEach((p: ObdDataPoint) => {
      const sec = Math.floor((p.unix - startTime) / 1000) * 1000;
      if (!dataBySec[sec]) {
        dataBySec[sec] = { t: sec, timeLabel: formatSimTime(sec) };
      }
      dataBySec[sec][p.pid] = p.value;
    });
    return Object.values(dataBySec).sort((a: any, b: any) => a.t - b.t);
  }, [series, startTime]);

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
      {/* 재생 컨트롤러 */}
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
            <span>시뮬레이션 시간 (Simulation Time): {formatSimTime(currentTime)}</span>
            <span>총 소요 (Total): {formatSimTime(totalDuration)}</span>
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
          {[1, 2, 4, 8, 16, 32].map(speed => (
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

      {/* 카드 뷰 그리드 */}
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

      {/* 다중 선 차트 섹션 */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" /> 주행 세션 분석 (Drive Session Analysis)
          </h3>
          <div className="flex flex-wrap gap-2">
            {[...selectedPids].map((pid: string, idx: number) => (
              <div key={pid} className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold text-slate-600 shadow-sm animate-in zoom-in-95 duration-200">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }} />
                {metrics[pid]?.name || pid}
              </div>
            ))}
            {selectedPids.size === 0 && <span className="text-xs text-slate-400 italic">상단 카드를 클릭하여 차트에 항목을 추가하세요.</span>}
          </div>
        </div>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                  name={metrics[pid]?.name || pid}
                  stroke={colors[idx % colors.length]} 
                  strokeWidth={2.5} 
                  dot={false} 
                  isAnimationActive={false} 
                />
              ))}
              <ReferenceLine x={currentTime} stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" label={{ position: 'top', value: '재생 시점', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />
              <Brush dataKey="t" height={30} stroke="#cbd5e1" tickFormatter={(val) => formatSimTime(val)} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 p-3 bg-slate-50 rounded-lg flex items-center justify-center gap-2 text-[11px] text-slate-500 font-medium">
          <Info className="w-3.5 h-3.5 text-indigo-500" />
          상단 카드뷰를 눌러 분석할 항목을 차트에 추가하거나 제거할 수 있습니다.
        </div>
      </div>
    </div>
  );
};

const Info = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
);
