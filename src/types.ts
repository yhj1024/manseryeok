/**
 * 만세력 라이브러리 타입 정의
 */

import type {
  EARTHLY_BRANCHES,
  FIVE_ELEMENTS,
  HEAVENLY_STEMS,
  YIN_YANG,
} from './constants';

// ===== 기본 도메인 타입 =====

export type HeavenlyStem = (typeof HEAVENLY_STEMS)[number];
export type EarthlyBranch = (typeof EARTHLY_BRANCHES)[number];
export type YinYang = (typeof YIN_YANG)[number];
export type FiveElement = (typeof FIVE_ELEMENTS)[number];

/** 십신(十神) */
export type TenGod =
  | '비견'
  | '겁재'
  | '식신'
  | '상관'
  | '편재'
  | '정재'
  | '편관'
  | '정관'
  | '편인'
  | '정인';

/** 성별 (대운 계산에 사용) */
export type Gender = 'male' | 'female';

/** 일(日)의 경계 기준 */
export type DayBoundary = 'midnight' | 'jasi' | 'splitJasi';

// ===== 기둥(주) =====

/** 사주의 한 기둥 */
export interface Pillar {
  heavenlyStem: HeavenlyStem;
  earthlyBranch: EarthlyBranch;
}

/** 사주팔자 전체 */
export interface FourPillars {
  year: Pillar; // 연주
  month: Pillar; // 월주
  day: Pillar; // 일주
  hour: Pillar; // 시주
}

// ===== 입력 타입 =====

/** 진태양시(眞太陽時) 보정 옵션 */
export interface TrueSolarTimeOptions {
  /**
   * 출생지 경도(동경, degrees east). 기본값 127.5 (한반도 평균 자오선).
   * 예: 서울 126.978, 부산 129.075
   */
  longitude?: number;
  /** 균시차(Equation of Time) 보정 적용 여부. 기본 true */
  applyEquationOfTime?: boolean;
  /** 과거 표준시·서머타임(일광절약시간) 보정 적용 여부. 기본 true */
  applyHistoricalDst?: boolean;
}

/** 생년월일시 정보 */
export interface BirthInfo {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** true면 음력, false/undefined면 양력 */
  isLunar?: boolean;
  /** 음력 윤달 여부 (음력 입력 시에만 사용) */
  isLeapMonth?: boolean;
  /**
   * 진태양시 보정 옵션. 지정하지 않으면 보정 없이(입력 시각 그대로) 계산한다.
   * 객체를 넘기면 경도·균시차·과거 표준시 보정을 적용한다.
   */
  trueSolarTime?: TrueSolarTimeOptions;
  /**
   * 일(日)의 경계 기준. 23:00~23:59 출생의 일주·시주 천간 산출 방식을 결정한다.
   * - 'midnight' (기본): 자정(00:00)에 날짜가 바뀜. 일주·시주 모두 당일 일간 기준
   * - 'jasi': 자시(23:00)부터 다음날로 본다. 일주·시주 모두 다음날 일간 기준
   * - 'splitJasi': 일주는 당일 유지, 시주 천간만 다음날 일간 기준
   */
  dayBoundary?: DayBoundary;
  /** 성별. 대운(大運) 계산 시 필요 */
  gender?: Gender;
}

// ===== 날짜 변환 타입 =====

export interface LunarDate {
  year: number;
  month: number;
  day: number;
  isLeapMonth: boolean;
}

export interface SolarDate {
  year: number;
  month: number;
  day: number;
}

// ===== 부가 정보 타입 =====

/** 오행 한 쌍 (천간/지지) */
export interface ElementPair {
  stem: FiveElement;
  branch: FiveElement;
}

/** 음양 한 쌍 (천간/지지) */
export interface YinYangPair {
  stem: YinYang;
  branch: YinYang;
}

/** 대운 한 주기 */
export interface LuckPillar {
  /** 대운수에 해당하는 시작 나이 */
  age: number;
  /** 해당 대운의 간지 */
  pillar: Pillar;
  /** 한글 표기 (예: '갑자') */
  korean: string;
}

/** 대운 정보 전체 */
export interface LuckPillarInfo {
  /** 순행(true) / 역행(false) */
  forward: boolean;
  /** 대운수 (첫 대운 시작 나이, 연 단위 반올림) */
  startAge: number;
  /** 대운 시작 시점 — 연 단위 (절입까지 일수 ÷ 3의 정수부) */
  startYears: number;
  /** 대운 시작 시점 — 월 단위 잔여 (1일 = 4개월 환산) */
  startMonths: number;
  /** 대운 시작 시점 — 일 단위 잔여 */
  startDays: number;
  /** 대운 목록 */
  pillars: LuckPillar[];
}

/** 절기 정보 */
export interface SolarTerm {
  /** 절기 인덱스 (0=소한, 2=입춘 … 23=동지) */
  index: number;
  /** 절기 이름 (한글) */
  name: string;
  /** 절기 이름 (한자) */
  hanja: string;
  /**
   * 절입의 절대 순간 (UTC 기준 Date).
   * KST 로 표기하려면 `date.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })` 사용.
   */
  date: Date;
}
