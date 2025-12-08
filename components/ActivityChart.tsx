import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { LogEntry, LogCategory } from '../types';

interface ActivityChartProps {
  logs: LogEntry[];
}

export const ActivityChart: React.FC<ActivityChartProps> = ({ logs }) => {
  const chartData = useMemo(() => {
    const groups: Record<string, { time: string; count: number; error: number; obd: number }> = {};
    
    // Group logs by minute
    logs.forEach(log => {
      // Create a key like "10:45"
      const date = log.timestamp;
      const key = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      
      if (!groups[key]) {
        groups[key] = { time: key, count: 0, error: 0, obd: 0 };
      }
      
      groups[key].count++;
      if (log.category === LogCategory.ERROR) groups[key].error++;
      if (log.category === LogCategory.OBD) groups[key].obd++;
    });

    return Object.values(groups).sort((a, b) => a.time.localeCompare(b.time));
  }, [logs]);

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
      <h3 className="text-sm font-semibold text-slate-500 mb-4 uppercase tracking-wider">로그 활동량 (분 단위)</h3>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey="time" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              tick={{ fill: '#64748b' }} 
              minTickGap={30}
            />
            <YAxis 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              tick={{ fill: '#64748b' }} 
            />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              cursor={{ fill: '#f1f5f9' }}
            />
            <Bar dataKey="count" fill="#94a3b8" radius={[4, 4, 0, 0]} name="전체 로그" stackId="a" />
            <Bar dataKey="obd" fill="#3b82f6" radius={[0, 0, 0, 0]} name="OBD 명령" stackId="a" />
            <Bar dataKey="error" fill="#ef4444" radius={[4, 4, 0, 0]} name="오류" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};