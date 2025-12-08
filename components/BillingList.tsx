
import React from 'react';
import { BillingEntry } from '../types';
import { CreditCard, AlertCircle, CheckCircle } from 'lucide-react';

interface BillingListProps {
  entries: BillingEntry[];
}

export const BillingList: React.FC<BillingListProps> = ({ entries }) => {
  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center shadow-sm">
        <div className="inline-flex p-3 bg-slate-100 rounded-full mb-4">
            <CreditCard className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-slate-900 font-medium">결제 내역이 없습니다</h3>
        <p className="text-slate-500 text-sm mt-1">
          ZIP 파일 내에 'purchase_log_' 또는 'billing_' 파일이 포함되어 있는지 확인해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          <CreditCard className="w-4 h-4" /> 결제/구독 로그
        </h3>
        <span className="text-xs text-slate-500">{entries.length}건</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 w-48 whitespace-nowrap">일시</th>
              <th className="px-6 py-3 min-w-[100px] whitespace-nowrap">상태</th>
              <th className="px-6 py-3">로그 내용</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr 
                key={entry.id} 
                className={`border-b border-slate-100 hover:bg-slate-50 ${entry.isError ? 'bg-red-50' : ''}`}
              >
                <td className="px-6 py-3 font-mono text-slate-500 whitespace-nowrap">
                  {entry.timestamp.toLocaleString()}
                </td>
                <td className="px-6 py-3 whitespace-nowrap">
                  {entry.isError ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 whitespace-nowrap">
                      <AlertCircle className="w-3 h-3 mr-1" /> 실패
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 whitespace-nowrap">
                      <CheckCircle className="w-3 h-3 mr-1" /> 성공
                    </span>
                  )}
                </td>
                <td className={`px-6 py-3 font-mono ${entry.isError ? 'text-red-700' : 'text-slate-700'}`}>
                  {entry.message}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};