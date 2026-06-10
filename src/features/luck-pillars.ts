/**
 * 대운(大運) 계산.
 *
 * - 순행/역행: 연간(年干)의 음양과 성별로 결정한다.
 *   양남·음녀 → 순행, 음남·양녀 → 역행.
 * - 대운 간지: 월주(月柱)에서 시작해 순행이면 다음 간지, 역행이면 이전 간지로 전개.
 * - 대운수(시작 나이): 출생에서 다음(순행)/이전(역행) 절(節)까지의 일수를 3으로 나눈 값.
 */

import type { Gender, LuckPillar, LuckPillarInfo, Pillar } from '../types';
import { EARTHLY_BRANCHES, HEAVENLY_STEMS } from '../constants';
import { ganjiIndexOf, pillarFromGanji } from '../ganji';
import { solarTermInstantMs } from '../astro/solar-terms';
import {
  assertFiniteNumber,
  assertGender,
  assertIntegerInRange,
  assertPillar,
} from '../validation';

const MS_PER_DAY = 86400000;

/** 월(月)을 시작하는 절(節) = 짝수 인덱스 절기 */
const JEOL_INDICES = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];

/** 출생 순간 주변의 모든 절(節) 절입 순간(UTC ms)을 시간순으로 수집 */
function collectJeolInstants(birthYear: number): number[] {
  const result: number[] = [];
  for (let y = birthYear - 1; y <= birthYear + 1; y++) {
    for (const idx of JEOL_INDICES) {
      result.push(solarTermInstantMs(y, idx));
    }
  }
  return result.sort((a, b) => a - b);
}

export interface LuckPillarParams {
  /** 출생 절대 순간 (UTC ms) */
  instantUTCms: number;
  /** 입력 양력 연도 (절 수집 범위) */
  birthYear: number;
  /** 월주 */
  monthPillar: Pillar;
  /** 사주 연간(年干) 인덱스 (0~9) */
  sajuYearStemIndex: number;
  /** 성별 */
  gender: Gender;
  /** 생성할 대운 개수 (기본 10) */
  count?: number;
}

/**
 * 대운 정보를 계산한다.
 */
export function getLuckPillars(params: LuckPillarParams): LuckPillarInfo {
  const { instantUTCms, birthYear, monthPillar, sajuYearStemIndex, gender, count = 10 } = params;

  assertFiniteNumber(instantUTCms, '출생 절대 순간(instantUTCms)');
  assertIntegerInRange(birthYear, 101, 9998, '입력 양력 연도(birthYear)');
  assertPillar(monthPillar, '월주(monthPillar)');
  assertIntegerInRange(sajuYearStemIndex, 0, 9, '사주 연간 인덱스(sajuYearStemIndex)');
  assertGender(gender);
  assertIntegerInRange(count, 1, 120, '대운 개수(count)');

  const yangYear = sajuYearStemIndex % 2 === 0;
  const male = gender === 'male';
  const forward = (yangYear && male) || (!yangYear && !male);

  // 대운수 계산: 출생 ~ 인접 절 사이 일수 / 3 (3일 = 1년)
  const jeols = collectJeolInstants(birthYear);
  let days: number;
  if (forward) {
    const next = jeols.find((ms) => ms > instantUTCms);
    days = next ? (next - instantUTCms) / MS_PER_DAY : 0;
  } else {
    const prev = [...jeols].reverse().find((ms) => ms <= instantUTCms);
    days = prev ? (instantUTCms - prev) / MS_PER_DAY : 0;
  }
  const startAge = Math.max(1, Math.round(days / 3));

  // 세부 대운수: 3일=1년, 1일=4개월, 1개월=30일 환산으로 잔여를 보존한다.
  // 반올림으로 일=30/월=12가 되는 경계는 상위 단위로 올림(carry) 처리한다.
  let startYears = Math.floor(days / 3);
  const remMonths = (days - startYears * 3) * 4;
  let startMonths = Math.floor(remMonths);
  let startDays = Math.round((remMonths - startMonths) * 30);
  if (startDays >= 30) {
    startDays -= 30;
    startMonths += 1;
  }
  if (startMonths >= 12) {
    startMonths -= 12;
    startYears += 1;
  }

  // 월주에서 시작해 순행/역행으로 전개
  const monthGanji = ganjiIndexOf(
    HEAVENLY_STEMS.indexOf(monthPillar.heavenlyStem),
    EARTHLY_BRANCHES.indexOf(monthPillar.earthlyBranch),
  );

  const pillars: LuckPillar[] = [];
  for (let i = 0; i < count; i++) {
    const step = i + 1;
    const ganji = forward
      ? (monthGanji + step) % 60
      : ((monthGanji - step) % 60 + 60) % 60;
    const pillar = pillarFromGanji(ganji);
    pillars.push({
      age: startAge + i * 10,
      pillar,
      korean: `${pillar.heavenlyStem}${pillar.earthlyBranch}`,
    });
  }

  return { forward, startAge, startYears, startMonths, startDays, pillars };
}
