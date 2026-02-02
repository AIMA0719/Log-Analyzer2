
import React, { useState } from 'react';
import { ParsedData } from '../types';
import { LogTable } from './LogTable';
import { EventTimeline } from './EventTimeline';
import { SessionInfo } from './SessionInfo';
import { ConnectionStatus } from './ConnectionStatus';
import { BillingList } from './BillingList';
import { ResponseSimulator } from './ResponseSimulator';
import { ObdDashboard } from './ObdDashboard';
import { 
  Smartphone, Car, Clock, AlertTriangle, Layers, FileText, 
  BarChart2, Info, History, CreditCard, ChevronDown, 
  FileCode, Gauge, HeartPulse, MessageSquare 
} from 'lucide-react';

interface DashboardProps {
  data: ParsedData;
  onReset: () => void;
  onFileSelect: (fileName: string) => void;
}

type TabType = 'OVERVIEW' | 'LOGS' | 'TIMELINE' | 'BILLING' | 'SUPPORT' | 'SIMULATOR' | 'DETAILS';

export const Dashboard: React.FC<DashboardProps> = ({ data, onReset, onFileSelect }) => {
  const { metadata, logs, lifecycleEvents, billingLogs, diagnosis, fileList, obdSeries, metrics } = data;
  const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');
  
  const errorCount = logs.filter(l => l.isError).length;
  
  let durationStr = 'N/A';
  if (metadata.startTime && metadata.endTime) {
    const diffMs = metadata.endTime.getTime() - metadata.startTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    durationStr = `${diffMins}분 ${diffSecs}초`;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-2">
            <span className="bg-indigo-600 text-white p-1 rounded text-lg">INF</span> Infocar 로그 분석기
          </h1>
          
          <div className="flex items-center gap-3">
             <div className="relative group">
                <div className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 transition-colors px-3 py-1.5 rounded-md cursor-pointer border border-slate-200">
                    <FileText className="w-4 h-4 text-slate-600" />
                    <select 
                        className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer appearance-none pr-6 outline-none"
                        value={metadata.fileName}
                        onChange={(e) => onFileSelect(e.target.value)}
                    >
                        {fileList && fileList.length > 0 ? (
                             fileList.map((f) => (
                                <option key={f.fileName} value={f.fileName}>
                                    {f.fileName}
                                </option>
                            ))
                        ) : (
                            <option value={metadata.fileName}>{metadata.fileName}</option>
                        )}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 pointer-events-none" />
                </div>
             </div>
          </div>
        </div>

        <div className="flex gap-2">
            <button 
            onClick={onReset}
            className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-red-600 transition-colors"
            >
            새 파일 열기
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6 overflow-x-auto">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`${activeTab === 'OVERVIEW' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <Gauge className="w-4 h-4" /> 주행 대시보드
            </button>
            <button
              onClick={() => setActiveTab('SUPPORT')}
              className={`${activeTab === 'SUPPORT' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <HeartPulse className="w-4 h-4" /> 진단 및 CS 지원
            </button>
            <button
              onClick={() => setActiveTab('LOGS')}
              className={`${activeTab === 'LOGS' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <BarChart2 className="w-4 h-4" /> 상세 로그
            </button>
            <button
              onClick={() => setActiveTab('TIMELINE')}
              className={`${activeTab === 'TIMELINE' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <History className="w-4 h-4" /> 타임라인
            </button>
            <button
              onClick={() => setActiveTab('BILLING')}
              className={`${activeTab === 'BILLING' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <CreditCard className="w-4 h-4" /> 결제 로그
            </button>
            <button
              onClick={() => setActiveTab('DETAILS')}
              className={`${activeTab === 'DETAILS' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <Info className="w-4 h-4" /> 세션 정보
            </button>
            <button
              onClick={() => setActiveTab('SIMULATOR')}
              className={`${activeTab === 'SIMULATOR' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <FileCode className="w-4 h-4" /> 시뮬레이터
            </button>
          </nav>
      </div>

      <div className="space-y-6">
        {activeTab === 'OVERVIEW' && (
            <>
                {obdSeries.length > 0 ? (
                    <ObdDashboard series={obdSeries} metrics={metrics} />
                ) : (
                    <div className="bg-white p-12 text-center rounded-xl border border-dashed border-slate-300">
                        <Gauge className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <h3 className="text-slate-900 font-bold text-lg">OBD 데이터 스트림 없음</h3>
                        <p className="text-slate-500 text-sm mt-2">이 로그 파일에는 파싱 가능한 OBD-II 실시간 데이터가 포함되어 있지 않습니다.</p>
                    </div>
                )}
            </>
        )}
        {activeTab === 'SUPPORT' && (
             <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <ConnectionStatus diagnosis={diagnosis} metadata={metadata} fullData={data} />
             </div>
        )}
        {activeTab === 'LOGS' && <LogTable logs={logs} />}
        {activeTab === 'TIMELINE' && <EventTimeline events={lifecycleEvents} />}
        {activeTab === 'BILLING' && <BillingList entries={billingLogs} />}
        {activeTab === 'DETAILS' && <SessionInfo metadata={metadata} />}
        {activeTab === 'SIMULATOR' && (
            <ResponseSimulator logs={logs} startTime={metadata.startTime} endTime={metadata.endTime} />
        )}
      </div>
    </div>
  );
};
