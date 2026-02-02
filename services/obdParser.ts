
import { ObdDataPoint, ObdMetric } from '../types';

interface PidDefinition {
  name: string;
  unit: string;
  formula: (bytes: number[]) => number;
}

export interface ObdSegment {
  id: number;
  startTime: number;
  endTime: number;
  startLabel: string;
  endLabel: string;
  dataPoints: ObdDataPoint[];
}

const PID_MAP: Record<string, PidDefinition> = {
  '04': { name: '엔진 부하 (Engine Load)', unit: '%', formula: (v) => (v[0] * 100) / 255 },
  '05': { name: '냉각수 온도 (Coolant Temp)', unit: '°C', formula: (v) => v[0] - 40 },
  '0C': { name: '엔진 회전수 (RPM)', unit: 'rpm', formula: (v) => (v[0] * 256 + v[1]) / 4 },
  '0D': { name: '주행 속도 (Vehicle Speed)', unit: 'km/h', formula: (v) => v[0] },
  '0F': { name: '흡기 온도 (Intake Air Temp)', unit: '°C', formula: (v) => v[0] - 40 },
  '10': { name: '흡입 공기량 (MAF Rate)', unit: 'g/s', formula: (v) => (v[0] * 256 + v[1]) / 100 },
  '11': { name: '스로틀 위치 (Throttle Position)', unit: '%', formula: (v) => (v[0] * 100) / 255 },
  '42': { name: '제어 모듈 전압 (Control Voltage)', unit: 'V', formula: (v) => (v[0] * 256 + v[1]) / 1000 },
  '46': { name: '외기 온도 (Ambient Air Temp)', unit: '°C', formula: (v) => v[0] - 40 },
  '49': { name: '가속 페달 위치 (Accel Pedal Pos)', unit: '%', formula: (v) => (v[0] * 100) / 255 },
  '63': { name: '엔진 토크 (Engine Torque)', unit: 'Nm', formula: (v) => v[0] * 256 + v[1] },
  'DPF_TEMP': { name: 'DPF 온도 (DPF Temperature)', unit: '°C', formula: (v) => v[0] * 5 }, 
};

export const parseObdLine = (line: string): ObdDataPoint | null => {
  const regex = /\[(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}:\d{3})\]\/\/.*?, (01\s?[0-9A-F]{2})\s?:\s?([0-9A-F/]+)\/\/.*?, delay : (\d+)ms/i;
  const match = line.match(regex);
  if (!match) return null;

  const timestampStr = match[1];
  const fullPid = match[2].replace(/\s/g, '').toUpperCase();
  const rawData = match[3].toUpperCase();
  const delay = parseInt(match[4]);
  const pid = fullPid.substring(2);

  if (rawData.includes('NODATA') || rawData.includes('ERROR')) return null;

  let ecuId = rawData.substring(0, 3);
  let validLenHex = rawData.substring(3, 5);
  let service = rawData.substring(5, 7);
  let respPid = rawData.substring(7, 9);
  
  if (service !== '41' || respPid !== pid) return null;

  const validByteCount = parseInt(validLenHex, 16);
  const dataByteCount = validByteCount - 2;
  if (dataByteCount <= 0) return null;

  const dataHex = rawData.substring(9, 9 + dataByteCount * 2);
  const bytes: number[] = [];
  for (let i = 0; i < dataHex.length; i += 2) {
    bytes.push(parseInt(dataHex.substring(i, i + 2), 16));
  }

  const def = PID_MAP[pid];
  if (!def) return null;

  const value = def.formula(bytes);
  const timestamp = new Date(timestampStr.replace(' ', 'T').replace(/:(\d{3})$/, '.$1'));

  return {
    timestamp,
    timeStr: timestampStr.split(' ')[1],
    unix: timestamp.getTime(),
    pid,
    name: def.name,
    value: Number(value.toFixed(2)),
    unit: def.unit,
    delay,
    ecuId
  };
};

export const detectSegments = (series: ObdDataPoint[]): ObdSegment[] => {
  if (series.length === 0) return [];

  const segments: ObdSegment[] = [];
  let currentPoints: ObdDataPoint[] = [series[0]];
  const GAP_THRESHOLD_MS = 30000; // 30초 이상 차이 나면 새 세션

  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1];
    const curr = series[i];

    if (curr.unix - prev.unix > GAP_THRESHOLD_MS) {
      segments.push({
        id: segments.length + 1,
        startTime: currentPoints[0].unix,
        endTime: currentPoints[currentPoints.length - 1].unix,
        startLabel: currentPoints[0].timeStr,
        endLabel: currentPoints[currentPoints.length - 1].timeStr,
        dataPoints: currentPoints
      });
      currentPoints = [curr];
    } else {
      currentPoints.push(curr);
    }
  }

  if (currentPoints.length > 0) {
    segments.push({
      id: segments.length + 1,
      startTime: currentPoints[0].unix,
      endTime: currentPoints[currentPoints.length - 1].unix,
      startLabel: currentPoints[0].timeStr,
      endLabel: currentPoints[currentPoints.length - 1].timeStr,
      dataPoints: currentPoints
    });
  }

  return segments;
};

export const aggregateMetrics = (series: ObdDataPoint[]): Record<string, ObdMetric> => {
  const metrics: Record<string, ObdMetric> = {};

  Object.entries(PID_MAP).forEach(([id, def]) => {
    const pidSeries = series.filter(s => s.pid === id);
    metrics[id] = {
      id,
      name: def.name,
      unit: def.unit,
      currentValue: pidSeries.length > 0 ? pidSeries[pidSeries.length - 1].value : 0,
      history: pidSeries.map(s => ({ t: s.unix, v: s.value })),
      isAvailable: pidSeries.length > 0
    };
  });

  return metrics;
};
