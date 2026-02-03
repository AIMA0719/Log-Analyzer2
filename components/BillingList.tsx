
import React, { useState } from 'react';
import { BillingEntry, BillingFlow, StorageStatus } from '../types';
import { 
  CreditCard, AlertCircle, CheckCircle, ShoppingBag, 
  Fingerprint, Info, Database, Code, ShieldAlert,
  ArrowRight, Clock, FileText, ChevronDown, ChevronUp
} from 'lucide-react';

interface BillingListProps {
  entries: BillingEntry[];
  flows: BillingFlow[];
  storage?: StorageStatus;
}

const JsonViewer: React.FC<{ data: string }> = ({ data }) => {
  const [isOpen, setIsOpen] = useState(false);
  let formatted = data;
  try { formatted = JSON.stringify(JSON.parse(data), null, 2); } catch {}

  return (
    <div className="mt-2">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 text-slate-300 text-[10px] font-bold hover:bg-slate-700 transition-colors"
      >
        <Code className="w-3 h-3" /> {isOpen ? 'JSON 닫기' : 'JSON 상세 보기'}
      </button>
      {isOpen && (
        <pre className="mt-2 p-3 bg-slate-900 text-emerald-400 text-[10px] font-mono rounded border border-slate-700 overflow-x-auto whitespace-pre-wrap max-h-60 custom-scrollbar">
          {formatted}
        </pre>
      )}
    </div>
  );
};

const StepIcon: React.FC<{ status: 'done' | 'active' | 'pending' | 'fail' }> = ({ status }) => {
  if (status === 'done') return <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white"><CheckCircle className="w-3.5 h-3.5" /></div>;
  if (status === 'fail') return <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white"><AlertCircle className="w-3.5 h-3.5" /></div>;
  if (status === 'active') return <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white animate-pulse"><Clock className="w-3.5 h-3.5" /></div>;
  return <div className="w-5 h-5 rounded-full bg-slate-200" />;
};

const TransactionFlowCard: React.FC<{ flow: BillingFlow }> = ({ flow }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const startTimeStr = flow.startTime.toLocaleTimeString();

  return (
    <div className={`bg-white rounded-2xl border transition-all ${isExpanded ? 'shadow-md border-indigo-200' : 'border-slate-200 shadow-sm'}`}>
      <div className="p-5 flex flex-col md:flex-row md:items-center gap-6">
        {/* Status & Time */}
        <div className="shrink-0 flex flex-col items-center justify-center md:border-r border-slate-100 pr-6">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-1 ${
            flow.finalStatus === 'SUCCESS' ? 'bg-emerald-100 text-emerald-600' :
            flow.finalStatus === 'FAILURE' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'
          }`}>
            <ShoppingBag className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-400">{startTimeStr}</span>
        </div>

        {/* Stepper */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
             <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
               flow.finalStatus === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' :
               flow.finalStatus === 'FAILURE' ? 'bg-red-50 text-red-700' : 'bg-indigo-50 text-indigo-700'
             }`}>
               {flow.finalStatus} TRANSACTION
             </span>
             <span className="text-xs font-bold text-slate-700">Google Play 결제 핸드쉐이크</span>
          </div>
          
          <div className="flex items-center gap-0 w-full max-w-md">
            <div className="flex flex-col items-center gap-1 flex-1">
              <StepIcon status={flow.hasPurchase ? 'done' : 'pending'} />
              <span className="text-[9px] font-bold text-slate-400">PURCHASE</span>
            </div>
            <div className={`h-0.5 flex-1 ${flow.hasSignature ? 'bg-emerald-500' : 'bg-slate-100'}`} />
            <div className="flex flex-col items-center gap-1 flex-1">
              <StepIcon status={flow.hasSignature ? 'done' : (flow.finalStatus === 'FAILURE' ? 'fail' : 'pending')} />
              <span className="text-[9px] font-bold text-slate-400">SIGNATURE</span>
            </div>
            <div className={`h-0.5 flex-1 ${flow.hasReceipt ? 'bg-emerald-500' : 'bg-slate-100'}`} />
            <div className="flex flex-col items-center gap-1 flex-1">
              <StepIcon status={flow.hasReceipt ? 'done' : (flow.finalStatus === 'FAILURE' ? 'fail' : 'pending')} />
              <span className="text-[9px] font-bold text-slate-400">VERIFY</span>
            </div>
          </div>
        </div>

        {/* Toggle */}
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors"
        >
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="px-5 pb-5 border-t border-slate-50 pt-5 space-y-4 animate-in slide-in-from-top-2">
          {flow.steps.map((step, idx) => (
            <div key={idx} className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{step.type}</span>
                <span className="text-[10px] font-mono text-slate-400">{step.rawTimestamp.split(' ')[1]}</span>
              </div>
              <p className="text-xs text-slate-700 font-bold mb-2">{step.message}</p>
              {step.jsonData && <JsonViewer data={step.jsonData} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const BillingList: React.FC<BillingListProps> = ({ entries, flows, storage }) => {
  const nonFlowEntries = entries.filter(e => ['EXPIRY', 'STORAGE', 'INFO'].includes(e.type));

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* 1. Storage Diagnosis */}
      {storage && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 flex flex-col md:flex-row items-center gap-6">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl"><Database className="w-6 h-6" /></div>
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><p className="text-[10px] font-bold text-slate-400 uppercase">여유 공간</p><p className="font-mono font-black text-slate-800">{storage.availableBytes}</p></div>
            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Settings Size</p><p className="font-mono font-black text-slate-800">{storage.settingsSize}</p></div>
            <div className="flex gap-1 items-center">
              {storage.readable && <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[9px] font-black">READ</span>}
              {storage.writable && <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[9px] font-black">WRITE</span>}
            </div>
            <div className="flex items-center">
              {!storage.exists ? <span className="text-red-500 text-[10px] font-bold flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> SETTING.XML MISSING</span> : <span className="text-emerald-500 text-[10px] font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> CONFIG OK</span>}
            </div>
          </div>
        </div>
      )}

      {/* 2. Grouped Transaction Flows */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2">
          <ShoppingBag className="w-3 h-3" /> Transaction Handshakes
        </h3>
        {flows.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300 text-slate-400 text-sm italic">
            분석된 결제 흐름이 없습니다.
          </div>
        ) : (
          flows.map(flow => <TransactionFlowCard key={flow.id} flow={flow} />)
        )}
      </div>

      {/* 3. Other Events (Expiry, etc) */}
      {nonFlowEntries.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2">
            <Info className="w-3 h-3" /> Subscription & System Events
          </h3>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-50">
            {nonFlowEntries.map((entry, idx) => (
              <div key={idx} className="p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                <div className={`p-2 rounded-xl ${entry.type === 'EXPIRY' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                  {entry.type === 'EXPIRY' ? <ShieldAlert className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black text-slate-400">{entry.type}</span>
                    <span className="text-[10px] font-mono text-slate-400">{entry.rawTimestamp.split(' ')[1]}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-700">{entry.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
