
import React, { useState } from 'react';
import { ParsedData } from '../types';
// import { ActivityChart } from './ActivityChart';
import { LogTable } from './LogTable';
import { EventTimeline } from './EventTimeline';
import { SessionInfo } from './SessionInfo';
import { ConnectionStatus } from './ConnectionStatus';
import { BillingList } from './BillingList';
import { ResponseSimulator } from './ResponseSimulator';
import { Smartphone, Car, Clock, AlertTriangle, Layers, FileText, BarChart2, Info, History, CreditCard, ChevronDown, FileCode } from 'lucide-react';

interface DashboardProps {
  data: ParsedData;
  onReset: () => void;
  onFileSelect: (fileName: string) => void;
}

type TabType = 'OVERVIEW' | 'TIMELINE' | 'BILLING' | 'DETAILS' | 'SIMULATOR';

export const Dashboard: React.FC<DashboardProps> = ({ data, onReset, onFileSelect }) => {
  const { metadata, logs, lifecycleEvents, billingLogs, diagnosis, fileList } = data;
  const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');
  
  const errorCount = logs.filter(l => l.isError).length;
  
  // Calculate duration
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
            <span className="bg-blue-600 text-white p-1 rounded text-lg">INF</span> Infocar 로그 분석기
          </h1>
          
          {/* File Selector */}
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
                                    {f.fileName} {f.fileName === metadata.fileName ? '(현재)' : ''}
                                </option>
                            ))
                        ) : (
                            <option value={metadata.fileName}>{metadata.fileName}</option>
                        )}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 pointer-events-none" />
                </div>
             </div>
             <span className="text-xs text-slate-400">
                {fileList && fileList.length > 1 ? `${fileList.length}개의 파일 중 선택됨` : '단일 파일'}
             </span>
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

      {/* Summary Cards (Always visible) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Smartphone className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase">기기 정보</h3>
            <p className="font-medium text-slate-900 truncate max-w-[140px]" title={metadata.model}>{metadata.model}</p>
            <p className="text-xs text-slate-500">{metadata.userOS}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <Car className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase">차량 정보</h3>
            <p className="font-medium text-slate-900 truncate max-w-[140px]" title={metadata.carName}>{metadata.carName || '감지 안됨'}</p>
            <p className="text-xs text-slate-500">진단 대상 차량</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="p-2 bg-purple-50 rounded-lg">
            <Layers className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase">세션 통계</h3>
            <p className="font-medium text-slate-900">{metadata.logCount.toLocaleString()} 로그</p>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {durationStr}
            </p>
          </div>
        </div>

         <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-start gap-4">
          <div className={`p-2 rounded-lg ${errorCount > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
            <AlertTriangle className={`w-6 h-6 ${errorCount > 0 ? 'text-red-600' : 'text-slate-400'}`} />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase">예외 발생</h3>
            <p className={`font-medium ${errorCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>{errorCount} 오류</p>
            <p className="text-xs text-slate-500">세션 내 감지됨</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6 overflow-x-auto">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`${
                activeTab === 'OVERVIEW'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <BarChart2 className="w-4 h-4" />
              대시보드 & 로그
            </button>
            <button
              onClick={() => setActiveTab('TIMELINE')}
              className={`${
                activeTab === 'TIMELINE'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <History className="w-4 h-4" />
              타임라인
            </button>
            <button
              onClick={() => setActiveTab('BILLING')}
              className={`${
                activeTab === 'BILLING'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <CreditCard className="w-4 h-4" />
              결제 내역 ({billingLogs.length})
            </button>
             <button
              onClick={() => setActiveTab('DETAILS')}
              className={`${
                activeTab === 'DETAILS'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <Info className="w-4 h-4" />
              세션 상세
            </button>
            <button
              onClick={() => setActiveTab('SIMULATOR')}
              className={`${
                activeTab === 'SIMULATOR'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <FileCode className="w-4 h-4" />
              OBD 응답 시뮬레이션
            </button>
          </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'OVERVIEW' && (
            <>
                {/* Connection Diagnosis Widget */}
                {/* Pass 'data' prop to access logs in ConnectionStatus for AI */}
                <ConnectionStatus diagnosis={diagnosis} metadata={metadata} fullData={data} />
                {/* <ActivityChart logs={logs} /> */}
                <LogTable logs={logs} />
            </>
        )}
        {activeTab === 'TIMELINE' && (
             <EventTimeline events={lifecycleEvents} />
        )}
        {activeTab === 'BILLING' && (
            <BillingList entries={billingLogs} />
        )}
        {activeTab === 'DETAILS' && (
            <SessionInfo metadata={metadata} />
        )}
        {activeTab === 'SIMULATOR' && (
            <ResponseSimulator 
                logs={logs} 
                startTime={metadata.startTime} 
                endTime={metadata.endTime} 
            />
        )}
      </div>
    </div>
  );
};