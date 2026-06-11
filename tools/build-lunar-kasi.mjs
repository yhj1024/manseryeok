/**
 * KASI(한국천문연구원) 음양력 API 로부터 음력 데이터 테이블을 생성한다.
 * (개발 시점 1회 실행, 런타임 의존 아님)
 *
 *   KASI_KEY=<data.go.kr 서비스키> node tools/build-lunar-kasi.mjs
 *
 * 동작:
 *  1) getSolCalInfo 로 음력 각 연/월 1일의 solJd·월일수(평달)를 받아 캐시(.kasi-cache.json)에 저장(재개 가능).
 *  2) 갭(다음 달 1일 solJd - 이번 달 1일 solJd)으로 윤달 위치·일수를 역산.
 *  3) 16비트 패킹(LUNAR_DATA) 으로 인코딩하고, 연 총일수 정합성·기존 테이블 대조 검증.
 *  4) 2050~2100 은 기존(6tail) 값을 유지해 이어 붙이고 src/calendar/lunar-data.ts 생성.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';

const KEY = process.env.KASI_KEY;
if (!KEY) throw new Error('환경변수 KASI_KEY 가 필요합니다.');

const BASE = 'http://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService/getSolCalInfo';
const LUN_BASE = 'http://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService/getLunCalInfo';
const PYEONG = encodeURIComponent('평');
const MIN_YEAR = 1391;
const KASI_MAX_YEAR = 2049; // 완전한 마지막 음력 연도 (2050 은 12월이 2051 양력으로 넘어가 범위 밖)
const KEEP_MAX_YEAR = 2100; // 2050~2100 은 기존 값 유지
const CACHE_PATH = new URL('./.kasi-cache.json', import.meta.url);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const YUN = encodeURIComponent('윤');

async function fetchSol(y, m, leap) {
  const lp = leap ? YUN : PYEONG;
  const url = `${BASE}?lunYear=${y}&lunMonth=${String(m).padStart(2, '0')}&lunDay=01&lunLeapmonth=${lp}&ServiceKey=${KEY}`;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const xml = await (await fetch(url)).text();
      if (/<totalCount>0<\/totalCount>/.test(xml)) return null;
      // '윤' 조회는 평·윤 두 item 을 줄 수 있으므로 lunLeapmonth 가 일치하는 item 의 solJd 를 취한다.
      const items = xml.split('<item>').slice(1);
      const want = leap ? '윤' : '평';
      for (const it of items) {
        if (new RegExp(`<lunLeapmonth>${want}</lunLeapmonth>`).test(it)) {
          const solJd = Number(it.match(/<solJd>(\d+)<\/solJd>/)?.[1]);
          if (solJd) return { solJd };
        }
      }
      throw new Error('파싱 실패: ' + xml.slice(0, 160));
    } catch (e) {
      if (attempt === 5) throw new Error(`${y}-${m}${leap ? '윤' : ''} 실패: ${e.message}`);
      await sleep(400 * (attempt + 1));
    }
  }
}
const fetchMonth = (y, m) => fetchSol(y, m, false);

/** solJd → 양력 {y,m,d} (KASI solJd = JD+0.5 정수, ms=(solJd-2440588)*86400000) */
function jdToDate(jd) {
  const d = new Date((jd - 2440588) * 86400000);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}

/** 양력일의 음력 윤달 여부('평'/'윤') — getLunCalInfo */
async function fetchLunLeapAt(jd) {
  const { y, m, d } = jdToDate(jd);
  const url = `${LUN_BASE}?solYear=${y}&solMonth=${String(m).padStart(2, '0')}&solDay=${String(d).padStart(2, '0')}&ServiceKey=${KEY}`;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const xml = await (await fetch(url)).text();
      const lp = xml.match(/<lunLeapmonth>(평|윤)<\/lunLeapmonth>/)?.[1];
      if (lp) return lp;
      throw new Error('파싱 실패: ' + xml.slice(0, 160));
    } catch (e) {
      if (attempt === 5) throw new Error(`getLunCalInfo ${y}-${m}-${d} 실패: ${e.message}`);
      await sleep(400 * (attempt + 1));
    }
  }
}

// ---- 1) 캐시 채우기 (재개 가능) ----
const cache = existsSync(CACHE_PATH) ? JSON.parse(readFileSync(CACHE_PATH, 'utf8')) : {};
let fetched = 0;
for (let y = MIN_YEAR; y <= KASI_MAX_YEAR + 1; y++) {
  // 마지막 +1 년은 month 1 만 있으면 됨(직전 해 12월 길이 계산용)
  const months = y > KASI_MAX_YEAR ? [1] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  if (cache[y] && months.every((m) => cache[y][m])) continue;
  cache[y] = cache[y] || {};
  const results = await Promise.all(
    months.map(async (m) => (cache[y][m] ? null : [m, await fetchMonth(y, m)])),
  );
  for (const r of results) {
    if (r) {
      cache[y][r[0]] = r[1];
      fetched++;
    }
  }
  writeFileSync(CACHE_PATH, JSON.stringify(cache));
  if (y % 25 === 0) console.log(`  ...${y}년까지 캐시 (이번 실행 ${fetched}콜)`);
}
console.log(`캐시 완료. 이번 실행 ${fetched}콜.`);

// ---- 1b) 윤년의 윤달 시작일('윤' 조회) 캐시 ----
// 월 길이는 solJd 갭(실측)으로 계산한다. KASI 의 lunNday 필드는 일부 연도(예: 1597)에서
// 실제 날짜와 어긋나므로 신뢰하지 않는다. 윤년은 연 span(>360)으로 판정하고, 갭이 ~59인
// 슬롯(평달+윤달)을 '윤' 조회로 분할한다.
const starts = (y) => {
  const s = [];
  for (let m = 1; m <= 12; m++) s[m] = cache[y][m].solJd;
  s[13] = cache[y + 1][1].solJd;
  return s;
};
let leapFetched = 0;
for (let y = MIN_YEAR; y <= KASI_MAX_YEAR; y++) {
  const s = starts(y);
  if (s[13] - s[1] <= 360) continue; // 평년
  if (cache[y].leapStart) continue;
  let lm = 0;
  for (let m = 1; m <= 12; m++) if (s[m + 1] - s[m] >= 58) { lm = m; break; }
  const gap = s[lm + 1] - s[lm];
  let plainLen;
  if (gap === 58) plainLen = 29; // 29 + 29
  else if (gap === 60) plainLen = 30; // 30 + 30
  else {
    // gap === 59: 29+30 vs 30+29 모호 → 슬롯의 30번째 날(s[lm]+29)이 평달이면 평30, 윤달이면 평29
    const lp = await fetchLunLeapAt(s[lm] + 29);
    plainLen = lp === '윤' ? 29 : 30;
    leapFetched++;
  }
  cache[y].leapStart = { month: lm, solJd: s[lm] + plainLen };
  if (leapFetched > 0 && leapFetched % 50 === 0) {
    console.log(`  ...윤달 모호 판정 ${leapFetched}건`);
    writeFileSync(CACHE_PATH, JSON.stringify(cache));
  }
}
writeFileSync(CACHE_PATH, JSON.stringify(cache));
console.log(`윤달 처리 완료: 모호 판정 ${leapFetched}건 (이번 실행).`);

// ---- 2) 인코딩 (월 길이 = solJd 갭) + 검증 ----
const BIG = (m) => 0x10000 >> m; // 월 대(30일) 비트
function encodeYear(y) {
  const s = starts(y);
  const isLeap = s[13] - s[1] > 360;
  let value = 0;
  let leapPos = 0;
  let leapDays = 0;
  const lm = isLeap ? cache[y].leapStart.month : 0;
  for (let m = 1; m <= 12; m++) {
    // 평달 m 의 실제 길이: 윤달이 낀 슬롯(m===lm)이면 윤달 시작일까지, 아니면 다음 달 시작까지
    const plainLen = m === lm ? cache[y].leapStart.solJd - s[m] : s[m + 1] - s[m];
    if (plainLen === 30) value |= BIG(m);
  }
  if (isLeap) {
    leapPos = lm;
    leapDays = s[lm + 1] - cache[y].leapStart.solJd;
    value |= leapPos;
    if (leapDays === 30) value |= 0x10000;
  }
  return value;
}

// 연 총일수(비트 합) 계산 — 정합성 검증용
function yearDays(value) {
  let sum = 348;
  for (let i = 0x8000; i > 0x8; i >>= 1) sum += value & i ? 1 : 0;
  const leap = value & 0xf;
  if (leap) sum += value & 0x10000 ? 30 : 29;
  return sum;
}

const kasiValues = [];
for (let y = MIN_YEAR; y <= KASI_MAX_YEAR; y++) {
  const v = encodeYear(y);
  // 정합성: 인코딩된 연 총일수 == 실제 solJd 차이(다음해 1월1일 - 올해 1월1일)
  const actual = cache[y + 1][1].solJd - cache[y][1].solJd;
  if (yearDays(v) !== actual) {
    throw new Error(`${y}년 연일수 불일치: 인코딩 ${yearDays(v)} vs 실제 ${actual}`);
  }
  kasiValues.push(v);
}
console.log(`인코딩+정합성 검증 통과: ${MIN_YEAR}~${KASI_MAX_YEAR} (${kasiValues.length}년)`);

// ---- 3) 기존 테이블 대조 + 2050~2100 이어붙이기 ----
const src = readFileSync(new URL('../src/calendar/lunar-data.ts', import.meta.url), 'utf8');
const cur = src.match(/const LUNAR_DATA = \[([\s\S]*?)\];/)[1]
  .split(',').map((s) => s.trim()).filter(Boolean).map((s) => parseInt(s, 16));
// 기존 테이블의 시작 연도는 파일이 선언한 LUNAR_MIN_YEAR 를 그대로 사용한다 (하드코딩 금지)
const CUR_MIN = Number(src.match(/export const LUNAR_MIN_YEAR = (\d+)/)[1]);
if (cur.length < KEEP_MAX_YEAR - CUR_MIN + 1) {
  throw new Error(
    `기존 LUNAR_DATA 범위 부족: ${CUR_MIN}~${CUR_MIN + cur.length - 1} (${KEEP_MAX_YEAR}년까지 필요)`,
  );
}
let diffs = [];
for (let y = Math.max(MIN_YEAR, CUR_MIN); y <= KASI_MAX_YEAR; y++) {
  const k = kasiValues[y - MIN_YEAR];
  const c = cur[y - CUR_MIN];
  if (k !== c) diffs.push(`${y}: KASI 0x${k.toString(16)} vs 기존 0x${c.toString(16)}`);
}
console.log(`\n기존 테이블 대비 KASI 차이: ${diffs.length}건 (재생성이면 0건이 정상)`);
diffs.forEach((d) => console.log('  ' + d));

const tail = []; // 2050~2100 기존 유지
for (let y = KASI_MAX_YEAR + 1; y <= KEEP_MAX_YEAR; y++) tail.push(cur[y - CUR_MIN]);
const all = [...kasiValues, ...tail];

// 새 기준일: 음 1391-01-01 의 양력(UTC ms). KASI solJd → ms : (solJd - 2440588) * 86400000
const baseMs = (cache[MIN_YEAR][1].solJd - 2440588) * 86400000;
const baseDate = new Date(baseMs);

// ---- 4) 파일 작성 ----
const hex = all.map((v) => '0x' + v.toString(16).padStart(5, '0'));
const lines = [];
for (let i = 0; i < hex.length; i += 11) lines.push('  ' + hex.slice(i, i + 11).join(', ') + ',');

const out = `/**
 * 자동 생성 파일 — 직접 수정하지 마세요.
 * 생성기: tools/build-lunar-kasi.mjs
 *
 * 음력 데이터 테이블 및 기본 조회 함수.
 * ${MIN_YEAR}~${KASI_MAX_YEAR}년: 한국천문연구원(KASI) 음양력 API 기준.
 * ${KASI_MAX_YEAR + 1}~${KEEP_MAX_YEAR}년: 천문 계산(6tail) 기준(KASI 미제공 구간).
 *
 * 각 연도는 16비트 패킹: 상위 12비트(0x8000~0x10)는 1~12월의 대(30일)/소(29일) 여부,
 * 하위 4비트(0xf)는 윤달 위치(0=없음), 0x10000 비트는 윤달의 대소.
 */

import { assertIntegerInRange } from '../validation';

const LUNAR_DATA = [
${lines.join('\n')}
];

/** 지원하는 최소/최대 음력 연도 */
export const LUNAR_MIN_YEAR = ${MIN_YEAR};
export const LUNAR_MAX_YEAR = LUNAR_MIN_YEAR + LUNAR_DATA.length - 1;

/** 음력 데이터 기준일 (음력 ${MIN_YEAR}-01-01 = 양력 ${baseDate.getUTCFullYear()}-${String(baseDate.getUTCMonth() + 1).padStart(2, '0')}-${String(baseDate.getUTCDate()).padStart(2, '0')}, UTC ms) */
export const LUNAR_BASE_UTC_MS = Date.UTC(${baseDate.getUTCFullYear()}, ${baseDate.getUTCMonth()}, ${baseDate.getUTCDate()});

function assertYear(year: number): void {
  assertIntegerInRange(year, LUNAR_MIN_YEAR, LUNAR_MAX_YEAR, '음력 연도(year)');
}

/** 음력 연도의 윤달 위치 (0이면 윤달 없음) */
export function getLeapMonth(year: number): number {
  assertYear(year);
  return LUNAR_DATA[year - LUNAR_MIN_YEAR] & 0xf;
}

/** 음력 연도의 윤달 일수 (윤달 없으면 0) */
export function getLeapMonthDays(year: number): number {
  assertYear(year);
  const data = LUNAR_DATA[year - LUNAR_MIN_YEAR];
  if ((data & 0xf) === 0) return 0;
  return data & 0x10000 ? 30 : 29;
}

/** 음력 특정 월(평달)의 일수 */
export function getLunarMonthDays(year: number, month: number): number {
  assertYear(year);
  assertIntegerInRange(month, 1, 12, '음력 월(month)');
  return LUNAR_DATA[year - LUNAR_MIN_YEAR] & (0x10000 >> month) ? 30 : 29;
}

/** 음력 연도의 총 일수 */
export function getLunarYearDays(year: number): number {
  assertYear(year);
  let sum = 348; // 12 평달의 기본 일수 (29*12)
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    sum += LUNAR_DATA[year - LUNAR_MIN_YEAR] & i ? 1 : 0;
  }
  return sum + getLeapMonthDays(year);
}
`;

writeFileSync(new URL('../src/calendar/lunar-data.ts', import.meta.url), out);
console.log(
  `\n생성 완료: 음력 ${MIN_YEAR}~${KEEP_MAX_YEAR} (${all.length}년), 기준일 ${baseDate.toISOString().slice(0, 10)}`,
);
