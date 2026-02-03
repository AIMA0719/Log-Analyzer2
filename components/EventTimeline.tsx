
import React, { useMemo, useState } from 'react';
import { LifecycleEvent } from '../types';
import { 
  Bluetooth, Radio, Smartphone, Activity, Link, 
  Search, ShieldCheck, Layout, Zap, Clock, Eye, EyeOff
} from 'lucide-react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

interface EventTimelineProps {
  events: LifecycleEvent[];
}

const getEventIcon = (event: LifecycleEvent) => {
  const msg = event.message;
  if (event.type === 'SCREEN') return <Layout className="w-4 h-4 text-blue-500" />;
  if (msg.includes('connectionSuccess')) return <Link className="w-4 h-4 text-emerald-500" />;
  if (msg.includes('Bluetooth')) return <Bluetooth className="w-4 h-4 text-indigo-400" />;
  if (msg.startsWith('AT')) return <Radio className="w-4 h-4 text-slate-400" />;
  return <Activity className="w-4 h-4 text-slate-400" />;
};

const TimelineRow = React.memo(({ index, style, data }: { index: number; style: React.CSSProperties; data: LifecycleEvent[] }) => {
  const item = data[index];
  if (!item) return null;

  const isProtocol = item.message.startsWith('AT') || item.message.includes('ELM');

  return (
    <div style={style} className="px-4">
      <div className="flex gap-3 h-full items-start border-l-2 border-slate-100 ml-4 pl-6 relative">
        <div className="absolute -left-[11px] top-1 bg-white p-1 rounded-full border border-slate-200 z-10 shadow-sm">
          {getEventIcon(item)}
        </div>

        <div className="flex flex-col flex-1 pb-2">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[9px] font-mono font-bold text-slate-400">
              {item.rawTimestamp.split(' ')[1] || item.rawTimestamp}
            </span>
            {item.type === 'SCREEN' && <span className="text-[8px] font-black bg-blue-100 text-blue-600 px-1 rounded">UI</span>}
            {isProtocol && <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-1 rounded">CMD</span>}
          </div>
          <div className={`text-[11px] px-2 py-1.5 rounded-md border ${
            item.type === 'SCREEN' ? 'bg-blue-50 border-blue-100 text-blue-900' :
            item.message.includes('Success') ? 'bg-emerald-50 border-emerald-100 text-emerald-900' :
            'bg-white border-slate-100 text-slate-700'
          }`}>
            <p className="font-bold truncate" title={item.message}>{item.message}</p>
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
  colorClass: string;
}> = ({ title, icon, items, colorClass }) => {
  const [showAll, setShowAll] = useState(false);

  // 간소화 로직: AT 명령어나 반복되는 데이터 요청은 기본적으로 숨김
  const filteredItems = useMemo(() => {
    if (showAll) return items;
    return items.filter(it => !it.message.startsWith('AT') && !it.message.includes('ELM'));
  }, [items, showAll]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[550px]">
      <div className={`px-4 py-3 border-b border-slate-100 flex items-center justify-between ${colorClass}`}>
        <div className="flex items-center gap-2 font-black text-xs uppercase tracking-tight">
          {icon}
          <h3>{title}</h3>
        </div>
        <button 
          onClick={() => setShowAll(!showAll)}
          className="flex items-center gap-1.5 px-2 py-1 bg-white/60 hover:bg-white rounded-md text-[10px] font-bold transition-all border border-slate-200"
        >
          {showAll ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {showAll ? '간소화 보기' : '모든 로그 보기'}
        </button>
      </div>
      
      <div className="flex-1 min-h-0 relative">
        {filteredItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs italic">
            <Search className="w-8 h-8 opacity-20 mb-2" />
            표시할 이벤트가 없습니다.
          </div>
        ) : (
          <AutoSizer>
            {({ height, width }) => (
              <List
                height={height}
                width={width}
                itemCount={filteredItems.length}
                itemSize={60} 
                itemData={filteredItems}
                className="custom-scrollbar pt-4"
              >
                {TimelineRow}
              </List>
            )}
          </AutoSizer>
        )}
      </div>
    </div>
  );
};

export const EventTimeline: React.FC<EventTimelineProps> = ({ events }) => {
  const connectionEvents = useMemo(() => events.filter(e => e.type === 'CONNECTION'), [events]);
  const screenEvents = useMemo(() => events.filter(e => e.type === 'SCREEN'), [events]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VirtualizedTimeline 
          title="Protocol & Connection"
          icon={<Radio className="w-4 h-4" />}
          items={connectionEvents}
          colorClass="bg-indigo-50 text-indigo-700"
        />
        <VirtualizedTimeline 
          title="UI Screen Flow"
          icon={<Smartphone className="w-4 h-4" />}
          items={screenEvents}
          colorClass="bg-blue-50 text-blue-700"
        />
      </div>
    </div>
  );
};
