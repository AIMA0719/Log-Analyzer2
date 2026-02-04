
import { ObdDataPoint, ObdMetric, TripStats } from '../types';

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
  '06': { name: '단기 연료 보정', unit: '%', formula: (v) => (v[0] - 128) * 100 / 128 },
  '07': { name: '장기 연료 보정', unit: '%', formula: (v) => (v[0] - 128) * 100 / 128 },
  '0C': { name: '엔진 회전수', unit: 'rpm', formula: (v) => (v[0] * 256 + v[1]) / 4 },
  '0D': { name: '주행 속도', unit: 'km/h', formula: (v) => v[0] },
  '0E': { name: '점화 시기', unit: '°', formula: (v) => v[0] / 2 - 64 },
  '0F': { name: '흡기 온도', unit: '°C', formula: (v) => v[0] - 40 },
  '10': { name: '흡입 공기량', unit: 'g/s', formula: (v) => (v[0] * 256 + v[1]) / 100 },
  '11': { name: '스로틀 위치', unit: '%', formula: (v) => (v[0] * 100) / 255 },
  '2F': { name: '연료 잔량', unit: '%', formula: (v) => (v[0] * 100) / 255 },
  '42': { name: '제어 모듈 전압', unit: 'V', formula: (v) => (v[0] * 256 + v[1]) / 1000 },
  '49': { name: '가속 페달 위치', unit: '%', formula: (v) => (v[0] * 100) / 255 },
  '5C': { name: '엔진 오일 온도', unit: '°C', formula: (v) => v[0] - 40 },
};

const OBD_LINE_REGEX = /^\[(?:([\d-]+\s)?(\d{2}:\d{2}:\d{2}[:\.]\d{3}))\]\s*.*?(01\s?[0-9A-F]{2})\s*[:|>]\s*([0-9A-F/\s]+).*?delay\s*[:=]\s*(\d+)/i;

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

export const calculateTripStats = (series: ObdDataPoint[]): TripStats => {
  if (series.length < 2) {
    return {
      totalDistanceKm: 0, averageSpeedKmh: 0, maxRpm: 0, maxSpeedKmh: 0,
      idleDurationMs: 0, durationMs: 0, hardBrakingCount: 0, rapidAccelerationCount: 0
    };
  }

  const speedSeries = series.filter(s => s.pid === '0D');
  const rpmSeries = series.filter(s => s.pid === '0C');
  const mafSeries = series.filter(s => s.pid === '10');

  let totalDistance = 0;
  let idleMs = 0;
  let hardBraking = 0;
  let rapidAccel = 0;

  // 누적 거리 및 이벤트 계산
  for (let i = 1; i < speedSeries.length; i++) {
    const prev = speedSeries[i-1];
    const curr = speedSeries[i];
    const dtSeconds = (curr.unix - prev.unix) / 1000;
    
    // 거리 (km) = 속도(km/h) * 시간(h)
    if (dtSeconds > 0 && dtSeconds < 10) { // 비정상적인 간격 제외
      totalDistance += (curr.value * (dtSeconds / 3600));
      
      const accel = (curr.value - prev.value) / dtSeconds; // km/h per second
      if (accel > 8) rapidAccel++; // 약 2.2m/s^2 이상 가속
      if (accel < -12) hardBraking++; // 약 3.3m/s^2 이상 감속
    }
  }

  // 공회전 계산: RPM > 500 이고 속도 < 1인 구간
  if (rpmSeries.length > 0) {
    for (let i = 1; i < rpmSeries.length; i++) {
      const rpm = rpmSeries[i];
      const correspondingSpeed = speedSeries.find(s => Math.abs(s.unix - rpm.unix) < 2000)?.value || 0;
      if (rpm.value > 500 && correspondingSpeed < 1) {
        idleMs += (rpm.unix - rpmSeries[i-1].unix);
      }
    }
  }

  const duration = series[series.length - 1].unix - series[0].unix;
  const avgSpeed = totalDistance / (duration / 3600000);

  // 연비 추산 (MAF 기준 가솔린 추정)
  let fuelEconomy = undefined;
  if (mafSeries.length > 0 && totalDistance > 0.1) {
    let totalMafGrams = 0;
    for (let i = 1; i < mafSeries.length; i++) {
        const dt = (mafSeries[i].unix - mafSeries[i-1].unix) / 1000;
        totalMafGrams += (mafSeries[i].value * dt);
    }
    const totalFuelGrams = totalMafGrams / 14.7;
    const totalFuelLiters = totalFuelGrams / 720; // 가솔린 밀도 720g/L 가정
    fuelEconomy = totalDistance / totalFuelLiters;
  }

  return {
    totalDistanceKm: Number(totalDistance.toFixed(2)),
    averageSpeedKmh: Number(avgSpeed.toFixed(1)),
    maxRpm: Math.max(...rpmSeries.map(s => s.value), 0),
    maxSpeedKmh: Math.max(...speedSeries.map(s => s.value), 0),
    idleDurationMs: idleMs,
    durationMs: duration,
    hardBrakingCount: hardBraking,
    rapidAccelerationCount: rapidAccel,
    estimatedFuelEconomy: fuelEconomy ? Number(fuelEconomy.toFixed(1)) : undefined
  };
};

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
