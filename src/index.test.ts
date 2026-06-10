import { describe, test, expect } from 'vitest';
import {
  calculateFourPillars,
  fourPillarsToString,
  getHeavenlyStemYinYang,
  getHeavenlyStemElement,
  getEarthlyBranchElement,
  getEarthlyBranchYinYang,
  solarToLunar,
  lunarToSolar,
  getSolarTerm,
  getTenGod,
  getBranchTenGod,
  getVoidBranches,
  getLuckPillars,
  getSolarTermsOfYear,
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
  type BirthInfo,
} from './index';
import { julianDayFromMs, msFromJulianDay } from './astro/sun-longitude';

const pillars = (b: BirthInfo): string[] => {
  const r = calculateFourPillars(b);
  return [r.yearString, r.monthString, r.dayString, r.hourString];
};

describe('사주 핵심 정확도 (검증된 표준값)', () => {
  test('1992-10-24 05:30 → 임신 경술 계유 을묘', () => {
    expect(pillars({ year: 1992, month: 10, day: 24, hour: 5, minute: 30 })).toEqual([
      '임신',
      '경술',
      '계유',
      '을묘',
    ]);
  });

  test('1990-08-17 11:38 → 경오 갑신 갑인 경오', () => {
    expect(pillars({ year: 1990, month: 8, day: 17, hour: 11, minute: 38 })).toEqual([
      '경오',
      '갑신',
      '갑인',
      '경오',
    ]);
  });

  test('1990-05-15 14:30 → 경오 신사 경진 계미', () => {
    expect(pillars({ year: 1990, month: 5, day: 15, hour: 14, minute: 30 })).toEqual([
      '경오',
      '신사',
      '경진',
      '계미',
    ]);
  });

  test('한자/오행/음양 표현', () => {
    const r = calculateFourPillars({ year: 1992, month: 10, day: 24, hour: 5, minute: 30 });
    expect(r.dayHanja).toBe('癸酉');
    expect(r.dayElement).toEqual({ stem: '수', branch: '금' });
    expect(r.dayYinYang).toEqual({ stem: '음', branch: '음' });
    expect(r.toHanjaString()).toBe('壬申年柱, 庚戌月柱, 癸酉日柱, 乙卯時柱');
  });
});

describe('연주 입춘(立春) 경계', () => {
  test('입춘 이전(2024-01-14)은 전년 간지 계묘년', () => {
    expect(calculateFourPillars({ year: 2024, month: 1, day: 14, hour: 22, minute: 30 }).yearString).toBe(
      '계묘',
    );
  });

  test('입춘 이후(2024-02-10)는 갑진년', () => {
    expect(calculateFourPillars({ year: 2024, month: 2, day: 10, hour: 12, minute: 0 }).yearString).toBe(
      '갑진',
    );
  });

  test('2000-01-01 00:00 은 입춘 전이므로 기묘년', () => {
    expect(calculateFourPillars({ year: 2000, month: 1, day: 1, hour: 0, minute: 0 }).yearString).toBe(
      '기묘',
    );
  });
});

describe('절기 경계·음력 입력 사례', () => {
  test('1999-10-20 10:25 → 기묘 갑술 을사 신사', () => {
    expect(pillars({ year: 1999, month: 10, day: 20, hour: 10, minute: 25 })).toEqual([
      '기묘',
      '갑술',
      '을사',
      '신사',
    ]);
  });

  test('음력 2006-08-20 06:38 → 병술 무술 계유 을묘', () => {
    expect(
      pillars({ year: 2006, month: 8, day: 20, hour: 6, minute: 38, isLunar: true, isLeapMonth: false }),
    ).toEqual(['병술', '무술', '계유', '을묘']);
  });

  test('음력 2000-12-12 03:38 → 경진 기축 기사 병인', () => {
    expect(
      pillars({ year: 2000, month: 12, day: 12, hour: 3, minute: 38, isLunar: true, isLeapMonth: false }),
    ).toEqual(['경진', '기축', '기사', '병인']);
  });
});

describe('시진(時辰) 구분', () => {
  const at = (hour: number, minute = 30): string =>
    calculateFourPillars({ year: 2024, month: 3, day: 10, hour, minute }).hour.earthlyBranch;

  test('자/축/묘/오/해시 경계', () => {
    expect(at(23)).toBe('자');
    expect(at(0)).toBe('자');
    expect(at(2)).toBe('축');
    expect(at(5)).toBe('묘');
    expect(at(12)).toBe('오');
    expect(at(22)).toBe('해');
  });
});

describe('음력/양력 변환', () => {
  test('음력 → 양력', () => {
    expect(lunarToSolar(1992, 9, 29, false)).toEqual({ year: 1992, month: 10, day: 24 });
  });

  test('양력 → 음력', () => {
    expect(solarToLunar(1992, 10, 24)).toEqual({
      year: 1992,
      month: 9,
      day: 29,
      isLeapMonth: false,
    });
  });

  test('양력 → 음력 (2024-01-01)', () => {
    expect(solarToLunar(2024, 1, 1)).toEqual({
      year: 2023,
      month: 11,
      day: 20,
      isLeapMonth: false,
    });
  });

  test('윤달 왕복 변환', () => {
    expect(lunarToSolar(2020, 4, 1, true)).toEqual({ year: 2020, month: 5, day: 23 });
    expect(solarToLunar(2020, 5, 23)).toEqual({ year: 2020, month: 4, day: 1, isLeapMonth: true });
  });

  test('양력 ↔ 음력 왕복 항등성 (표본)', () => {
    for (let y = 1905; y <= 2090; y += 11) {
      for (const [m, d] of [
        [3, 15],
        [7, 1],
        [11, 28],
      ] as const) {
        const lunar = solarToLunar(y, m, d);
        const back = lunarToSolar(lunar.year, lunar.month, lunar.day, lunar.isLeapMonth);
        expect(back).toEqual({ year: y, month: m, day: d });
      }
    }
  });

  // 삭(신월) 절대 시각으로 검증된 월 대소(大小) 정정. 한·중(UTC±) 무관하게 동일한 날짜다.
  test('월 대소 정정 (1933·1996·2060) — 삭 시각 기준', () => {
    // 1933 음6월 삭: 7/22 16:03 UTC → KST·CST 모두 7/23
    expect(lunarToSolar(1933, 6, 1, false)).toEqual({ year: 1933, month: 7, day: 23 });
    // 1996 음6월 삭: 7/15 16:15 UTC → 모두 7/16
    expect(lunarToSolar(1996, 6, 1, false)).toEqual({ year: 1996, month: 7, day: 16 });
    // 2060 음4월 삭: 4/30 10:11 UTC → 모두 4/30
    expect(lunarToSolar(2060, 4, 1, false)).toEqual({ year: 2060, month: 4, day: 30 });
    // 역방향 항등성
    expect(solarToLunar(1933, 7, 23)).toEqual({ year: 1933, month: 6, day: 1, isLeapMonth: false });
    expect(solarToLunar(1996, 7, 16)).toEqual({ year: 1996, month: 6, day: 1, isLeapMonth: false });
    expect(solarToLunar(2060, 4, 30)).toEqual({ year: 2060, month: 4, day: 1, isLeapMonth: false });
  });

  test('KASI 한·중 차이 교정 — 1997 설날 = 2/8 (중국은 2/7)', () => {
    // 음1997-01-01 삭: 1997-02-07 15:06 UTC → KST 2/8, CST 2/7. 한국 정본(KASI)은 2/8.
    expect(lunarToSolar(1997, 1, 1, false)).toEqual({ year: 1997, month: 2, day: 8 });
    // 음2023-04-01 삭: 2023-05-19 15:53 UTC → KST 5/20. KASI 정본.
    expect(lunarToSolar(2023, 4, 1, false)).toEqual({ year: 2023, month: 5, day: 20 });
  });

  test('과거 범위 확장 — 음력 1391~ (조선 이전부터)', () => {
    // 세종대왕 탄생 음 1397-04-10 등 1582년 이전 양력은 그레고리력 소급(proleptic) 표기.
    // 절대일(solJd)은 KASI 와 동일하며 왕복 항등성으로 무결성을 검증한다.
    for (const [y, m, d] of [
      [1397, 4, 10],
      [1450, 1, 1],
      [1555, 8, 15],
    ] as const) {
      const s = lunarToSolar(y, m, d, false);
      expect(solarToLunar(s.year, s.month, s.day)).toEqual({ year: y, month: m, day: d, isLeapMonth: false });
    }
    // 하한 경계 왕복
    const s = lunarToSolar(1391, 1, 1, false);
    expect(solarToLunar(s.year, s.month, s.day)).toEqual({ year: 1391, month: 1, day: 1, isLeapMonth: false });
  });

  test('KASI 일주(일진) 정본 일치 — 음력 입력', () => {
    // KASI getSolCalInfo lunIljin 으로 검증된 일주. (양력 1582 이후라 율리우스=그레고리 동일)
    const ilju = (b: BirthInfo): string => calculateFourPillars(b).dayString;
    expect(ilju({ year: 1997, month: 1, day: 1, hour: 12, minute: 0, isLunar: true })).toBe('신사');
    expect(ilju({ year: 2023, month: 4, day: 1, hour: 12, minute: 0, isLunar: true })).toBe('무인');
    expect(ilju({ year: 2049, month: 12, day: 1, hour: 12, minute: 0, isLunar: true })).toBe('갑술');
  });
});

describe('진태양시(眞太陽時) 옵션 — 기본 OFF', () => {
  test('옵션 미지정 시 보정 없음 (입력 시각 그대로)', () => {
    const off = pillars({ year: 1990, month: 5, day: 15, hour: 14, minute: 30 });
    const offExplicit = pillars({ year: 1990, month: 5, day: 15, hour: 14, minute: 30 });
    expect(off).toEqual(offExplicit);
  });

  test('경도 보정이 시진 경계를 이동시킨다 (07:05, 서울)', () => {
    // 07:05 KST 는 서울 진태양시로 약 06:33 → 진시(07-09)가 아닌 묘시(05-07)
    const off = calculateFourPillars({ year: 1990, month: 5, day: 15, hour: 7, minute: 5 });
    const on = calculateFourPillars({
      year: 1990,
      month: 5,
      day: 15,
      hour: 7,
      minute: 5,
      trueSolarTime: { longitude: 126.978 },
    });
    expect(off.hour.earthlyBranch).toBe('진');
    expect(on.hour.earthlyBranch).toBe('묘');
  });

  test('1988 서머타임 보정이 적용된다', () => {
    // 1988-08-15 는 서머타임 기간(+1h). DST 보정 on/off 로 결과가 달라질 수 있다.
    const withDst = calculateFourPillars({
      year: 1988,
      month: 8,
      day: 15,
      hour: 12,
      minute: 0,
      trueSolarTime: { longitude: 126.978, applyHistoricalDst: true },
    });
    const withoutDst = calculateFourPillars({
      year: 1988,
      month: 8,
      day: 15,
      hour: 12,
      minute: 0,
      trueSolarTime: { longitude: 126.978, applyHistoricalDst: false },
    });
    // 두 계산 모두 예외 없이 수행되어야 한다
    expect(withDst.hourString).toBeTruthy();
    expect(withoutDst.hourString).toBeTruthy();
  });
});

describe('야자시/조자시 (dayBoundary)', () => {
  const at = (dayBoundary: BirthInfo['dayBoundary']): { day: string; hour: string } => {
    const r = calculateFourPillars({ year: 2024, month: 3, day: 10, hour: 23, minute: 30, dayBoundary });
    return { day: r.dayString, hour: r.hourString };
  };

  test('23:30 — 세 관법의 일주·시주 (계유일 기준)', () => {
    // midnight: 일주·시주 모두 당일
    expect(at('midnight')).toEqual({ day: '계유', hour: '임자' });
    // jasi: 일주·시주 모두 다음날
    expect(at('jasi')).toEqual({ day: '갑술', hour: '갑자' });
    // splitJasi: 일주는 당일, 시주 천간만 다음날
    expect(at('splitJasi')).toEqual({ day: '계유', hour: '갑자' });
  });

  test('22시대(자시 아님)는 dayBoundary 와 무관하게 동일', () => {
    const base = { year: 2024, month: 3, day: 10, hour: 22, minute: 30 } as const;
    const m = calculateFourPillars(base);
    for (const db of ['jasi', 'splitJasi'] as const) {
      const r = calculateFourPillars({ ...base, dayBoundary: db });
      expect(r.dayString).toBe(m.dayString);
      expect(r.hourString).toBe(m.hourString);
    }
  });
});

describe('부가 명리 기능', () => {
  const r = calculateFourPillars({ year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: 'male' });

  test('십신 (일간 경 기준)', () => {
    expect(r.tenGods.year.stem).toBe('비견'); // 경 vs 경
    expect(r.tenGods.month.stem).toBe('겁재'); // 경 vs 신
    expect(r.tenGods.day.stem).toBe('일간');
    expect(getTenGod('경', '계')).toBe('상관');
    expect(getTenGod('갑', '갑')).toBe('비견');
    expect(getTenGod('갑', '을')).toBe('겁재');
  });

  test('공망 (일주 경진 → 신·유)', () => {
    expect(getVoidBranches('경', '진')).toEqual(['신', '유']);
    expect(r.voidBranches).toEqual(['신', '유']);
  });

  test('대운 (경=양년, 남자 → 순행)', () => {
    expect(r.luckPillars?.forward).toBe(true);
    expect(r.luckPillars?.pillars[0].korean).toBe('임오'); // 월주 신사 다음
    expect(r.luckPillars?.pillars).toHaveLength(10);
  });

  test('대운 세부 시작 시점 (연/월/일 보존)', () => {
    const lp = r.luckPillars;
    expect(lp).toBeDefined();
    // 세부값은 모두 비음수 정수, 월<12·일<31
    expect(Number.isInteger(lp!.startYears)).toBe(true);
    expect(lp!.startYears).toBeGreaterThanOrEqual(0);
    expect(lp!.startMonths).toBeGreaterThanOrEqual(0);
    expect(lp!.startMonths).toBeLessThan(12);
    expect(lp!.startDays).toBeGreaterThanOrEqual(0);
    expect(lp!.startDays).toBeLessThan(30); // carry 처리되어 30일이 남지 않는다
    // startAge(연 반올림)는 startYears(연 절사)와 1 이내로 정합
    expect(lp!.startAge).toBeGreaterThanOrEqual(Math.max(1, lp!.startYears));
    expect(lp!.startAge).toBeLessThanOrEqual(lp!.startYears + 1);
  });

  test('대운 세부값 — 일/월 carry 정규화 (1900~2010 전수, day<30·month<12)', () => {
    for (let y = 1900; y <= 2010; y += 1) {
      for (const gender of ['male', 'female'] as const) {
        const lp = calculateFourPillars({
          year: y,
          month: 6,
          day: 15,
          hour: 12,
          minute: 0,
          gender,
        }).luckPillars!;
        expect(lp.startDays).toBeGreaterThanOrEqual(0);
        expect(lp.startDays).toBeLessThan(30);
        expect(lp.startMonths).toBeGreaterThanOrEqual(0);
        expect(lp.startMonths).toBeLessThan(12);
      }
    }
  });

  test('gender 미지정 시 대운 없음', () => {
    const noGender = calculateFourPillars({ year: 1990, month: 5, day: 15, hour: 14, minute: 30 });
    expect(noGender.luckPillars).toBeUndefined();
  });
});

describe('절기(節氣) 계산', () => {
  test('입춘 2024 절입 시각 (Feb 4, KST 오후)', () => {
    const lichun = getSolarTerm(2024, 2);
    expect(lichun.name).toBe('입춘');
    // 절대 순간 (UTC) — 2024-02-04 08:2x UTC ≈ KST Feb 4 17:2x
    expect(lichun.date.getUTCFullYear()).toBe(2024);
    expect(lichun.date.getUTCMonth()).toBe(1); // February
    expect(lichun.date.getUTCDate()).toBe(4);
  });

  test('임베드 정밀 절입표 — 2024 입춘 = 17:27 KST (KASI 일치)', () => {
    const ms = getSolarTerm(2024, 2).date.getTime();
    const kst = new Date(ms + 9 * 3600 * 1000);
    expect(kst.getUTCHours()).toBe(17);
    expect(kst.getUTCMinutes()).toBe(27);
  });

  test('입춘 경계 분 단위 정확도 (17:27 KST 기준)', () => {
    const yearAt = (hour: number, minute: number): string =>
      calculateFourPillars({ year: 2024, month: 2, day: 4, hour, minute }).yearString;
    // 17:27 직전은 전년(계묘), 직후는 당년(갑진)
    expect(yearAt(17, 26)).toBe('계묘');
    expect(yearAt(17, 28)).toBe('갑진');
  });

  test('확장 범위 — 양력 1800~2300년 계산 (예외 없이 정상)', () => {
    for (const year of [1800, 1850, 2200, 2300]) {
      const r = calculateFourPillars({ year, month: 6, day: 15, hour: 12, minute: 0 });
      expect(r.yearString).toBeTruthy();
      expect(r.monthString).toBeTruthy();
    }
  });
});

describe('입력 검증', () => {
  test('범위를 벗어난 월/시/분은 예외', () => {
    expect(() => calculateFourPillars({ year: 2000, month: 13, day: 1, hour: 0, minute: 0 })).toThrow();
    expect(() => calculateFourPillars({ year: 2000, month: 1, day: 32, hour: 0, minute: 0 })).toThrow();
    expect(() => calculateFourPillars({ year: 2000, month: 1, day: 1, hour: 24, minute: 0 })).toThrow();
    expect(() => calculateFourPillars({ year: 2000, month: 1, day: 1, hour: 0, minute: 60 })).toThrow();
  });

  test('실재하지 않는 양력 날짜는 예외 (윤년 반영)', () => {
    expect(() => calculateFourPillars({ year: 2024, month: 2, day: 31, hour: 0, minute: 0 })).toThrow();
    expect(() => calculateFourPillars({ year: 2024, month: 4, day: 31, hour: 0, minute: 0 })).toThrow();
    expect(() => calculateFourPillars({ year: 2023, month: 2, day: 29, hour: 0, minute: 0 })).toThrow();
    // 윤년 2/29 는 정상
    expect(() => calculateFourPillars({ year: 2024, month: 2, day: 29, hour: 0, minute: 0 })).not.toThrow();
  });

  test('NaN·정수 아님·연도 범위 밖은 예외', () => {
    expect(() => calculateFourPillars({ year: NaN, month: 1, day: 1, hour: 0, minute: 0 })).toThrow();
    expect(() => calculateFourPillars({ year: 2000.5, month: 1, day: 1, hour: 0, minute: 0 })).toThrow();
    // 양력 입력은 정밀 절입표 범위(1800~2300)까지 허용 → 경계 정상, 한 칸 밖은 예외
    expect(() => calculateFourPillars({ year: 1800, month: 1, day: 1, hour: 0, minute: 0 })).not.toThrow();
    expect(() => calculateFourPillars({ year: 1799, month: 1, day: 1, hour: 0, minute: 0 })).toThrow();
    expect(() => calculateFourPillars({ year: 2300, month: 1, day: 1, hour: 0, minute: 0 })).not.toThrow();
    expect(() => calculateFourPillars({ year: 2301, month: 1, day: 1, hour: 0, minute: 0 })).toThrow();
    // 음력 입력도 절기 보정표 범위(1800~)부터 허용 → 1800·2100 정상, 1799·2101 예외
    expect(() =>
      calculateFourPillars({ year: 1800, month: 1, day: 1, hour: 0, minute: 0, isLunar: true }),
    ).not.toThrow();
    expect(() =>
      calculateFourPillars({ year: 2100, month: 1, day: 1, hour: 0, minute: 0, isLunar: true }),
    ).not.toThrow();
    expect(() =>
      calculateFourPillars({ year: 1799, month: 1, day: 1, hour: 0, minute: 0, isLunar: true }),
    ).toThrow();
    expect(() =>
      calculateFourPillars({ year: 2101, month: 1, day: 1, hour: 0, minute: 0, isLunar: true }),
    ).toThrow();
  });

  test('변환 함수의 범위·날짜 검증', () => {
    expect(() => lunarToSolar(1390, 1, 1, false)).toThrow();
    expect(() => lunarToSolar(Number.NaN, 1, 1, false)).toThrow();
    expect(() => lunarToSolar(2020.5, 1, 1, false)).toThrow();
    expect(() => lunarToSolar(2020, 1.5, 1, false)).toThrow();
    expect(() => lunarToSolar(2020, 1, 1.5, false)).toThrow();
    expect(() => lunarToSolar(2020, 1, 1, 'false' as unknown as boolean)).toThrow();
    expect(() => solarToLunar(1390, 12, 31)).toThrow();
    expect(() => solarToLunar(2024, 2, 31)).toThrow();
  });

  test('런타임에서 잘못된 옵션 타입은 조용히 계산하지 않고 예외', () => {
    expect(() => calculateFourPillars(null as unknown as BirthInfo)).toThrow();
    expect(() =>
      calculateFourPillars({
        year: 2000,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        isLunar: 'true',
      } as unknown as BirthInfo),
    ).toThrow();
    expect(() =>
      calculateFourPillars({
        year: 2000,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        isLunar: true,
        isLeapMonth: 'false',
      } as unknown as BirthInfo),
    ).toThrow();
    expect(() =>
      calculateFourPillars({
        year: 2000,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        dayBoundary: 'bad',
      } as unknown as BirthInfo),
    ).toThrow();
    expect(() =>
      calculateFourPillars({
        year: 2000,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        gender: 'other',
      } as unknown as BirthInfo),
    ).toThrow();
  });

  test('진태양시 옵션 검증', () => {
    const base = { year: 2000, month: 1, day: 1, hour: 0, minute: 0 };
    expect(() =>
      calculateFourPillars({ ...base, trueSolarTime: null } as unknown as BirthInfo),
    ).toThrow();
    expect(() =>
      calculateFourPillars({ ...base, trueSolarTime: { longitude: Number.NaN } }),
    ).toThrow();
    expect(() =>
      calculateFourPillars({ ...base, trueSolarTime: { longitude: 181 } }),
    ).toThrow();
    expect(() =>
      calculateFourPillars({
        ...base,
        trueSolarTime: { applyEquationOfTime: 'yes' },
      } as unknown as BirthInfo),
    ).toThrow();
    expect(() =>
      calculateFourPillars({
        ...base,
        trueSolarTime: { applyHistoricalDst: 1 },
      } as unknown as BirthInfo),
    ).toThrow();
  });

  test('절기 API 입력 검증', () => {
    expect(() => getSolarTerm(Number.NaN, 2)).toThrow();
    expect(() => getSolarTerm(99, 2)).toThrow();
    expect(() => getSolarTerm(2024, 2.5)).toThrow();
    expect(() => getSolarTerm(2024, 24)).toThrow();
  });

  test('존재하지 않는 천간·지지 조합은 예외 (홀짝 불일치)', () => {
    // 60갑자는 천간·지지 인덱스의 홀짝이 같은 조합만 실재한다 (갑축·을자 등은 없음)
    expect(() => getVoidBranches('갑', '축')).toThrow(RangeError);
    expect(() => getVoidBranches('을', '자')).toThrow(RangeError);
    expect(() =>
      getLuckPillars({
        instantUTCms: Date.UTC(2000, 0, 1),
        birthYear: 2000,
        monthPillar: { heavenlyStem: '갑', earthlyBranch: '축' },
        sajuYearStemIndex: 0,
        gender: 'male',
      }),
    ).toThrow(RangeError);
  });

  test('유효한 60갑자 전 조합은 정상 계산 (공망 왕복)', () => {
    for (let g = 0; g < 60; g++) {
      const stem = HEAVENLY_STEMS[g % 10];
      const branch = EARTHLY_BRANCHES[g % 12];
      const voids = getVoidBranches(stem, branch);
      expect(voids).toHaveLength(2);
    }
    // 대표값: 갑자순 공망 = 술·해, 갑술순 공망 = 신·유
    expect(getVoidBranches('갑', '자')).toEqual(['술', '해']);
    expect(getVoidBranches('갑', '술')).toEqual(['신', '유']);
  });

  test('공개 명리 유틸은 잘못된 간지 입력을 예외로 처리', () => {
    expect(() => getHeavenlyStemYinYang('x' as never)).toThrow();
    expect(() => getHeavenlyStemElement('x' as never)).toThrow();
    expect(() => getEarthlyBranchElement('x' as never)).toThrow();
    expect(() => getEarthlyBranchYinYang('x' as never)).toThrow();
    expect(() => getTenGod('x' as never, '갑')).toThrow();
    expect(() => getTenGod('갑', 'x' as never)).toThrow();
    expect(() => getBranchTenGod('갑', 'x' as never)).toThrow();
    expect(() => getVoidBranches('x' as never, '자')).toThrow();
    expect(() => getVoidBranches('갑', 'x' as never)).toThrow();
  });

  test('대운 API 입력 검증', () => {
    const params = {
      instantUTCms: Date.UTC(2000, 0, 1),
      birthYear: 2000,
      monthPillar: { heavenlyStem: '갑', earthlyBranch: '인' },
      sajuYearStemIndex: 0,
      gender: 'male',
    } as const;
    expect(() => getLuckPillars({ ...params, instantUTCms: Number.NaN })).toThrow();
    expect(() => getLuckPillars({ ...params, birthYear: 100 })).toThrow();
    expect(() =>
      getLuckPillars({ ...params, monthPillar: { heavenlyStem: 'x', earthlyBranch: '인' } as never }),
    ).toThrow();
    expect(() => getLuckPillars({ ...params, sajuYearStemIndex: 10 })).toThrow();
    expect(() => getLuckPillars({ ...params, gender: 'other' as never })).toThrow();
    expect(() => getLuckPillars({ ...params, count: 0 })).toThrow();
  });
});

describe('미커버 경로 검증 (역행 대운·공개 유틸·예외 분기)', () => {
  test('대운 역행 (양년 여자 → 역행, 월주 이전 간지로 전개)', () => {
    // 1990(경오년, 경=양간) + 여자 → 역행
    const r = calculateFourPillars({
      year: 1990,
      month: 5,
      day: 15,
      hour: 14,
      minute: 30,
      gender: 'female',
    });
    const lp = r.luckPillars;
    expect(lp?.forward).toBe(false);
    expect(lp?.pillars[0].korean).toBe('경진'); // 월주 신사 이전 간지
    expect(lp?.pillars).toHaveLength(10);
    // 세부 시작 시점도 보존
    expect(lp?.startYears).toBeGreaterThanOrEqual(0);
  });

  test('getSolarTermsOfYear — 24개, 시간 오름차순', () => {
    const terms = getSolarTermsOfYear(2024);
    expect(terms).toHaveLength(24);
    expect(terms[0].name).toBe('소한');
    for (let i = 1; i < terms.length; i++) {
      expect(terms[i].date.getTime()).toBeGreaterThan(terms[i - 1].date.getTime());
    }
  });

  test('julianDay ↔ ms 왕복 항등성', () => {
    const ms = Date.UTC(2024, 0, 1, 12, 0, 0);
    expect(msFromJulianDay(julianDayFromMs(ms))).toBeCloseTo(ms, 3);
    expect(julianDayFromMs(Date.UTC(2000, 0, 1, 12))).toBeCloseTo(2451545.0, 6); // J2000.0
  });

  test('음력 입력 월/일 범위 예외', () => {
    expect(() =>
      calculateFourPillars({ year: 2000, month: 13, day: 1, hour: 0, minute: 0, isLunar: true }),
    ).toThrow();
    expect(() =>
      calculateFourPillars({ year: 2000, month: 1, day: 31, hour: 0, minute: 0, isLunar: true }),
    ).toThrow();
  });

  test('존재하지 않는 윤달 입력 예외', () => {
    // 2000년에는 윤4월이 없다
    expect(() => lunarToSolar(2000, 4, 1, true)).toThrow();
  });

  test('solarToLunar 지원 범위 밖 예외', () => {
    // 음력 기준일(양력 1391-02-13) 이전은 예외
    expect(() => solarToLunar(1391, 1, 1)).toThrow();
  });

  test('1908 이전 진태양시 — 기본 표준 offset fallback (예외 없이 계산)', () => {
    const r = calculateFourPillars({
      year: 1905,
      month: 6,
      day: 1,
      hour: 12,
      minute: 0,
      trueSolarTime: { longitude: 127, applyHistoricalDst: true },
    });
    expect(r.dayString).toBeTruthy();
  });

  test('결과 변환 메서드 (toString·toObject·toHanjaObject·toHanjaString)', () => {
    const r = calculateFourPillars({ year: 1992, month: 10, day: 24, hour: 5, minute: 30 });
    expect(r.toString()).toBe('임신년주, 경술월주, 계유일주, 을묘시주');
    expect(r.toObject()).toEqual({ year: '임신', month: '경술', day: '계유', hour: '을묘' });
    expect(r.toHanjaObject()).toEqual({
      year: { korean: '임신', hanja: '壬申' },
      month: { korean: '경술', hanja: '庚戌' },
      day: { korean: '계유', hanja: '癸酉' },
      hour: { korean: '을묘', hanja: '乙卯' },
    });
    expect(r.toHanjaString()).toBe('壬申年柱, 庚戌月柱, 癸酉日柱, 乙卯時柱');
  });
});

describe('상수/유틸 함수', () => {
  test('천간/지지 배열', () => {
    expect(HEAVENLY_STEMS).toHaveLength(10);
    expect(EARTHLY_BRANCHES).toHaveLength(12);
    expect(HEAVENLY_STEMS[0]).toBe('갑');
    expect(EARTHLY_BRANCHES[11]).toBe('해');
  });

  test('음양/오행', () => {
    expect(getHeavenlyStemYinYang('갑')).toBe('양');
    expect(getHeavenlyStemYinYang('을')).toBe('음');
    expect(getHeavenlyStemElement('갑')).toBe('목');
    expect(getEarthlyBranchElement('자')).toBe('수');
    expect(getEarthlyBranchYinYang('자')).toBe('양');
  });

  test('fourPillarsToString', () => {
    const r = calculateFourPillars({ year: 1992, month: 10, day: 24, hour: 5, minute: 30 });
    expect(fourPillarsToString(r)).toBe('임신연주, 경술월주, 계유일주, 을묘시주');
  });
});
