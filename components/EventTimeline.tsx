
import React, { useMemo } from 'react';
import { LifecycleEvent } from '../types';
import { 
  Bluetooth, Radio, Smartphone, Activity, Link, Unplug, 
  Search, ShieldCheck, Layout, Settings, 
  Zap, Clock, ChevronRight
} from 'lucide-react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

interface EventTimelineProps {
  events: LifecycleEvent[];
}

const getEventIcon = (event: LifecycleEvent) => {
  const msg = event.message;
  if (event.type === 'SCREEN') return <Layout className="w-4 h-4 text-blue-500" />;
  if (msg.includes('🚀')) return <Activity className="w-4 h-4 text-indigo-500" />;
  if (msg.includes('✅')) return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
  if (msg.includes('Bluetooth') || msg.includes('Classic') || msg.includes('BLE')) {
    if (msg.includes('Success')) return <Zap className="w-4 h-4 text-yellow-500" />;
    return <Bluetooth className="w-4 h-4 text-indigo-400" />;
  }
  if (msg.includes('connectionSuccess')) return <Link className="w-4 h-4 text-emerald-500" />;
  return <Activity className="w-4 h-4 text-slate-400" />;
};

// 개별 아이템 컴포넌트 (Memoized for performance)
const TimelineRow = React.memo(({ index, style, data }: { index: number; style: React.CSSProperties; data: LifecycleEvent[] }) => {
  const item = data[index];
  if (!item) return null;

  return (
    <div style={style} className="px-4 group">
      <div className="flex gap-3 h-full items-start border-l-2 border-slate-100 ml-4 pl-6 relative">
        {/* Dot Indicator */}
        <div className="absolute -left-[11px] top-1 bg-white p-1 rounded-full border border-slate-200 z-10 shadow-sm group-hover:scale-110 transition-transform">
          {getEventIcon(item)}
        </div>

        <div className="flex flex-col flex-1 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {item.rawTimestamp.split(' ')[1] || item.rawTimestamp}
            </span>
            {item.type === 'SCREEN' && <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded uppercase">UI</span>}
          </div>
          <div className={`text-xs p-2 rounded-lg border transition-colors ${
            item.type === 'SCREEN' ? 'bg-blue-50/20 border-blue-100 text-blue-900' :
            item.message.includes('Success') || item.message.includes('✅') ? 'bg-emerald-50/20 border-emerald-100 text-emerald-900' :
            'bg-white border-slate-100 text-slate-700 hover:border-slate-200'
          }`}>
            <p className="font-bold truncate" title={item.message}>{item.message}</p>
            {item.details && item.details !== item.message && (
              <p className="text-[9px] text-slate-400 font-mono mt-0.5 truncate opacity-60">
                {item.details}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

const VirtualizedTimeline: React.FC<{ 
  title: string; 
  icon: React.ReactNode; 
  items: LifecycleEvent[]; 
  emptyMessage: string;
  colorClass: string;
}> = ({ title, icon, items, emptyMessage, colorClass }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
    <div className={`px-5 py-3 border-b border-slate-100 flex items-center justify-between ${colorClass}`}>
      <div className="flex items-center gap-2 font-black text-xs uppercase tracking-tight">
        {icon}
        <h3>{title}</h3>
      </div>
      <span className="text-[10px] bg-white/50 px-2 py-0.5 rounded-full font-bold">{items.length} EVENTS</span>
    </div>
    
    <div className="flex-1 min-h-0 relative">
      {items.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs italic">
          <Search className="w-8 h-8 opacity-20 mb-2" />
          {emptyMessage}
        </div>
      ) : (
        <AutoSizer>
          {({ height, width }) => (
            <List
              height={height}
              width={width}
              itemCount={items.length}
              itemSize={72} // Fixed row height for consistency
              itemData={items}
              className="custom-scrollbar pt-6"
            >
              {TimelineRow}
            </List>
          )}
        </AutoSizer>
      )}
    </div>
  </div>
);

export const EventTimeline: React.FC<EventTimelineProps> = ({ events }) => {
  const connectionEvents = useMemo(() => events.filter(e => e.type === 'CONNECTION'), [events]);
  const screenEvents = useMemo(() => events.filter(e => e.type === 'SCREEN'), [events]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
      {/* Summary Stat Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-indigo-600 p-4 rounded-2xl text-white flex items-center gap-3">
          <Bluetooth className="w-5 h-5 opacity-70" />
          <div>
            <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest">통신 이벤트</p>
            <p className="text-xl font-black">{connectionEvents.length}</p>
          </div>
        </div>
        <div className="bg-blue-500 p-4 rounded-2xl text-white flex items-center gap-3">
          <Smartphone className="w-5 h-5 opacity-70" />
          <div>
            <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest">UI 이동</p>
            <p className="text-xl font-black">{screenEvents.length}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-3">
          <Zap className="w-5 h-5 text-yellow-500" />
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">프로토콜 감지</p>
            <p className="text-xl font-black text-slate-800">{connectionEvents.some(e => e.message.includes('01 0D')) ? 'OBD-II' : 'READY'}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-3">
          <Clock className="w-5 h-5 text-slate-400" />
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">분석 정밀도</p>
            <p className="text-xl font-black text-slate-800">HIGH</p>
          </div>
        </div>
      </div>

      {/* Main Timelines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <VirtualizedTimeline 
          title="Protocol & Bluetooth Flow"
          icon={<Radio className="w-4 h-4" />}
          items={connectionEvents}
          emptyMessage="연결 관련 이벤트가 없습니다."
          colorClass="bg-indigo-50 text-indigo-700"
        />

        <VirtualizedTimeline 
          title="UI Screen Transitions"
          icon={<Smartphone className="w-4 h-4" />}
          items={screenEvents}
          emptyMessage="화면 이동 내역이 없습니다."
          colorClass="bg-blue-50 text-blue-700"
        />
      </div>
    </div>
  );
};
