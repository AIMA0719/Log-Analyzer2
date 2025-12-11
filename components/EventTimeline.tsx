
import React, { useState } from 'react';
import { LifecycleEvent } from '../types';
import { Smartphone, Link, Unplug, Activity, Radio, Filter, CheckCircle2 } from 'lucide-react';

interface EventTimelineProps {
  events: LifecycleEvent[];
}

export const EventTimeline: React.FC<EventTimelineProps> = ({ events }) => {
  const [showAllProtocols, setShowAllProtocols] = useState(false);

  if (events.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        감지된 주요 이벤트(화면 전환, 연결 등)가 없습니다.
      </div>
    );
  }

  const connectionEvents = events.filter(e => e.type === 'CONNECTION');
  const screenEvents = events.filter(e => e.type === 'SCREEN' || e.type === 'APP_STATE');

  // Filter connection events based on state
  const filteredConnectionEvents = connectionEvents.filter(evt => {
      if (showAllProtocols) return true;
      
      // Always show important statuses
      if (evt.message.includes('성공') || evt.message.includes('실패') || evt.message.includes('종료')) return true;
      if (evt.message.includes('초기화')) return true;

      // Show Key Protocols (ATSP, ATDPN) and Responses (OK)
      if (evt.message.includes('ATSP')) return true;
      if (evt.message.includes('ATDPN')) return true;
      if (evt.message.includes('프로토콜 응답')) return true; // OK
      if (evt.message.includes('프로토콜 감지')) return true; // AUTO, ISO...

      // Hide other generic AT commands by default (ATZ, ATE0, etc.)
      return false;
  });

  const getIcon = (type: LifecycleEvent['type'], message: string) => {
    if (type === 'SCREEN') return <Smartphone className="w-4 h-4 text-blue-500" />;
    if (type === 'APP_STATE') return <Activity className="w-4 h-4 text-purple-500" />;
    
    if (type === 'CONNECTION') {
      if (message.includes('종료') || message.includes('실패')) return <Unplug className="w-4 h-4 text-red-500" />;
      if (message.includes('응답')) return <CheckCircle2 className="w-4 h-4 text-teal-500" />; // Response
      if (message.includes('프로토콜')) return <Radio className="w-4 h-4 text-orange-500" />; // Request
      return <Link className="w-4 h-4 text-green-500" />;
    }
    return <Activity className="w-4 h-4 text-slate-500" />;
  };

  const TimelineList = ({ 
      title, 
      items, 
      emptyMessage, 
      hasFilter, 
      onToggleFilter, 
      isFilterActive 
  }: { 
      title: string, 
      items: LifecycleEvent[], 
      emptyMessage: string, 
      hasFilter?: boolean, 
      onToggleFilter?: () => void, 
      isFilterActive?: boolean 
  }) => (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
      <div className="p-4 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
            <span>{title}</span>
        </div>
        <div className="flex items-center gap-3">
             {hasFilter && (
                <button 
                    onClick={onToggleFilter}
                    className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${isFilterActive ? 'bg-blue-100 text-blue-600' : 'text-slate-400'}`}
                    title={isFilterActive ? "전체 프로토콜 보기" : "주요 프로토콜만 보기"}
                >
                    <Filter className="w-4 h-4" />
                </button>
            )}
            <span className="text-xs font-normal text-slate-500">{items.length}개</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-20">
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
                    {evt.type === 'CONNECTION' && (evt.message.includes('프로토콜')) ? (
                        <div className={`mt-1 border rounded px-2 py-1.5 text-xs font-mono break-all ${
                            evt.message.includes('응답') 
                            ? 'bg-teal-50 border-teal-100 text-teal-800' // Response Style
                            : 'bg-orange-50 border-orange-100 text-orange-800' // Request Style
                        }`}>
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
      <TimelineList 
        title="🔌 연결 및 프로토콜 이력" 
        items={filteredConnectionEvents} 
        emptyMessage="연결 관련 이벤트가 없습니다."
        hasFilter={true}
        isFilterActive={showAllProtocols}
        onToggleFilter={() => setShowAllProtocols(!showAllProtocols)}
      />
      <TimelineList 
        title="📱 화면 및 앱 상태 이력" 
        items={screenEvents} 
        emptyMessage="화면 이동 내역이 없습니다." 
      />
    </div>
  );
};
