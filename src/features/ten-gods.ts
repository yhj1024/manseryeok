/**
 * 십신(十神) 계산.
 *
 * 일간(日干)을 기준으로 다른 천간/지지(지장간 본기)와의 오행 생극 + 음양 관계로
 * 비견·겁재·식신·상관·편재·정재·편관·정관·편인·정인을 산출한다.
 *
 * 규칙: 같은 음양이면 편(偏)계열(비견·식신·편재·편관·편인),
 *       다른 음양이면 정(正)계열(겁재·상관·정재·정관·정인).
 */

import type { EarthlyBranch, FourPillars, HeavenlyStem, TenGod } from '../types';
import { BRANCH_MAIN_STEM, ELEMENT_CONTROLS, ELEMENT_GENERATES } from '../constants';
import { getHeavenlyStemElement, getHeavenlyStemYinYang } from '../elements';
import { assertEarthlyBranch } from '../validation';

/**
 * 일간 기준 어떤 천간의 십신을 구한다.
 */
export function getTenGod(dayMaster: HeavenlyStem, target: HeavenlyStem): TenGod {
  const dayEl = getHeavenlyStemElement(dayMaster);
  const targetEl = getHeavenlyStemElement(target);
  const sameYinYang = getHeavenlyStemYinYang(dayMaster) === getHeavenlyStemYinYang(target);

  if (targetEl === dayEl) {
    return sameYinYang ? '비견' : '겁재';
  }
  if (ELEMENT_GENERATES[dayEl] === targetEl) {
    return sameYinYang ? '식신' : '상관';
  }
  if (ELEMENT_CONTROLS[dayEl] === targetEl) {
    return sameYinYang ? '편재' : '정재';
  }
  if (ELEMENT_CONTROLS[targetEl] === dayEl) {
    return sameYinYang ? '편관' : '정관';
  }
  // 나머지: target 이 일간을 생함 (인성)
  return sameYinYang ? '편인' : '정인';
}

/**
 * 일간 기준 어떤 지지의 십신을 구한다 (지장간 본기 기준).
 */
export function getBranchTenGod(dayMaster: HeavenlyStem, branch: EarthlyBranch): TenGod {
  assertEarthlyBranch(branch);
  return getTenGod(dayMaster, BRANCH_MAIN_STEM[branch]);
}

/** 사주 전체 천간/지지의 십신 (일간은 자기 자신이므로 '일간'으로 표기) */
export interface TenGodChart {
  year: { stem: TenGod; branch: TenGod };
  month: { stem: TenGod; branch: TenGod };
  day: { stem: '일간'; branch: TenGod };
  hour: { stem: TenGod; branch: TenGod };
}

/**
 * 사주팔자 전체의 십신 차트를 계산한다.
 */
export function getTenGodChart(pillars: FourPillars): TenGodChart {
  const dayMaster = pillars.day.heavenlyStem;
  return {
    year: {
      stem: getTenGod(dayMaster, pillars.year.heavenlyStem),
      branch: getBranchTenGod(dayMaster, pillars.year.earthlyBranch),
    },
    month: {
      stem: getTenGod(dayMaster, pillars.month.heavenlyStem),
      branch: getBranchTenGod(dayMaster, pillars.month.earthlyBranch),
    },
    day: {
      stem: '일간',
      branch: getBranchTenGod(dayMaster, pillars.day.earthlyBranch),
    },
    hour: {
      stem: getTenGod(dayMaster, pillars.hour.heavenlyStem),
      branch: getBranchTenGod(dayMaster, pillars.hour.earthlyBranch),
    },
  };
}
