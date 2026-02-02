
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
  '04': { name: '엔진 부하', unit: '%', formula: (v) => (v[0] * 100) / 255 },
  '05': { name: '냉각수 온도', unit: '°C', formula: (v) => v[0] - 40 },
  '0C': { name: '엔진 회전수', unit: 'rpm', formula: (v) => (v[0] * 256 + v[1]) / 4 },
  '0D': { name: '주행 속도', unit: 'km/h', formula: (v) => v[0] },
  '0F': { name: '흡기 온도', unit: '°C', formula: (v) => v[0] - 40 },
  '10': { name: '흡입 공기량', unit: 'g/s', formula: (v) => (v[0] * 256 + v[1]) / 100 },
  '11': { name: '스로틀 위치', unit: '%', formula: (v) => (v[0] * 100) / 255 },
  '42': { name: '제어 모듈 전압', unit: 'V', formula: (v) => (v[0] * 256 + v[1]) / 1000 },
  '46': { name: '외기 온도', unit: '°C', formula: (v) => v[0] - 40 },
  '49': { name: '가속 페달 위치', unit: '%', formula: (v) => (v[0] * 100) / 255 },
  '63': { name: '엔진 토크', unit: 'Nm', formula: (v) => v[0] * 256 + v[1] },
  'DPF_TEMP': { name: 'DPF 온도', unit: '°C', formula: (v) => v[0] * 5 }, 
};

/**
 * 인포카 로그의 다양한 변종(날짜 유무, 밀리초 구분자 등)을 모두 허용하는 정규식
 */
const OBD_LINE_REGEX = /^\[(?:([\d-]+\s)?(\d{2}:\d{2}:\d{2}[:\.]\d{3}))\]\s*.*?(01\s?[0-9A-F]{2})\s*[:|,]\s*([0-9A-F/\s]+).*?delay\s*[:=]\s*(\d+)/i;

export const parseObdLine = (line: string): ObdDataPoint | null => {
  const match = line.match(OBD_LINE_REGEX);
  if (!match) return null;

  const fullDatePart = match[1] || ""; 
  const timePart = match[2];           
  const fullPid = match[3].replace(/\s/g, '').toUpperCase(); 
  const rawData = match[4].replace(/[\s/]/g, '').toUpperCase(); 
  const delay = parseInt(match[5]);
  const pid = fullPid.substring(2);

  if (rawData.includes('NODATA') || rawData.includes('ERROR')) return null;

  const serviceMarker = '41' + pid;
  const serviceIdx = rawData.indexOf(serviceMarker);
  if (serviceIdx === -1) return null;

  const dataStartIdx = serviceIdx + serviceMarker.length;
  const dataHex = rawData.substring(dataStartIdx);
  if (!dataHex) return null;

  const bytes: number[] = [];
  for (let i = 0; i < dataHex.length; i += 2) {
    const byte = parseInt(dataHex.substring(i, i + 2), 16);
    if (!isNaN(byte)) bytes.push(byte);
  }

  const def = PID_MAP[pid];
  if (!def || bytes.length === 0) return null;

  try {
    const today = new Date().toISOString().split('T')[0];
    const timestampStr = fullDatePart 
      ? (fullDatePart + timePart).replace(' ', 'T').replace(/:(\d{3})$/, '.$1')
      : `${today}T${timePart.replace(/:(\d{3})$/, '.$1')}`;
    
    const timestamp = new Date(timestampStr);

    // Calculate value using formula
    const value = def.formula(bytes);

    return {
      timestamp,
      timeStr: timePart,
      unix: timestamp.getTime(),
      pid,
      name: def.name,
      value: Number(value.toFixed(2)),
      unit: def.unit,
      delay,
      ecuId: rawData.substring(0, serviceIdx).substring(0, 3) || '7E8'
    };
  } catch (e) {
    return null;
  }
};

/**
 * 주행 세션 분할: 데이터 간격이 1분 이상 벌어지면 별도 트립으로 인식
 */
export const detectSegments = (series: ObdDataPoint[]): ObdSegment[] => {
  if (series.length === 0) return [];

  const segments: ObdSegment[] = [];
  let currentPoints: ObdDataPoint[] = [series[0]];
  const GAP_THRESHOLD_MS = 60000; 

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
