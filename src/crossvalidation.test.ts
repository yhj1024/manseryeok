import { describe, test, expect } from 'vitest';
import { calculateFourPillars, HEAVENLY_STEMS, EARTHLY_BRANCHES } from './index';
import { solarTermInstantMs } from './astro/solar-terms';
import {
  SOLAR_TERM_DATA_MAX_YEAR,
  SOLAR_TERM_DATA_MIN_YEAR,
} from './astro/solar-terms-data';
// @ts-expect-error - lunar-javascript 는 타입 정의를 제공하지 않는다 (devDependency, 교차검증 전용)
import { Solar } from 'lunar-javascript';

/**
 * 널리 검증된 6tail/lunar-javascript 와 60갑자 핵심 로직을 교차검증한다.
 *
 * 주의: 6tail 은 중국 표준시(UTC+8, 120°E) 기준이고 본 라이브러리는 KST(UTC+9) 기준이므로,
 * 절입(節入) 경계일에는 1시간 시차로 연주/월주가 달라질 수 있다(정상). 또한 자시(23시)는
 * 야자시/조자시 관법 차이가 있으므로 검증에서 제외한다.
 */

const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

function theirs(gz: string): string {
  return HEAVENLY_STEMS[GAN.indexOf(gz[0])] + EARTHLY_BRANCHES[ZHI.indexOf(gz[1])];
}

describe('6tail 교차검증 (핵심 60갑자)', () => {
  test('자시 제외 그리드에서 ≥98% 일치, 불일치는 절입 경계뿐', () => {
    let total = 0;
    let mismatch = 0;
    const nonBoundaryMismatch: string[] = [];

    for (let y = 1905; y <= 2095; y += 3) {
      for (const [m, d] of [
        [1, 10],
        [2, 4],
        [3, 21],
        [5, 15],
        [6, 21],
        [8, 8],
        [10, 20],
        [12, 22],
        [4, 5],
        [7, 7],
        [9, 9],
        [11, 7],
      ] as const) {
        for (const h of [1, 7, 13]) {
          total++;
          const r = calculateFourPillars({ year: y, month: m, day: d, hour: h, minute: 30 });
          const ba = Solar.fromYmdHms(y, m, d, h, 30, 0).getLunar().getEightChar();
          const ours = [r.yearString, r.monthString, r.dayString, r.hourString];
          const them = [
            theirs(ba.getYear()),
            theirs(ba.getMonth()),
            theirs(ba.getDay()),
            theirs(ba.getTime()),
          ];
          const diff = ours.map((o, i) => (o !== them[i] ? i : -1)).filter((i) => i >= 0);
          if (diff.length) {
            mismatch++;
            // 일주/시주(인덱스 2,3) 불일치는 절입 경계로 설명되지 않음 → 추적
            if (diff.some((i) => i >= 2)) {
              nonBoundaryMismatch.push(`${y}-${m}-${d} ${h}시: ${ours} vs ${them}`);
            }
          }
        }
      }
    }

    const matchRate = 1 - mismatch / total;
    expect(matchRate).toBeGreaterThanOrEqual(0.98);
    // 일주/시주가 어긋나는 경우는 없어야 한다 (절입 경계는 연주/월주만 영향)
    expect(nonBoundaryMismatch).toEqual([]);
  });
});

describe('절입 시각 전수 스윕 (1800~2300 × 24절기)', () => {
  test('전 절기 절입 분(分)이 6tail 천문 계산과 1분 이내 일치', () => {
    const BEIJING_OFFSET_MS = 8 * 3600 * 1000;
    let maxAbsDiff = 0;
    let worst = '';

    for (let y = SOLAR_TERM_DATA_MIN_YEAR; y <= SOLAR_TERM_DATA_MAX_YEAR; y++) {
      // 해당 양력 연도에 속하는 24개 절기 (6tail 은 CST 벽시계 → UTC 환산)
      const table = Solar.fromYmd(y, 1, 1).getLunar().getJieQiTable();
      const theirsMinutes = (Object.values(table) as Array<{
        getYear(): number;
        getMonth(): number;
        getDay(): number;
        getHour(): number;
        getMinute(): number;
        getSecond(): number;
      }>)
        .filter((s) => s.getYear() === y)
        .map((s) =>
          Math.round(
            (Date.UTC(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour(), s.getMinute(), s.getSecond()) -
              BEIJING_OFFSET_MS) /
              60000,
          ),
        )
        .sort((a, b) => a - b);
      expect(theirsMinutes).toHaveLength(24);

      for (let i = 0; i < 24; i++) {
        const oursMin = solarTermInstantMs(y, i) / 60000;
        const diff = Math.abs(oursMin - theirsMinutes[i]);
        if (diff > maxAbsDiff) {
          maxAbsDiff = diff;
          worst = `${y}년 절기 ${i}`;
        }
      }
    }

    // 절입표는 6tail 값으로 생성되었으므로 사실상 0분, 반올림 여유로 1분까지 허용
    expect(maxAbsDiff, `최대 오차 위치: ${worst}`).toBeLessThanOrEqual(1);
  });
});
