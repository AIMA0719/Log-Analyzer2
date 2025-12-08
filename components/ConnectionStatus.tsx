
import React from 'react';
import { ConnectionDiagnosis } from '../types';
import { Stethoscope } from 'lucide-react';

interface ConnectionStatusProps {
  diagnosis: ConnectionDiagnosis;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ diagnosis }) => {
  return (
    <div className="bg-white p-6 rounded-lg border border-slate-200 mb-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="mt-1">
            <Stethoscope className="w-8 h-8 text-slate-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            연결 진단 리포트
          </h3>
          <p className="text-slate-700 font-medium mb-3">{diagnosis.summary}</p>

          {diagnosis.issues.length > 0 ? (
            <div className="bg-slate-50 rounded-md p-4 border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 mb-3 uppercase">감지된 이슈 사항</p>
              <ul className="space-y-2">
                {diagnosis.issues.map((issue, idx) => (
                  <li key={idx} className="flex items-start text-sm text-slate-700 gap-2">
                    <span className="mt-2 w-1.5 h-1.5 bg-slate-400 rounded-full shrink-0" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-sm text-slate-500">
                특이 사항이 발견되지 않았습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};