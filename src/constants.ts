/**
 * 만세력 계산에 사용되는 상수 정의
 * Constants for Manseryeok / Saju calculation
 */

import type { EarthlyBranch, FiveElement, HeavenlyStem, TenGod } from './types';

// ===== 천간 (Heavenly Stems) =====

/** 천간 (한글) */
export const HEAVENLY_STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;

/** 천간 (한자) */
export const HEAVENLY_STEMS_HANJA = [
  '甲',
  '乙',
  '丙',
  '丁',
  '戊',
  '己',
  '庚',
  '辛',
  '壬',
  '癸',
] as const;

// ===== 지지 (Earthly Branches) =====

/** 지지 (한글) */
export const EARTHLY_BRANCHES = [
  '자',
  '축',
  '인',
  '묘',
  '진',
  '사',
  '오',
  '미',
  '신',
  '유',
  '술',
  '해',
] as const;

/** 지지 (한자) */
export const EARTHLY_BRANCHES_HANJA = [
  '子',
  '丑',
  '寅',
  '卯',
  '辰',
  '巳',
  '午',
  '未',
  '申',
  '酉',
  '戌',
  '亥',
] as const;

// ===== 음양오행 =====

/** 음양 (Yin/Yang) */
export const YIN_YANG = ['양', '음'] as const;

/** 오행 (Five Elements) */
export const FIVE_ELEMENTS = ['목', '화', '토', '금', '수'] as const;

/** 천간의 오행 (인덱스 기준: 갑을=목, 병정=화, 무기=토, 경신=금, 임계=수) */
export const STEM_ELEMENTS: readonly FiveElement[] = [
  '목',
  '목',
  '화',
  '화',
  '토',
  '토',
  '금',
  '금',
  '수',
  '수',
];

/** 지지의 오행 (인덱스 기준) */
export const BRANCH_ELEMENTS: readonly FiveElement[] = [
  '수', // 자
  '토', // 축
  '목', // 인
  '목', // 묘
  '토', // 진
  '화', // 사
  '화', // 오
  '토', // 미
  '금', // 신
  '금', // 유
  '토', // 술
  '수', // 해
];

// ===== 지장간 본기 =====

/** 지지의 본기(정기) 천간 */
export const BRANCH_MAIN_STEM: Record<EarthlyBranch, HeavenlyStem> = {
  자: '계',
  축: '기',
  인: '갑',
  묘: '을',
  진: '무',
  사: '병',
  오: '정',
  미: '기',
  신: '경',
  유: '신',
  술: '무',
  해: '임',
};

// ===== 월지 매핑 (절기 월 → 지지) =====

/**
 * 절기 기준 월(1=인월 … 12=축월)에 대응하는 지지.
 * 인월(1)부터 시작하여 자월(11), 축월(12)로 끝난다.
 */
export const MONTH_BRANCHES: Record<number, EarthlyBranch> = {
  1: '인',
  2: '묘',
  3: '진',
  4: '사',
  5: '오',
  6: '미',
  7: '신',
  8: '유',
  9: '술',
  10: '해',
  11: '자',
  12: '축',
};

// ===== 오행 상생·상극 =====

/** 오행 상생: A 가 생하는 오행 (목→화→토→금→수→목) */
export const ELEMENT_GENERATES: Record<FiveElement, FiveElement> = {
  목: '화',
  화: '토',
  토: '금',
  금: '수',
  수: '목',
};

/** 오행 상극: A 가 극하는 오행 (목→토→수→화→금→목) */
export const ELEMENT_CONTROLS: Record<FiveElement, FiveElement> = {
  목: '토',
  토: '수',
  수: '화',
  화: '금',
  금: '목',
};

// ===== 십신 (Ten Gods) =====

/** 십신 한자 표기 */
export const TEN_GOD_HANJA: Record<TenGod, string> = {
  비견: '比肩',
  겁재: '劫財',
  식신: '食神',
  상관: '傷官',
  편재: '偏財',
  정재: '正財',
  편관: '偏官',
  정관: '正官',
  편인: '偏印',
  정인: '正印',
};

// ===== 일주 기준일 (60갑자 anchor) =====

/**
 * 일주 계산 기준일: 1992-10-24 (KST) = 계유일.
 * 계유 = 60갑자에서 (천간 계=9, 지지 유=9) → 인덱스 9.
 */
export const DAY_PILLAR_ANCHOR = {
  year: 1992,
  month: 10,
  day: 24,
  ganjiIndex: 9,
} as const;
