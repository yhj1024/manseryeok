/**
 * 사주 4기둥(연주·월주·일주·시주) 계산.
 *
 * - 연주: 입춘(立春) 절입 순간을 경계로 한다.
 * - 월주: 절기(節) 기준, 정밀 절입 시각으로 판정한다.
 * - 일주: 60갑자 순환. 진태양시/야자시 옵션 반영.
 * - 시주: 일간(日干) 기준 시간 천간 + 지방 진태양시 기준 시진.
 */

import type { DayBoundary, Pillar } from './types';
import { EARTHLY_BRANCHES, HEAVENLY_STEMS, MONTH_BRANCHES, DAY_PILLAR_ANCHOR } from './constants';
import { pillarFromGanji } from './ganji';
import { sajuMonthForInstant, sajuYearForInstant } from './astro/solar-terms';
import type { ResolvedInstant } from './time/true-solar-time';

const MS_PER_DAY = 86400000;

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** 사주 연도 → 연주 */
function getYearPillar(sajuYear: number): Pillar {
  return {
    heavenlyStem: HEAVENLY_STEMS[mod(sajuYear - 4, 10)],
    earthlyBranch: EARTHLY_BRANCHES[mod(sajuYear - 4, 12)],
  };
}

/** 사주 연도 + 절기 월 번호(1=인월…12=축월) → 월주 */
function getMonthPillar(sajuYear: number, monthNumber: number): Pillar {
  const yearStem = mod(sajuYear - 4, 10);
  const yearStemMod5 = yearStem % 5;
  // 오호둔(五虎遁): 인월(1)부터 월간 전개
  const monthStemIndex = (yearStemMod5 * 2 + monthNumber + 1) % 10;
  return {
    heavenlyStem: HEAVENLY_STEMS[monthStemIndex],
    earthlyBranch: MONTH_BRANCHES[monthNumber],
  };
}

/** 양력 연/월/일(지방 진태양시 기준) → 60갑자 인덱스(0~59) */
function ganjiIndexForDate(year: number, month: number, day: number): number {
  const anchorMs = Date.UTC(DAY_PILLAR_ANCHOR.year, DAY_PILLAR_ANCHOR.month - 1, DAY_PILLAR_ANCHOR.day);
  const targetMs = Date.UTC(year, month - 1, day);
  const daysDiff = Math.round((targetMs - anchorMs) / MS_PER_DAY);
  return mod(DAY_PILLAR_ANCHOR.ganjiIndex + daysDiff, 60);
}

interface DayResult {
  pillar: Pillar;
  /** 시주 천간 계산에 쓰는 일간 인덱스 */
  dayStemIndex: number;
}

/**
 * 지방 진태양시 기준 일주 계산.
 * 23:00~23:59 자시의 관법(dayBoundary)에 따라 일주와 시주 천간의 기준일이 갈린다.
 * - midnight: 일주·시주 모두 당일
 * - jasi: 일주·시주 모두 다음날
 * - splitJasi: 일주는 당일, 시주 천간만 다음날
 */
function computeDayPillar(apparentMs: number, dayBoundary: DayBoundary): DayResult {
  const d = new Date(apparentMs);
  const baseGanji = ganjiIndexForDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  const isLateZi = d.getUTCHours() >= 23;
  const nextGanji = (baseGanji + 1) % 60; // 60갑자는 하루에 1씩 증가

  let dayGanji = baseGanji; // 일주
  let hourStemGanji = baseGanji; // 시주 천간의 기준 일간
  if (isLateZi) {
    if (dayBoundary === 'jasi') {
      dayGanji = nextGanji;
      hourStemGanji = nextGanji;
    } else if (dayBoundary === 'splitJasi') {
      hourStemGanji = nextGanji;
    }
  }

  return { pillar: pillarFromGanji(dayGanji), dayStemIndex: hourStemGanji % 10 };
}

/** 시진(0=자 … 11=해) 계산 — 지방 진태양시 기준 */
function shichenForApparent(apparentMs: number): number {
  const d = new Date(apparentMs);
  const totalMinutes = d.getUTCHours() * 60 + d.getUTCMinutes();
  return Math.floor(((totalMinutes + 60) % 1440) / 120);
}

/** 일간 인덱스 + 시진 → 시주 */
function getHourPillar(dayStemIndex: number, shichen: number): Pillar {
  const hourStemBase = (dayStemIndex % 5) * 2;
  const hourStemIndex = (hourStemBase + shichen) % 10;
  return {
    heavenlyStem: HEAVENLY_STEMS[hourStemIndex],
    earthlyBranch: EARTHLY_BRANCHES[shichen],
  };
}

/**
 * 4기둥 전체 계산.
 * @param resolved 진태양시 환산 결과
 * @param calendarYear 입력된 양력(KST) 연도 — 입춘 비교 기준
 * @param dayBoundary 일 경계 기준
 */
export function computeFourPillars(
  resolved: ResolvedInstant,
  calendarYear: number,
  dayBoundary: DayBoundary,
): {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar;
} {
  const sajuYear = sajuYearForInstant(resolved.instantUTCms, calendarYear);
  const monthNumber = sajuMonthForInstant(resolved.instantUTCms);

  const yearPillar = getYearPillar(sajuYear);
  const monthPillar = getMonthPillar(sajuYear, monthNumber);

  const { pillar: dayPillar, dayStemIndex } = computeDayPillar(resolved.apparentMs, dayBoundary);

  const shichen = shichenForApparent(resolved.apparentMs);
  const hourPillar = getHourPillar(dayStemIndex, shichen);

  return { year: yearPillar, month: monthPillar, day: dayPillar, hour: hourPillar };
}
