/**
 * 한국 표준시·서머타임(일광절약시간) 역사 테이블.
 * 출처: IANA tz database (Asia/Seoul zone + ROK rules).
 *
 * 시주(時柱)·일주(日柱) 경계를 정확히 잡으려면, 기록된 벽시계 시각을
 * 실제 UTC 절대 순간으로 환산해야 한다. 이를 위해 시대별 표준시 offset 과
 * 서머타임 적용 구간을 제공한다.
 */

/** 표준시 offset 전이: 해당 시각(local wall, [y,mo,d]) 이후 적용되는 표준 offset(분) */
interface StandardEpoch {
  /** 이 전이가 시작되는 양력 연 */
  year: number;
  month: number;
  day: number;
  /** 표준시 offset (분, UTC 기준) */
  offsetMin: number;
}

/**
 * 표준시 전이 (오래된 → 최신 순서).
 * - 1908-04-01: +8:30 (동경 127.5°)
 * - 1912-01-01: +9:00 (동경 135°)
 * - 1954-03-21: +8:30 (동경 127.5°)
 * - 1961-08-10: +9:00 (동경 135°)
 */
const STANDARD_EPOCHS: readonly StandardEpoch[] = [
  { year: 1908, month: 4, day: 1, offsetMin: 510 },
  { year: 1912, month: 1, day: 1, offsetMin: 540 },
  { year: 1954, month: 3, day: 21, offsetMin: 510 },
  { year: 1961, month: 8, day: 10, offsetMin: 540 },
];

/** 기본 표준 offset (1908 이전 및 fallback) */
const DEFAULT_OFFSET_MIN = 540;

/** 서머타임 적용 구간 (local wall 기준, 시작 ≤ t < 종료). offset 은 +60분. */
interface DstInterval {
  start: { y: number; mo: number; d: number; h: number };
  end: { y: number; mo: number; d: number; h: number };
}

const DST_INTERVALS: readonly DstInterval[] = [
  { start: { y: 1948, mo: 6, d: 1, h: 0 }, end: { y: 1948, mo: 9, d: 13, h: 0 } },
  { start: { y: 1949, mo: 4, d: 3, h: 0 }, end: { y: 1949, mo: 9, d: 11, h: 0 } },
  { start: { y: 1950, mo: 4, d: 1, h: 0 }, end: { y: 1950, mo: 9, d: 10, h: 0 } },
  { start: { y: 1951, mo: 5, d: 6, h: 0 }, end: { y: 1951, mo: 9, d: 9, h: 0 } },
  { start: { y: 1955, mo: 5, d: 5, h: 0 }, end: { y: 1955, mo: 9, d: 9, h: 0 } },
  { start: { y: 1956, mo: 5, d: 20, h: 0 }, end: { y: 1956, mo: 9, d: 30, h: 0 } },
  { start: { y: 1957, mo: 5, d: 5, h: 0 }, end: { y: 1957, mo: 9, d: 22, h: 0 } },
  { start: { y: 1958, mo: 5, d: 4, h: 0 }, end: { y: 1958, mo: 9, d: 21, h: 0 } },
  { start: { y: 1959, mo: 5, d: 3, h: 0 }, end: { y: 1959, mo: 9, d: 20, h: 0 } },
  { start: { y: 1960, mo: 5, d: 1, h: 0 }, end: { y: 1960, mo: 9, d: 18, h: 0 } },
  { start: { y: 1987, mo: 5, d: 10, h: 2 }, end: { y: 1987, mo: 10, d: 11, h: 3 } },
  { start: { y: 1988, mo: 5, d: 8, h: 2 }, end: { y: 1988, mo: 10, d: 9, h: 3 } },
];

/** [y,mo,d,h] 를 비교 가능한 정수 키로 변환 */
function key(y: number, mo: number, d: number, h: number): number {
  return ((y * 12 + (mo - 1)) * 31 + (d - 1)) * 24 + h;
}

/** 해당 벽시계 시각의 표준 offset(분)을 반환 */
function standardOffsetMin(y: number, mo: number, d: number): number {
  const k = key(y, mo, d, 0);
  let offset = DEFAULT_OFFSET_MIN;
  for (const e of STANDARD_EPOCHS) {
    if (k >= key(e.year, e.month, e.day, 0)) {
      offset = e.offsetMin;
    } else {
      break;
    }
  }
  return offset;
}

/** 해당 벽시계 시각에 서머타임이 적용되는지 여부 */
function isDst(y: number, mo: number, d: number, h: number): boolean {
  const k = key(y, mo, d, h);
  for (const iv of DST_INTERVALS) {
    if (k >= key(iv.start.y, iv.start.mo, iv.start.d, iv.start.h) && k < key(iv.end.y, iv.end.mo, iv.end.d, iv.end.h)) {
      return true;
    }
  }
  return false;
}

/**
 * 기록된 한국 벽시계 시각의 총 civil offset(분, 서머타임 포함)을 반환한다.
 * instantUTC = wallClock - totalOffset.
 */
export function koreaCivilOffsetMin(
  y: number,
  mo: number,
  d: number,
  h: number,
): number {
  const base = standardOffsetMin(y, mo, d);
  return base + (isDst(y, mo, d, h) ? 60 : 0);
}
