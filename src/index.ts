/**
 * 만세력(萬歲曆) 계산 라이브러리
 * Korean Saju (Four Pillars) and Manseryeok calculation library
 *
 * @author Yoohyojun
 * @license MIT
 */

import type {
  BirthInfo,
  EarthlyBranch,
  ElementPair,
  FourPillars,
  LuckPillarInfo,
  Pillar,
  YinYangPair,
} from './types';
import {
  EARTHLY_BRANCHES,
  EARTHLY_BRANCHES_HANJA,
  HEAVENLY_STEMS,
  HEAVENLY_STEMS_HANJA,
} from './constants';
import {
  getEarthlyBranchElement,
  getEarthlyBranchYinYang,
  getHeavenlyStemElement,
  getHeavenlyStemYinYang,
} from './elements';
import { isValidSolarDate, lunarToSolar } from './calendar/convert';
import { LUNAR_MAX_YEAR } from './calendar/lunar-data';
import { SOLAR_TERM_DATA_MAX_YEAR, SOLAR_TERM_DATA_MIN_YEAR } from './astro/solar-terms-data';
import { resolveInstant } from './time/true-solar-time';
import { computeFourPillars } from './pillars';
import { getTenGodChart, type TenGodChart } from './features/ten-gods';
import { getVoidBranches } from './features/void-branches';
import { getLuckPillars } from './features/luck-pillars';
import {
  assertBoolean,
  assertDayBoundary,
  assertFiniteNumber,
  assertGender,
  assertOptionalBoolean,
  assertPillar,
} from './validation';

// ===== 공개 re-export =====

export {
  HEAVENLY_STEMS,
  HEAVENLY_STEMS_HANJA,
  EARTHLY_BRANCHES,
  EARTHLY_BRANCHES_HANJA,
  YIN_YANG,
  FIVE_ELEMENTS,
  TEN_GOD_HANJA,
} from './constants';

export type {
  HeavenlyStem,
  EarthlyBranch,
  YinYang,
  FiveElement,
  TenGod,
  Gender,
  DayBoundary,
  Pillar,
  FourPillars,
  BirthInfo,
  TrueSolarTimeOptions,
  LunarDate,
  SolarDate,
  ElementPair,
  YinYangPair,
  LuckPillar,
  LuckPillarInfo,
  SolarTerm,
} from './types';

export {
  getHeavenlyStemYinYang,
  getHeavenlyStemElement,
  getEarthlyBranchYinYang,
  getEarthlyBranchElement,
} from './elements';

export { lunarToSolar, solarToLunar, isValidSolarDate } from './calendar/convert';
export { LUNAR_MIN_YEAR, LUNAR_MAX_YEAR } from './calendar/lunar-data';

export {
  getSolarTerm,
  getSolarTermsOfYear,
  SOLAR_TERM_NAMES,
  SOLAR_TERM_NAMES_HANJA,
} from './astro/solar-terms';
export { apparentSolarLongitude, equationOfTimeMinutes } from './astro/sun-longitude';

export { getTenGod, getBranchTenGod, getTenGodChart } from './features/ten-gods';
export type { TenGodChart } from './features/ten-gods';
export { getVoidBranches } from './features/void-branches';
export { getLuckPillars } from './features/luck-pillars';
export type { LuckPillarParams } from './features/luck-pillars';
export { DEFAULT_LONGITUDE } from './time/true-solar-time';

// ===== 사주 계산 결과 타입 =====

/** 사주 계산 결과 상세 정보 */
export interface FourPillarsDetail extends FourPillars {
  // 각 기둥의 오행 (stem: 천간 오행, branch: 지지 오행)
  yearElement: ElementPair;
  monthElement: ElementPair;
  dayElement: ElementPair;
  hourElement: ElementPair;

  // 각 기둥의 음양
  yearYinYang: YinYangPair;
  monthYinYang: YinYangPair;
  dayYinYang: YinYangPair;
  hourYinYang: YinYangPair;

  // 개별 기둥 문자열 (한글)
  yearString: string;
  monthString: string;
  dayString: string;
  hourString: string;

  // 개별 기둥 한자
  yearHanja: string;
  monthHanja: string;
  dayHanja: string;
  hourHanja: string;

  // ===== 부가 명리 정보 =====
  /** 십신(十神) 차트 */
  tenGods: TenGodChart;
  /** 공망(空亡) 지지 */
  voidBranches: EarthlyBranch[];
  /** 대운(大運) — gender 가 주어진 경우에만 제공 */
  luckPillars?: LuckPillarInfo;

  // 문자열/객체 변환
  toString: () => string;
  toObject: () => { year: string; month: string; day: string; hour: string };
  toHanjaObject: () => {
    year: { korean: string; hanja: string };
    month: { korean: string; hanja: string };
    day: { korean: string; hanja: string };
    hour: { korean: string; hanja: string };
  };
  toHanjaString: () => string;
}

// ===== 입력 검증 =====

function validateBirthInfo(birthInfo: BirthInfo): void {
  if (birthInfo === null || typeof birthInfo !== 'object') {
    throw new TypeError('생년월일시 정보(birthInfo)는 객체여야 합니다.');
  }

  const { year, month, day, hour, minute } = birthInfo;

  if (birthInfo.isLunar !== undefined) {
    assertBoolean(birthInfo.isLunar, '음력 여부(isLunar)');
  }
  if (birthInfo.isLeapMonth !== undefined) {
    assertBoolean(birthInfo.isLeapMonth, '윤달 여부(isLeapMonth)');
  }
  if (birthInfo.dayBoundary !== undefined) {
    assertDayBoundary(birthInfo.dayBoundary);
  }
  if (birthInfo.gender !== undefined) {
    assertGender(birthInfo.gender);
  }
  if (birthInfo.trueSolarTime !== undefined) {
    const { trueSolarTime } = birthInfo;
    if (trueSolarTime === null || typeof trueSolarTime !== 'object' || Array.isArray(trueSolarTime)) {
      throw new TypeError('진태양시 옵션(trueSolarTime)은 객체여야 합니다.');
    }
    if (trueSolarTime.longitude !== undefined) {
      assertFiniteNumber(trueSolarTime.longitude, '출생지 경도(trueSolarTime.longitude)');
      if (trueSolarTime.longitude < -180 || trueSolarTime.longitude > 180) {
        throw new RangeError(
          `출생지 경도(trueSolarTime.longitude)는 -180~180 범위여야 합니다: ${trueSolarTime.longitude}`,
        );
      }
    }
    assertOptionalBoolean(
      trueSolarTime.applyEquationOfTime,
      '균시차 보정 여부(trueSolarTime.applyEquationOfTime)',
    );
    assertOptionalBoolean(
      trueSolarTime.applyHistoricalDst,
      '과거 표준시·서머타임 보정 여부(trueSolarTime.applyHistoricalDst)',
    );
  }

  // 사주 계산은 정밀 절입표 범위(1800~) 안에서만 분 단위로 정확하므로 음력 입력도 1800년부터
  // 허용한다. 음력 상한은 음력 테이블(~2100), 양력은 절입표(~2300) 범위를 따른다.
  // (음양력 변환 API 자체는 1391년부터 지원한다.)
  const minYear = SOLAR_TERM_DATA_MIN_YEAR;
  const maxYear = birthInfo.isLunar ? LUNAR_MAX_YEAR : SOLAR_TERM_DATA_MAX_YEAR;
  if (!Number.isInteger(year) || year < minYear || year > maxYear) {
    throw new RangeError(`연도(year)는 ${minYear}~${maxYear} 정수여야 합니다: ${year}`);
  }
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new RangeError(`시(hour)는 0~23 정수여야 합니다: ${hour}`);
  }
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new RangeError(`분(minute)은 0~59 정수여야 합니다: ${minute}`);
  }

  if (birthInfo.isLunar) {
    // 음력은 월 1~12, 일 1~30 기본 검사. 윤달·일수 세부 검증은 lunarToSolar 가 수행한다.
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new RangeError(`월(month)은 1~12 정수여야 합니다: ${month}`);
    }
    if (!Number.isInteger(day) || day < 1 || day > 30) {
      throw new RangeError(`음력 일(day)은 1~30 정수여야 합니다: ${day}`);
    }
  } else if (!isValidSolarDate(year, month, day)) {
    throw new RangeError(`유효하지 않은 양력 날짜입니다: ${year}-${month}-${day}`);
  }
}

function hanjaOf(pillar: Pillar): string {
  return (
    HEAVENLY_STEMS_HANJA[HEAVENLY_STEMS.indexOf(pillar.heavenlyStem)] +
    EARTHLY_BRANCHES_HANJA[EARTHLY_BRANCHES.indexOf(pillar.earthlyBranch)]
  );
}

function elementOf(pillar: Pillar): ElementPair {
  return {
    stem: getHeavenlyStemElement(pillar.heavenlyStem),
    branch: getEarthlyBranchElement(pillar.earthlyBranch),
  };
}

function yinYangOf(pillar: Pillar): YinYangPair {
  return {
    stem: getHeavenlyStemYinYang(pillar.heavenlyStem),
    branch: getEarthlyBranchYinYang(pillar.earthlyBranch),
  };
}

/**
 * 사주팔자를 계산합니다.
 *
 * @param birthInfo 생년월일시 정보
 * @returns 사주팔자(연주·월주·일주·시주)와 부가 명리 정보
 */
export function calculateFourPillars(birthInfo: BirthInfo): FourPillarsDetail {
  validateBirthInfo(birthInfo);

  const { hour, minute } = birthInfo;
  let { year, month, day } = birthInfo;

  // 음력 입력 → 양력 변환
  if (birthInfo.isLunar) {
    const solar = lunarToSolar(year, month, day, birthInfo.isLeapMonth ?? false);
    year = solar.year;
    month = solar.month;
    day = solar.day;
  }

  const resolved = resolveInstant(year, month, day, hour, minute, birthInfo.trueSolarTime);
  const dayBoundary = birthInfo.dayBoundary ?? 'midnight';
  const pillars = computeFourPillars(resolved, year, dayBoundary);

  const fourPillars: FourPillars = {
    year: pillars.year,
    month: pillars.month,
    day: pillars.day,
    hour: pillars.hour,
  };

  // 부가 명리 정보
  const tenGods = getTenGodChart(fourPillars);
  const voidBranches = getVoidBranches(pillars.day.heavenlyStem, pillars.day.earthlyBranch);

  let luckPillars: LuckPillarInfo | undefined;
  if (birthInfo.gender) {
    luckPillars = getLuckPillars({
      instantUTCms: resolved.instantUTCms,
      birthYear: year,
      monthPillar: pillars.month,
      sajuYearStemIndex: HEAVENLY_STEMS.indexOf(pillars.year.heavenlyStem),
      gender: birthInfo.gender,
    });
  }

  const yearString = `${pillars.year.heavenlyStem}${pillars.year.earthlyBranch}`;
  const monthString = `${pillars.month.heavenlyStem}${pillars.month.earthlyBranch}`;
  const dayString = `${pillars.day.heavenlyStem}${pillars.day.earthlyBranch}`;
  const hourString = `${pillars.hour.heavenlyStem}${pillars.hour.earthlyBranch}`;
  const yearHanja = hanjaOf(pillars.year);
  const monthHanja = hanjaOf(pillars.month);
  const dayHanja = hanjaOf(pillars.day);
  const hourHanja = hanjaOf(pillars.hour);

  return {
    ...fourPillars,

    yearElement: elementOf(pillars.year),
    monthElement: elementOf(pillars.month),
    dayElement: elementOf(pillars.day),
    hourElement: elementOf(pillars.hour),

    yearYinYang: yinYangOf(pillars.year),
    monthYinYang: yinYangOf(pillars.month),
    dayYinYang: yinYangOf(pillars.day),
    hourYinYang: yinYangOf(pillars.hour),

    yearString,
    monthString,
    dayString,
    hourString,

    yearHanja,
    monthHanja,
    dayHanja,
    hourHanja,

    tenGods,
    voidBranches,
    luckPillars,

    toString(): string {
      return fourPillarsToString(fourPillars);
    },
    toObject() {
      return { year: yearString, month: monthString, day: dayString, hour: hourString };
    },
    toHanjaObject() {
      return {
        year: { korean: yearString, hanja: yearHanja },
        month: { korean: monthString, hanja: monthHanja },
        day: { korean: dayString, hanja: dayHanja },
        hour: { korean: hourString, hanja: hourHanja },
      };
    },
    toHanjaString(): string {
      return `${yearHanja}年柱, ${monthHanja}月柱, ${dayHanja}日柱, ${hourHanja}時柱`;
    },
  };
}

/**
 * 사주를 한국어 문자열로 변환합니다.
 *
 * @returns "임신연주, 경술월주, 계유일주, 을묘시주" 형식의 문자열
 */
export function fourPillarsToString(fourPillars: FourPillars): string {
  const { year, month, day, hour } = fourPillars;
  assertPillar(year, 'year');
  assertPillar(month, 'month');
  assertPillar(day, 'day');
  assertPillar(hour, 'hour');
  return [
    `${year.heavenlyStem}${year.earthlyBranch}연주`,
    `${month.heavenlyStem}${month.earthlyBranch}월주`,
    `${day.heavenlyStem}${day.earthlyBranch}일주`,
    `${hour.heavenlyStem}${hour.earthlyBranch}시주`,
  ].join(', ');
}
