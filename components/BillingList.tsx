
import React from 'react';
import { BillingEntry } from '../types';
import { CreditCard, AlertCircle, CheckCircle, ShoppingBag, Fingerprint, Info } from 'lucide-react';

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
        <h3 className="text-slate-900 font-medium">결제 관련 활동이 없습니다</h3>
        <p className="text-slate-500 text-sm mt-1">
          로그 파일 내에 'purchase_log_' 또는 'billing_' 섹션의 유효한 결제 이벤트가 없습니다.
        </p>
      </div>
    );
  }

  const successCount = entries.filter(e => e.status === 'SUCCESS').length;
  const failureCount = entries.filter(e => e.status === 'FAILURE').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">총 시도</p>
                <p className="text-xl font-bold text-slate-900">{entries.length}건</p>
            </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
                <CheckCircle className="w-6 h-6" />
            </div>
            <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">성공</p>
                <p className="text-xl font-bold text-slate-900">{successCount}건</p>
            </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-lg text-red-600">
                <AlertCircle className="w-6 h-6" />
            </div>
            <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">실패/오류</p>
                <p className="text-xl font-bold text-slate-900">{failureCount}건</p>
            </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-700 flex items-center gap-2">
            <Fingerprint className="w-4 h-4" /> 분석된 결제 트랜잭션 (Extracted Transactions)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 w-40">OS / 일시</th>
                <th className="px-6 py-3">주문 ID / 상품 정보</th>
                <th className="px-6 py-3 w-32">상태</th>
                <th className="px-6 py-3">메시지</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((entry) => (
                <tr 
                  key={entry.id} 
                  className={`hover:bg-slate-50 transition-colors ${entry.status === 'FAILURE' ? 'bg-red-50/30' : ''}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded w-fit mb-1 ${
                            entry.os === 'ANDROID' ? 'bg-green-100 text-green-700' : 'bg-slate-800 text-white'
                        }`}>
                            {entry.os}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                            {entry.rawTimestamp.split(' ')[1] || entry.rawTimestamp}
                        </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                        {entry.orderId ? (
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-mono">
                                    {entry.orderId}
                                </span>
                            </div>
                        ) : entry.productId ? (
                             <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-800">{entry.productName || 'Unknown Product'}</span>
                                <span className="text-[10px] font-mono text-slate-400">{entry.productId}</span>
                                {entry.price && <span className="text-xs font-bold text-indigo-600 mt-1">{entry.price}</span>}
                             </div>
                        ) : (
                            <span className="text-xs text-slate-400 italic">No IDs Found</span>
                        )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {entry.status === 'SUCCESS' ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                        <CheckCircle className="w-3 h-3 mr-1" /> 성공
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                        <AlertCircle className="w-3 h-3 mr-1" /> 실패
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600">
                    <div className="flex flex-col">
                        <span className="font-medium text-slate-800">{entry.message}</span>
                        {entry.rawLog && (
                            <details className="mt-1">
                                <summary className="cursor-pointer text-indigo-500 hover:underline">원본 로그 확인</summary>
                                <div className="mt-2 p-2 bg-slate-100 rounded text-[10px] font-mono break-all whitespace-pre-wrap max-w-md">
                                    {entry.rawLog}
                                </div>
                            </details>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex gap-3 items-start">
         <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
         <div className="text-xs text-indigo-700 leading-relaxed">
            <p className="font-bold mb-1">결제 로그 분석 안내</p>
            <p>이 화면은 영수증 원문(Base64)과 같은 불필요한 데이터를 제외하고, 실제 **상품 식별자(Product ID)**와 **주문 번호(Order ID)**, 그리고 **검증 결과**만을 추출하여 보여줍니다. iOS의 경우 `productsRequest`와 `vertifyReceipt` 이벤트를 대조하여 분석됩니다.</p>
         </div>
      </div>
    </div>
  );
};
