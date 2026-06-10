import { EARTHLY_BRANCHES, HEAVENLY_STEMS } from './constants';
import type { DayBoundary, EarthlyBranch, Gender, HeavenlyStem, Pillar } from './types';

export function assertIntegerInRange(
  value: unknown,
  min: number,
  max: number,
  name: string,
): asserts value is number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new RangeError(`${name}은 정수여야 합니다: ${String(value)}`);
  }
  if (value < min || value > max) {
    throw new RangeError(`${name}은 ${min}~${max} 범위여야 합니다: ${value}`);
  }
}

export function assertFiniteNumber(value: unknown, name: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new RangeError(`${name}은 유한한 숫자여야 합니다: ${String(value)}`);
  }
}

export function assertBoolean(value: unknown, name: string): asserts value is boolean {
  if (typeof value !== 'boolean') {
    throw new TypeError(`${name}은 boolean 이어야 합니다: ${String(value)}`);
  }
}

export function assertOptionalBoolean(value: unknown, name: string): void {
  if (value !== undefined) {
    assertBoolean(value, name);
  }
}

export function assertHeavenlyStem(
  value: unknown,
  name = '천간',
): asserts value is HeavenlyStem {
  if (typeof value !== 'string' || !(HEAVENLY_STEMS as readonly string[]).includes(value)) {
    throw new RangeError(`${name}은 유효한 천간이어야 합니다: ${String(value)}`);
  }
}

export function assertEarthlyBranch(
  value: unknown,
  name = '지지',
): asserts value is EarthlyBranch {
  if (typeof value !== 'string' || !(EARTHLY_BRANCHES as readonly string[]).includes(value)) {
    throw new RangeError(`${name}은 유효한 지지여야 합니다: ${String(value)}`);
  }
}

export function assertPillar(value: unknown, name = '기둥'): asserts value is Pillar {
  if (value === null || typeof value !== 'object') {
    throw new TypeError(`${name}은 객체여야 합니다.`);
  }
  const pillar = value as Partial<Pillar>;
  assertHeavenlyStem(pillar.heavenlyStem, `${name}.heavenlyStem`);
  assertEarthlyBranch(pillar.earthlyBranch, `${name}.earthlyBranch`);
}

export function assertGender(value: unknown, name = '성별(gender)'): asserts value is Gender {
  if (value !== 'male' && value !== 'female') {
    throw new RangeError(`${name}은 'male' 또는 'female' 이어야 합니다: ${String(value)}`);
  }
}

export function assertDayBoundary(
  value: unknown,
  name = '일 경계(dayBoundary)',
): asserts value is DayBoundary {
  if (value !== 'midnight' && value !== 'jasi' && value !== 'splitJasi') {
    throw new RangeError(
      `${name}는 'midnight', 'jasi', 'splitJasi' 중 하나여야 합니다: ${String(value)}`,
    );
  }
}
