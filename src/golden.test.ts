import { describe, test, expect } from 'vitest';
import { calculateFourPillars, type BirthInfo } from './index';

/**
 * 표준 만세력 골든 데이터.
 *
 * 각 사례는 한국천문연구원(KASI) 만세력 기준의 표준값과 일치하며, 보정 없는
 * KST 표준시 + 자정 일 경계로 계산한다. 절기 절입 경계에서 충분히 떨어진 날짜만
 * 선정해 ephemeris 미세 오차에 영향받지 않도록 했다.
 */
const GOLDEN: Array<{ birth: BirthInfo; expected: [string, string, string, string] }> = [
  { birth: { year: 1936, month: 8, day: 25, hour: 7, minute: 30 }, expected: ['병자', '병신', '기묘', '무진'] },
  { birth: { year: 1948, month: 5, day: 1, hour: 12, minute: 0 }, expected: ['무자', '병진', '병술', '갑오'] },
  { birth: { year: 1960, month: 3, day: 15, hour: 10, minute: 0 }, expected: ['경자', '기묘', '임인', '을사'] },
  { birth: { year: 1975, month: 7, day: 7, hour: 14, minute: 0 }, expected: ['을묘', '임오', '갑인', '신미'] },
  { birth: { year: 1984, month: 6, day: 15, hour: 9, minute: 0 }, expected: ['갑자', '경오', '경진', '신사'] },
  { birth: { year: 1988, month: 9, day: 20, hour: 16, minute: 0 }, expected: ['무진', '신유', '무인', '경신'] },
  { birth: { year: 1992, month: 10, day: 24, hour: 5, minute: 30 }, expected: ['임신', '경술', '계유', '을묘'] },
  { birth: { year: 1995, month: 11, day: 11, hour: 11, minute: 11 }, expected: ['을해', '정해', '병오', '갑오'] },
  { birth: { year: 2000, month: 6, day: 10, hour: 8, minute: 30 }, expected: ['경진', '임오', '기해', '무진'] },
  { birth: { year: 2010, month: 12, day: 5, hour: 18, minute: 0 }, expected: ['경인', '정해', '기축', '계유'] },
  { birth: { year: 2020, month: 4, day: 20, hour: 13, minute: 0 }, expected: ['경자', '경진', '계사', '기미'] },
];

describe('만세력 골든 데이터 (KASI 표준값)', () => {
  test.each(GOLDEN)('$birth.year-$birth.month-$birth.day', ({ birth, expected }) => {
    const r = calculateFourPillars(birth);
    expect([r.yearString, r.monthString, r.dayString, r.hourString]).toEqual(expected);
  });
});
