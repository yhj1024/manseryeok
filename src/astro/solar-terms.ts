/**
 * 24절기(節氣) 계산.
 *
 * 절기 인덱스는 0=소한 … 23=동지 순서이며, 각 인덱스의 황경은 (285 + 15*index) mod 360.
 * 짝수 인덱스가 '절(節)'로 월(月)의 시작을 결정한다 (예: index 2 = 입춘 = 인월 시작).
 */

import type { SolarTerm } from '../types';
import { solveSolarLongitudeInstant } from './sun-longitude';
import { assertFiniteNumber, assertIntegerInRange } from '../validation';
import { solarTermCorrectionMinutes } from './solar-terms-data';

const SOLAR_TERM_MIN_YEAR = 100;
const SOLAR_TERM_MAX_YEAR = 9999;

function assertSolarTermYear(year: number): void {
  assertIntegerInRange(year, SOLAR_TERM_MIN_YEAR, SOLAR_TERM_MAX_YEAR, '절기 연도(year)');
}

/** 절기 이름 (한글) — index 0 = 소한 */
export const SOLAR_TERM_NAMES = [
  '소한',
  '대한',
  '입춘',
  '우수',
  '경칩',
  '춘분',
  '청명',
  '곡우',
  '입하',
  '소만',
  '망종',
  '하지',
  '소서',
  '대서',
  '입추',
  '처서',
  '백로',
  '추분',
  '한로',
  '상강',
  '입동',
  '소설',
  '대설',
  '동지',
] as const;

/** 절기 이름 (한자) */
export const SOLAR_TERM_NAMES_HANJA = [
  '小寒',
  '大寒',
  '立春',
  '雨水',
  '驚蟄',
  '春分',
  '淸明',
  '穀雨',
  '立夏',
  '小滿',
  '芒種',
  '夏至',
  '小暑',
  '大暑',
  '立秋',
  '處暑',
  '白露',
  '秋分',
  '寒露',
  '霜降',
  '立冬',
  '小雪',
  '大雪',
  '冬至',
] as const;

/** 입춘 절기 인덱스 */
const LICHUN_INDEX = 2;

/** 절기 인덱스 → 목표 황경(deg) */
function solarTermLongitude(index: number): number {
  assertIntegerInRange(index, 0, 23, '절기 인덱스(index)');
  return (285 + 15 * index) % 360;
}

/**
 * 특정 연도·절기의 절입 절대 순간(UTC ms)을 구한다.
 * @param year 양력 연도 (절기가 속한 달력상 연도)
 * @param index 절기 인덱스 (0~23)
 */
export function solarTermInstantMs(year: number, index: number): number {
  assertSolarTermYear(year);
  const target = solarTermLongitude(index); // 인덱스 범위(0~23) 검증 포함
  // 절기가 속한 양력 월 (0-indexed): index 0(소한)→1월, index 2(입춘)→2월 …
  const month = Math.floor(index / 2);
  // 해당 월 중순을 초기 추정치로 Meeus 근사를 구한 뒤, 보정표(1800~2300)로 분 단위 오차를
  // 보정한다(범위 밖이면 보정 0 = Meeus 근사, 오차 ≈ 수 분).
  const guessMs = Date.UTC(year, month, 15, 0, 0, 0);
  const meeusMin = Math.round(solveSolarLongitudeInstant(target, guessMs) / 60000);
  return (meeusMin + solarTermCorrectionMinutes(year, index)) * 60000;
}

/**
 * 절입 시각을 반환한다.
 * `date` 는 절입의 절대 순간(UTC 기준 Date)이다. KST 로 표기하려면
 * `date.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })` 등을 사용한다.
 *
 * 1800~2300년은 정밀 절입표로 분 단위 정확하며, 범위 밖 연도는 Meeus 근사로
 * 폴백되어 수 분 이상(연도가 멀수록 증가)의 오차가 있을 수 있다.
 */
export function getSolarTerm(year: number, index: number): SolarTerm {
  const ms = solarTermInstantMs(year, index);
  return {
    index,
    name: SOLAR_TERM_NAMES[index],
    hanja: SOLAR_TERM_NAMES_HANJA[index],
    date: new Date(ms),
  };
}

/**
 * 한 해의 24절기를 모두 반환한다 (시간 순서).
 */
export function getSolarTermsOfYear(year: number): SolarTerm[] {
  return Array.from({ length: 24 }, (_, i) => getSolarTerm(year, i));
}

/**
 * 주어진 절대 순간(UTC ms)이 입춘 이후인지 판정하여, 사주 연도 보정에 쓸 연도를 반환한다.
 * 입춘 이전이면 year-1, 이후면 year.
 */
export function sajuYearForInstant(instantMs: number, calendarYear: number): number {
  assertFiniteNumber(instantMs, '절대 순간(instantMs)');
  const lichunMs = solarTermInstantMs(calendarYear, LICHUN_INDEX);
  return instantMs < lichunMs ? calendarYear - 1 : calendarYear;
}

/**
 * 월(月)을 시작하는 절(節) 인덱스 → 절기 월 번호(인월=1 … 축월=12).
 * 입춘(2)부터 시작해 30°(약 한 달)씩 전개되며 소한(0)이 축월(12)이다.
 */
const JEOL_TO_MONTH: ReadonlyArray<readonly [number, number]> = [
  [2, 1],
  [4, 2],
  [6, 3],
  [8, 4],
  [10, 5],
  [12, 6],
  [14, 7],
  [16, 8],
  [18, 9],
  [20, 10],
  [22, 11],
  [0, 12],
];

/**
 * 절대 순간(UTC ms)에 해당하는 절기 월 번호(1=인월 … 12=축월)를 반환한다.
 * 정밀 절입표를 기준으로, 해당 순간 직전의 절(節)이 시작한 월을 택한다.
 */
export function sajuMonthForInstant(instantMs: number): number {
  assertFiniteNumber(instantMs, '절대 순간(instantMs)');
  const year = new Date(instantMs).getUTCFullYear();
  let bestBoundary = -Infinity;
  let month = 12; // 직전 절을 못 찾는 극단 케이스의 기본값(축월)
  // 연 경계를 넘는 절(소한·대설 등)을 포착하기 위해 전후 1년까지 본다.
  for (const yr of [year - 1, year, year + 1]) {
    for (const [index, mon] of JEOL_TO_MONTH) {
      const boundary = solarTermInstantMs(yr, index);
      if (boundary <= instantMs && boundary > bestBoundary) {
        bestBoundary = boundary;
        month = mon;
      }
    }
  }
  return month;
}
