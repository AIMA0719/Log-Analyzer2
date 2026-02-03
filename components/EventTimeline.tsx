
import React from 'react';
import { LifecycleEvent } from '../types';
import { 
  Bluetooth, Radio, Smartphone, Activity, Link, Unplug, 
  Search, ShieldCheck, Layout, Settings, 
  Zap, Clock, ChevronRight
} from 'lucide-react';

interface EventTimelineProps {
  events: LifecycleEvent[];
}

const getEventIcon = (event: LifecycleEvent) => {
  const msg = event.message;
  
  if (event.type === 'SCREEN') return <Layout className="w-4 h-4 text-blue-500" />;
  
  if (msg.includes('🚀')) return <RocketIcon className="w-4 h-4 text-indigo-500 animate-pulse" />;
  if (msg.includes('✅')) return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
  if (msg.includes('👆')) return <Settings className="w-4 h-4 text-orange-500" />;
  if (msg.includes('Bluetooth') || msg.includes('Classic') || msg.includes('BLE') || msg.includes('autoConnect')) {
    if (msg.includes('Success') || msg.includes('Success')) return <Zap className="w-4 h-4 text-yellow-500" />;
    if (msg.includes('Close') || msg.includes('Finish')) return <Unplug className="w-4 h-4 text-slate-400" />;
    return <Bluetooth className="w-4 h-4 text-indigo-400" />;
  }
  if (msg.includes('connectionSuccess')) return <Link className="w-4 h-4 text-emerald-500" />;
  
  return <Activity className="w-4 h-4 text-slate-400" />;
};

const RocketIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-5c1.62-2.2 5-3 5-3" />
    <path d="M12 15v5s3.03-.55 5-2c2.2-1.62 3-5 3-5" />
  </svg>
);

const TimelineCard: React.FC<{ 
  title: string; 
  icon: React.ReactNode; 
  items: LifecycleEvent[]; 
  emptyMessage: string;
  colorClass: string;
}> = ({ title, icon, items, emptyMessage, colorClass }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
    <div className={`px-5 py-3 border-b border-slate-100 flex items-center justify-between ${colorClass}`}>
      <div className="flex items-center gap-2 font-black text-xs uppercase tracking-tight">
        {icon}
        <h3>{title}</h3>
      </div>
      <span className="text-[10px] bg-white/50 px-2 py-0.5 rounded-full font-bold">{items.length} EVENTS</span>
    </div>
    
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
      {items.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs italic">
          <Search className="w-8 h-8 opacity-20 mb-2" />
          {emptyMessage}
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-100 ml-4 pl-8 space-y-8">
          {items.map((item, idx) => (
            <div key={item.id} className="relative group">
              {/* Connector line for screen flow */}
              {item.type === 'SCREEN' && idx < items.length - 1 && (
                <div className="absolute left-[-33px] top-6 w-0.5 h-10 bg-blue-100" />
              )}
              
              {/* Dot */}
              <div className="absolute -left-[41px] top-0.5 bg-white p-1.5 rounded-full border-2 border-slate-200 shadow-sm z-10 transition-transform group-hover:scale-110">
                {getEventIcon(item)}
              </div>
              
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {item.rawTimestamp.split(' ')[1] || item.rawTimestamp}
                  </span>
                  {item.message.includes('✅') && <span className="text-[8px] font-black bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded uppercase">Success</span>}
                </div>
                
                <div className={`text-sm p-4 rounded-xl border-2 transition-all ${
                  item.type === 'SCREEN' ? 'bg-blue-50/30 border-blue-100 text-blue-900 group-hover:bg-blue-50' :
                  item.message.includes('Success') || item.message.includes('✅') ? 'bg-emerald-50/30 border-emerald-100 text-emerald-900 group-hover:bg-emerald-50' :
                  'bg-white border-slate-100 text-slate-700 hover:border-indigo-100'
                }`}>
                  <p className="font-bold leading-snug">
                    {item.message}
                  </p>
                  {item.details && item.details !== item.message && (
                    <div className="mt-2 pt-2 border-t border-slate-200/50 flex items-center gap-1">
                      <ChevronRight className="w-3 h-3 opacity-30" />
                      <p className="text-[10px] font-mono opacity-50 truncate">
                        {item.details}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

export const EventTimeline: React.FC<EventTimelineProps> = ({ events }) => {
  const connectionEvents = events.filter(e => e.type === 'CONNECTION');
  const screenEvents = events.filter(e => e.type === 'SCREEN');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-indigo-600 p-5 rounded-3xl text-white shadow-xl shadow-indigo-100 flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-2xl"><Bluetooth className="w-6 h-6" /></div>
          <div>
            <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">연결 핸드쉐이크</p>
            <p className="text-2xl font-black">{connectionEvents.length}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><Smartphone className="w-6 h-6" /></div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">화면 이동 횟수</p>
            <p className="text-2xl font-black text-slate-800">{screenEvents.length}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl"><ShieldCheck className="w-6 h-6" /></div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">통신 상태</p>
            <p className="text-2xl font-black text-slate-800">
              {connectionEvents.some(e => e.message.includes('connectionSuccess')) ? 'CONNECTED' : 'STANDBY'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <TimelineCard 
          title="연결 및 프로토콜 분석 (BT Flow)"
          icon={<Radio className="w-5 h-5" />}
          items={connectionEvents}
          emptyMessage="연결 관련 이벤트가 발견되지 않았습니다."
          colorClass="bg-indigo-50 text-indigo-700"
        />

        <TimelineCard 
          title="유저 인터페이스 경로 (setScreen)"
          icon={<Smartphone className="w-5 h-5" />}
          items={screenEvents}
          emptyMessage="화면 이동 내역이 발견되지 않았습니다."
          colorClass="bg-blue-50 text-blue-700"
        />
      </div>
    </div>
  );
};
