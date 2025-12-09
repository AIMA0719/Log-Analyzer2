
import React from 'react';
import { LifecycleEvent } from '../types';
import { Smartphone, Link, Unplug, Activity, Radio } from 'lucide-react';

interface EventTimelineProps {
  events: LifecycleEvent[];
}

export const EventTimeline: React.FC<EventTimelineProps> = ({ events }) => {
  if (events.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        감지된 주요 이벤트(화면 전환, 연결 등)가 없습니다.
      </div>
    );
  }

  const connectionEvents = events.filter(e => e.type === 'CONNECTION');
  const screenEvents = events.filter(e => e.type === 'SCREEN' || e.type === 'APP_STATE');

  const getIcon = (type: LifecycleEvent['type'], message: string) => {
    if (type === 'SCREEN') return <Smartphone className="w-4 h-4 text-blue-500" />;
    if (type === 'APP_STATE') return <Activity className="w-4 h-4 text-purple-500" />;
    
    if (type === 'CONNECTION') {
      if (message.includes('종료') || message.includes('실패')) return <Unplug className="w-4 h-4 text-red-500" />;
      if (message.includes('프로토콜')) return <Radio className="w-4 h-4 text-orange-500" />;
      return <Link className="w-4 h-4 text-green-500" />;
    }
    return <Activity className="w-4 h-4 text-slate-500" />;
  };

  const TimelineList = ({ title, items, emptyMessage }: { title: string, items: LifecycleEvent[], emptyMessage: string }) => (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
      <div className="p-4 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 flex items-center justify-between shrink-0">
        <span>{title}</span>
        <span className="text-xs font-normal text-slate-500">{items.length}개</span>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {items.length === 0 ? (
          <div className="text-center text-slate-400 text-sm mt-10">{emptyMessage}</div>
        ) : (
          <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
            {items.map((evt) => (
              <div key={evt.id} className="relative pl-6">
                <div className="absolute -left-[9px] top-0 bg-white p-1 rounded-full border border-slate-200">
                  {getIcon(evt.type, evt.message)}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-mono text-slate-400">
                    {evt.rawTimestamp.split(' ')[1] || evt.rawTimestamp}
                  </span>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      evt.type === 'CONNECTION' ? 'text-slate-900' : 'text-slate-700'
                    }`}>
                      {evt.message}
                    </p>
                    
                    {/* Special styling for protocol details */}
                    {evt.type === 'CONNECTION' && evt.message.includes('프로토콜') ? (
                        <div className="mt-1 bg-orange-50 border border-orange-100 rounded px-2 py-1.5 text-xs font-mono text-orange-800 break-all">
                             {evt.details}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-400 mt-0.5 font-mono break-all line-clamp-2 hover:line-clamp-none">
                            {evt.details}
                        </p>
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <TimelineList 
        title="🔌 연결 및 프로토콜 이력" 
        items={connectionEvents} 
        emptyMessage="연결 관련 이벤트가 없습니다." 
      />
      <TimelineList 
        title="📱 화면 및 앱 상태 이력" 
        items={screenEvents} 
        emptyMessage="화면 이동 내역이 없습니다." 
      />
    </div>
  );
};
