/**
 * 태양의 겉보기 황경(apparent solar longitude)과 균시차(equation of time) 계산.
 *
 * Jean Meeus, "Astronomical Algorithms" (2nd ed.) 의 저정밀 태양 위치 공식을 사용한다.
 * 황경 정확도는 약 0.01° 수준으로, 24절기 절입 시각을 분 단위로 판정하기에 충분하다.
 *
 * 모든 시각은 UTC 기준의 절대 순간(epoch milliseconds)으로 다룬다.
 */

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/** Unix epoch milliseconds(UTC) → Julian Day */
export function julianDayFromMs(ms: number): number {
  return ms / 86400000 + 2440587.5;
}

/** Julian Day → Unix epoch milliseconds(UTC) */
export function msFromJulianDay(jd: number): number {
  return (jd - 2440587.5) * 86400000;
}

/** 0~360 범위로 정규화 */
function normalizeDegrees(deg: number): number {
  const d = deg % 360;
  return d < 0 ? d + 360 : d;
}

interface SolarElements {
  /** 기하 평균 황경 L0 (deg) */
  L0: number;
  /** 평균 근점이각 M (deg) */
  M: number;
  /** 이심률 e */
  e: number;
  /** 중심차 C (deg) */
  C: number;
  /** 황도 경사 epsilon (deg) */
  epsilon: number;
  /** 율리우스 세기 T (J2000 기준) */
  T: number;
}

function solarElements(jd: number): SolarElements {
  const T = (jd - 2451545.0) / 36525;

  const L0 = normalizeDegrees(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;

  const Mrad = M * DEG2RAD;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad) +
    0.000289 * Math.sin(3 * Mrad);

  // 평균 황도 경사 (Meeus 22.2), 분 단위 보정 포함
  const epsilon0 =
    23 +
    26 / 60 +
    21.448 / 3600 -
    (46.815 / 3600) * T -
    (0.00059 / 3600) * T * T +
    (0.001813 / 3600) * T * T * T;

  return { L0, M, e, C, epsilon: epsilon0, T };
}

/**
 * 태양의 겉보기 황경(apparent geocentric longitude) (deg, 0~360).
 * 장동(nutation)·광행차(aberration)를 근사 보정한다.
 */
export function apparentSolarLongitude(ms: number): number {
  const jd = julianDayFromMs(ms);
  const { L0, C, T } = solarElements(jd);

  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const apparent = trueLong - 0.00569 - 0.00478 * Math.sin(omega * DEG2RAD);

  return normalizeDegrees(apparent);
}

/**
 * 균시차(Equation of Time) (분 단위).
 * 양수면 진태양시가 평균태양시보다 빠르다.
 * Meeus 28.3 공식 사용.
 */
export function equationOfTimeMinutes(ms: number): number {
  const jd = julianDayFromMs(ms);
  const { L0, M, e, epsilon } = solarElements(jd);

  const epsRad = epsilon * DEG2RAD;
  const y = Math.tan(epsRad / 2) ** 2;

  const L0rad = L0 * DEG2RAD;
  const Mrad = M * DEG2RAD;

  // E (라디안)
  const E =
    y * Math.sin(2 * L0rad) -
    2 * e * Math.sin(Mrad) +
    4 * e * y * Math.sin(Mrad) * Math.cos(2 * L0rad) -
    0.5 * y * y * Math.sin(4 * L0rad) -
    1.25 * e * e * Math.sin(2 * Mrad);

  // 라디안 → 도 → 분 (1도 = 4분)
  return E * RAD2DEG * 4;
}

/**
 * 태양 겉보기 황경이 targetLongitude(deg)가 되는 절대 순간(UTC ms)을 구한다.
 * @param targetLongitude 목표 황경 (0~360)
 * @param guessMs 초기 추정 순간 (UTC ms). 해당 절기가 속한 달의 중순 정도면 충분.
 */
export function solveSolarLongitudeInstant(targetLongitude: number, guessMs: number): number {
  let ms = guessMs;
  // 태양은 하루에 약 0.9856° 이동
  const degPerDay = 360 / 365.2422;

  for (let i = 0; i < 8; i++) {
    const current = apparentSolarLongitude(ms);
    // -180~180 범위의 각도 차이
    let diff = ((current - targetLongitude + 540) % 360) - 180;
    if (Math.abs(diff) < 1e-7) break;
    // diff 만큼 황경이 앞서 있으므로 시간을 diff/속도 만큼 되돌린다
    ms -= (diff / degPerDay) * 86400000;
  }

  return ms;
}
