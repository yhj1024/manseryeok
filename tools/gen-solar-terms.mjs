/**
 * 24절기 절입 보정표 생성기 (개발 시점 1회 실행, 런타임 의존 아님).
 *
 * 저장 방식: 절대 시각이 아니라 "Meeus 근사값 대비 6tail(천문 정밀) 보정(분)"만 저장한다.
 * Meeus 는 런타임에 이미 계산하므로(sun-longitude.ts), 작은 보정값(±수십 분 이내)만
 * base64 1글자/값으로 패킹하면 데이터가 극히 작아진다.
 *
 * 생성기는 dist 로 컴파일된 Meeus 솔버를 import 하여 런타임과 100% 동일한 근사값을 쓴다.
 * 따라서 먼저 `pnpm build` 후 실행할 것:
 *   pnpm build && node tools/gen-solar-terms.mjs && pnpm build
 */
import { writeFileSync } from 'fs';
import pkg from 'lunar-javascript';
import { solveSolarLongitudeInstant } from '../dist/astro/sun-longitude.js';

const { Solar } = pkg;

const MIN_YEAR = 1800;
const MAX_YEAR = 2300;
const BEIJING_OFFSET_MS = 8 * 3600 * 1000;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const OFFSET = 31; // 보정값(-31..31) → 인덱스(0..62)

/** 연도 Y의 24절기 절입 UTC 분(6tail 기준, 소한=0 … 동지=23) */
function trueTermMinutes(y) {
  const tbl = Solar.fromYmd(y, 1, 1).getLunar().getJieQiTable();
  const inYear = Object.values(tbl)
    .filter((s) => s.getYear() === y)
    .map(
      (s) =>
        Date.UTC(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour(), s.getMinute(), s.getSecond()) -
        BEIJING_OFFSET_MS,
    )
    .sort((a, b) => a - b);
  if (inYear.length !== 24) throw new Error(`${y}년 절기 ${inYear.length}개 (24 기대)`);
  return inYear.map((ms) => Math.round(ms / 60000));
}

/** 런타임과 동일한 Meeus 근사 절입 분 */
function meeusTermMinutes(y, index) {
  const target = (285 + 15 * index) % 360;
  const guessMs = Date.UTC(y, Math.floor(index / 2), 15, 0, 0, 0);
  return Math.round(solveSolarLongitudeInstant(target, guessMs) / 60000);
}

let packed = '';
let maxAbs = 0;
for (let y = MIN_YEAR; y <= MAX_YEAR; y++) {
  const t = trueTermMinutes(y);
  for (let i = 0; i < 24; i++) {
    const corr = t[i] - meeusTermMinutes(y, i);
    if (Math.abs(corr) > OFFSET) throw new Error(`${y}/${i} 보정값 ${corr} 이 ±${OFFSET} 초과`);
    maxAbs = Math.max(maxAbs, Math.abs(corr));
    packed += ALPHABET[corr + OFFSET];
  }
}

// 가독성을 위해 120자씩 줄바꿈
const chunks = [];
for (let i = 0; i < packed.length; i += 120) chunks.push("  '" + packed.slice(i, i + 120) + "',");

const out = `/**
 * 자동 생성 파일 — 직접 수정하지 마세요.
 * 생성기: tools/gen-solar-terms.mjs
 *
 * 24절기 절입 보정표 (${MIN_YEAR}~${MAX_YEAR}).
 *
 * 출처: 6tail/lunar-javascript 의 천문 계산값을 개발 시점에 추출(tools/gen-solar-terms.mjs).
 * 저장값은 런타임 Meeus 근사 대비 '분(minute) 보정'을 base64 1글자(-${OFFSET}..${OFFSET})로 패킹한 것이다.
 * 실제 절입 분 = round(Meeus 분) + 보정. 범위 밖 연도는 보정 0(=Meeus 근사, 오차 ≈ 수 분).
 */

export const SOLAR_TERM_DATA_MIN_YEAR = ${MIN_YEAR};
export const SOLAR_TERM_DATA_MAX_YEAR = ${MAX_YEAR};

const ALPHABET = '${ALPHABET}';
const OFFSET = ${OFFSET};

/** (year-${MIN_YEAR})*24 + index 위치에 보정값 1글자가 담긴 패킹 문자열 */
const PACKED = [
${chunks.join('\n')}
].join('');

/** Meeus 절입 분에 더할 보정(분). 보정표 범위 밖이면 0. */
export function solarTermCorrectionMinutes(year: number, index: number): number {
  if (year < SOLAR_TERM_DATA_MIN_YEAR || year > SOLAR_TERM_DATA_MAX_YEAR) return 0;
  return ALPHABET.indexOf(PACKED[(year - SOLAR_TERM_DATA_MIN_YEAR) * 24 + index]) - OFFSET;
}
`;

writeFileSync(new URL('../src/astro/solar-terms-data.ts', import.meta.url), out);
console.log(`생성 완료: ${MIN_YEAR}~${MAX_YEAR}, 최대보정 ${maxAbs}분, ${(out.length / 1024).toFixed(1)}KB`);
