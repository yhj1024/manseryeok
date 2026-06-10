/**
 * 공망(空亡) 계산.
 */

import type { EarthlyBranch, HeavenlyStem } from '../types';
import { EARTHLY_BRANCHES, HEAVENLY_STEMS } from '../constants';
import { ganjiIndexOf } from '../ganji';
import { assertEarthlyBranch, assertHeavenlyStem } from '../validation';

/**
 * 일주 기준 공망(空亡) 지지 2개를 반환한다.
 */
export function getVoidBranches(dayStem: HeavenlyStem, dayBranch: EarthlyBranch): EarthlyBranch[] {
  assertHeavenlyStem(dayStem, '일간(dayStem)');
  assertEarthlyBranch(dayBranch, '일지(dayBranch)');
  const dayGanji = ganjiIndexOf(HEAVENLY_STEMS.indexOf(dayStem), EARTHLY_BRANCHES.indexOf(dayBranch));
  // 순(旬)의 첫 간지 (갑으로 시작) 의 지지
  const xunStartBranch = (dayGanji - (dayGanji % 10)) % 12;
  return [
    EARTHLY_BRANCHES[(xunStartBranch + 10) % 12],
    EARTHLY_BRANCHES[(xunStartBranch + 11) % 12],
  ];
}
