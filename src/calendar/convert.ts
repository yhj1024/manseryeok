/**
 * 음력 ↔ 양력 변환.
 */

import type { LunarDate, SolarDate } from '../types';
import {
  getLeapMonth,
  getLeapMonthDays,
  getLunarMonthDays,
  getLunarYearDays,
  LUNAR_BASE_UTC_MS,
  LUNAR_MAX_YEAR,
  LUNAR_MIN_YEAR,
} from './lunar-data';
import { assertBoolean, assertIntegerInRange } from '../validation';

const MS_PER_DAY = 86400000;

/**
 * 실재하는 양력 날짜인지 검사한다 (윤년·월별 일수 반영).
 * 예: 2024-02-31, 2024-04-31, NaN 등은 false.
 */
export function isValidSolarDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day
  );
}

/**
 * 음력을 양력으로 변환한다.
 */
export function lunarToSolar(
  year: number,
  month: number,
  day: number,
  isLeapMonth: boolean,
): SolarDate {
  assertIntegerInRange(year, LUNAR_MIN_YEAR, LUNAR_MAX_YEAR, '음력 연도(year)');
  assertIntegerInRange(month, 1, 12, '음력 월(month)');
  assertBoolean(isLeapMonth, '윤달 여부(isLeapMonth)');

  const leapMonth = getLeapMonth(year);
  if (isLeapMonth && leapMonth !== month) {
    throw new RangeError(`${year}년에는 윤${month}월이 존재하지 않습니다.`);
  }

  const maxDay =
    isLeapMonth && leapMonth === month
      ? getLeapMonthDays(year)
      : getLunarMonthDays(year, month);
  assertIntegerInRange(day, 1, maxDay, `${year}년 ${isLeapMonth ? '윤' : ''}${month}월 일자(day)`);

  let offset = 0;

  // 해당 연도 이전까지의 일수
  for (let y = LUNAR_MIN_YEAR; y < year; y++) {
    offset += getLunarYearDays(y);
  }

  // 해당 연도 내, 목표 월 직전까지의 일수
  for (let m = 1; m < month; m++) {
    offset += getLunarMonthDays(year, m);
    if (leapMonth > 0 && m === leapMonth) {
      offset += getLeapMonthDays(year);
    }
  }

  // 목표가 윤달이면, 같은 번호의 평달을 먼저 지나야 한다
  if (isLeapMonth && leapMonth === month) {
    offset += getLunarMonthDays(year, month);
  }

  offset += day - 1;

  const solar = new Date(LUNAR_BASE_UTC_MS + offset * MS_PER_DAY);
  return {
    year: solar.getUTCFullYear(),
    month: solar.getUTCMonth() + 1,
    day: solar.getUTCDate(),
  };
}

/**
 * 양력을 음력으로 변환한다. (lunarToSolar 의 역함수)
 */
export function solarToLunar(year: number, month: number, day: number): LunarDate {
  if (!isValidSolarDate(year, month, day)) {
    throw new RangeError(`유효하지 않은 양력 날짜입니다: ${year}-${month}-${day}`);
  }

  const targetUTC = Date.UTC(year, month - 1, day);
  let offset = Math.floor((targetUTC - LUNAR_BASE_UTC_MS) / MS_PER_DAY);

  if (offset < 0) {
    throw new RangeError(
      `음력 변환 지원 범위(양력 ${LUNAR_MIN_YEAR}-01-31) 이전 날짜입니다: ${year}-${month}-${day}`,
    );
  }

  // 음력 연도 찾기
  let lunarYear = LUNAR_MIN_YEAR;
  for (; lunarYear <= LUNAR_MAX_YEAR; lunarYear++) {
    const yearDays = getLunarYearDays(lunarYear);
    if (offset < yearDays) break;
    offset -= yearDays;
  }
  if (lunarYear > LUNAR_MAX_YEAR) {
    throw new RangeError(
      `음력 변환 지원 범위(${LUNAR_MAX_YEAR}년)를 벗어났습니다: ${year}-${month}-${day}`,
    );
  }

  // 음력 월 찾기 (평달 → 윤달 순서)
  const leapMonth = getLeapMonth(lunarYear);
  let lunarMonth = 1;
  let isLeapMonth = false;

  for (let m = 1; m <= 12; m++) {
    const monthDays = getLunarMonthDays(lunarYear, m);
    if (offset < monthDays) {
      lunarMonth = m;
      isLeapMonth = false;
      break;
    }
    offset -= monthDays;

    if (leapMonth > 0 && m === leapMonth) {
      const leapDays = getLeapMonthDays(lunarYear);
      if (offset < leapDays) {
        lunarMonth = m;
        isLeapMonth = true;
        break;
      }
      offset -= leapDays;
    }
  }

  return {
    year: lunarYear,
    month: lunarMonth,
    day: offset + 1,
    isLeapMonth,
  };
}
