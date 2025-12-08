import React from 'react';
import { LifecycleEvent } from '../types';
import { Smartphone, Link, Unplug, Activity } from 'lucide-react';

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

  const getIcon = (type: LifecycleEvent['type'], message: string) => {
    if (type === 'SCREEN') return <Smartphone className="w-4 h-4 text-blue-500" />;
    if (type === 'CONNECTION') {
      if (message.includes('종료') || message.includes('실패')) return <Unplug className="w-4 h-4 text-red-500" />;
      return <Link className="w-4 h-4 text-green-500" />;
    }
    return <Activity className="w-4 h-4 text-slate-500" />;
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 flex items-center justify-between">
            <span>주요 타임라인 (연결 & 화면)</span>
            <span className="text-xs font-normal text-slate-500">총 {events.length}개 이벤트</span>
        </div>
      <div className="max-h-[600px] overflow-y-auto custom-scrollbar p-4">
        <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
          {events.map((evt) => (
            <div key={evt.id} className="relative pl-6">
              <div className="absolute -left-[9px] top-0 bg-white p-1 rounded-full border border-slate-200">
                {getIcon(evt.type, evt.message)}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
                <span className="text-xs font-mono text-slate-500 w-32 shrink-0">
                  {evt.rawTimestamp.split(' ')[1] || evt.rawTimestamp}
                </span>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    evt.type === 'CONNECTION' ? 'text-slate-900' : 'text-slate-700'
                  }`}>
                    {evt.message}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono break-all">
                    {evt.details}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};