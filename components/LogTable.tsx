import React, { useState, useMemo } from 'react';
import { LogEntry, LogCategory } from '../types';
import { Filter, Search, AlertCircle, Radio, Bluetooth, Smartphone, Terminal, Layers } from 'lucide-react';
import { FixedSizeList as List } from 'react-window';
import type { ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

interface LogTableProps {
  logs: LogEntry[];
}

type FilterType = LogCategory | 'ALL';

export const LogTable: React.FC<LogTableProps> = ({ logs }) => {
  const [filterText, setFilterText] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');

  const filteredLogs = useMemo(() => {
    const lowerFilter = filterText.toLowerCase();
    return logs.filter(log => {
      // 1. Category Filter (Exclusive)
      if (activeFilter !== 'ALL' && log.category !== activeFilter) return false;

      // 2. Text Search
      if (!lowerFilter) return true;
      return (
        log.message.toLowerCase().includes(lowerFilter) ||
        log.rawTimestamp.includes(lowerFilter) ||
        log.category.toLowerCase().includes(lowerFilter)
      );
    });
  }, [logs, filterText, activeFilter]);

  const getCategoryBadge = (cat: LogCategory) => {
    switch (cat) {
      case LogCategory.ERROR:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-800 w-full justify-center"><AlertCircle className="w-3 h-3 mr-1"/> 오류</span>;
      case LogCategory.OBD:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 w-full justify-center"><Radio className="w-3 h-3 mr-1"/> OBD</span>;
      case LogCategory.BLUETOOTH:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-800 w-full justify-center"><Bluetooth className="w-3 h-3 mr-1"/> BLE</span>;
      case LogCategory.UI:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800 w-full justify-center"><Smartphone className="w-3 h-3 mr-1"/> UI</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-800 w-full justify-center"><Terminal className="w-3 h-3 mr-1"/> 정보</span>;
    }
  };

  const categories: FilterType[] = ['ALL', ...Object.values(LogCategory)];

  // Row Component for react-window
  const Row = ({ index, style, data }: ListChildComponentProps<LogEntry[]>) => {
    const log = data[index];
    return (
      <div 
        style={style} 
        className={`grid grid-cols-12 gap-2 px-4 border-b border-slate-100 hover:bg-slate-50 font-mono transition-colors items-center ${
          log.isError ? 'bg-red-50 hover:bg-red-100' : ''
        }`}
      >
        <div className="col-span-2 text-slate-500 text-xs truncate" title={log.rawTimestamp}>
          {log.rawTimestamp.split(' ')[1] || log.rawTimestamp}
        </div>
        <div className="col-span-2 md:col-span-1">
          {getCategoryBadge(log.category)}
        </div>
        <div className={`col-span-8 md:col-span-9 text-xs truncate ${log.isError ? 'text-red-700' : 'text-slate-700'}`} title={log.message}>
          {log.category === LogCategory.OBD ? (
            <span className="font-mono text-blue-700 font-medium">{log.message}</span>
          ) : (
            log.message
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow-sm border border-slate-200 mt-6">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50 rounded-t-lg">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          <span className="text-sm font-semibold text-slate-500 mr-2 flex items-center gap-1 shrink-0">
            <Filter className="w-4 h-4" /> 필터:
          </span>
          <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
            {categories.map((cat) => {
              const isActive = activeFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {cat === 'ALL' ? '전체' : cat}
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="로그 내용 검색..." 
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>
      </div>

      {/* Header */}
      <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
        <div className="col-span-2">시간</div>
        <div className="col-span-2 md:col-span-1 text-center">구분</div>
        <div className="col-span-8 md:col-span-9">메시지</div>
      </div>

      {/* Virtualized List */}
      <div className="flex-1 min-h-0 w-full">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Layers className="w-8 h-8 mb-2 opacity-50" />
            <p>조건에 맞는 로그가 없습니다.</p>
          </div>
        ) : (
          <AutoSizer>
            {({ height, width }: { height: number; width: number }) => (
              <List
                height={height}
                width={width}
                itemCount={filteredLogs.length}
                itemSize={35}
                itemData={filteredLogs}
                className="custom-scrollbar"
              >
                {Row}
              </List>
            )}
          </AutoSizer>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-2 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 text-right">
        전체 {logs.length.toLocaleString()}개 중 {filteredLogs.length.toLocaleString()}개 표시
      </div>
    </div>
  );
};