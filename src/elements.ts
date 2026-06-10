/**
 * 천간·지지의 음양·오행 조회 함수 (공개 API).
 */

import type { EarthlyBranch, FiveElement, HeavenlyStem, YinYang } from './types';
import { BRANCH_ELEMENTS, EARTHLY_BRANCHES, HEAVENLY_STEMS, STEM_ELEMENTS } from './constants';
import { assertEarthlyBranch, assertHeavenlyStem } from './validation';

/** 천간의 음양 (갑·병·무·경·임 = 양) */
export function getHeavenlyStemYinYang(stem: HeavenlyStem): YinYang {
  assertHeavenlyStem(stem);
  return HEAVENLY_STEMS.indexOf(stem) % 2 === 0 ? '양' : '음';
}

/** 천간의 오행 */
export function getHeavenlyStemElement(stem: HeavenlyStem): FiveElement {
  assertHeavenlyStem(stem);
  return STEM_ELEMENTS[HEAVENLY_STEMS.indexOf(stem)];
}

/** 지지의 음양 (자·인·진·오·신·술 = 양) */
export function getEarthlyBranchYinYang(branch: EarthlyBranch): YinYang {
  assertEarthlyBranch(branch);
  return EARTHLY_BRANCHES.indexOf(branch) % 2 === 0 ? '양' : '음';
}

/** 지지의 오행 */
export function getEarthlyBranchElement(branch: EarthlyBranch): FiveElement {
  assertEarthlyBranch(branch);
  return BRANCH_ELEMENTS[EARTHLY_BRANCHES.indexOf(branch)];
}
