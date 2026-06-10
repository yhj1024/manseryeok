/**
 * 60갑자(六十甲子) 인덱스 산술.
 */

import type { Pillar } from './types';
import { EARTHLY_BRANCHES, HEAVENLY_STEMS } from './constants';

/**
 * 천간/지지 인덱스 → 60갑자 인덱스 (0=갑자 … 59=계해).
 * 60갑자는 천간(10)·지지(12)가 함께 순환하므로 두 인덱스의 홀짝이 같은 조합만 실재한다.
 * 실재하지 않는 조합(예: 갑축)은 RangeError.
 */
export function ganjiIndexOf(stemIndex: number, branchIndex: number): number {
  if ((stemIndex - branchIndex) % 2 !== 0) {
    throw new RangeError(
      `존재하지 않는 천간·지지 조합입니다: ${HEAVENLY_STEMS[stemIndex]}${EARTHLY_BRANCHES[branchIndex]}`,
    );
  }
  return (((6 * stemIndex - 5 * branchIndex) % 60) + 60) % 60;
}

/** 60갑자 인덱스 → 기둥 */
export function pillarFromGanji(ganjiIndex: number): Pillar {
  return {
    heavenlyStem: HEAVENLY_STEMS[ganjiIndex % 10],
    earthlyBranch: EARTHLY_BRANCHES[ganjiIndex % 12],
  };
}
