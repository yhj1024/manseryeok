# Manseryeok (만세력)

[![npm](https://img.shields.io/npm/v/manseryeok)](https://www.npmjs.com/package/manseryeok)
[![CI](https://github.com/yhj1024/manseryeok/actions/workflows/ci.yml/badge.svg)](https://github.com/yhj1024/manseryeok/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/manseryeok)](./LICENSE)

[한국어](./README.md) | **English**

**A TypeScript library for Korean Four Pillars (Saju/Bazi) and lunisolar calendar calculation, built on official KASI (Korea Astronomy and Space Science Institute) data.**

Given a solar or lunar birth date and time, it computes the Four Pillars (year, month,
day, hour) along with Ten Gods, Luck Pillars, and Void Branches. Zero runtime
dependencies, ~40KB package.

> **Note on v2.0** — A major accuracy overhaul (Lichun year boundary, precise solar
> terms, official KASI lunar data). Some outputs differ from 1.x. See
> [CHANGELOG.md](./CHANGELOG.md).

## Features

- 🎯 Four Pillars calculation — year pillar by the exact Lichun (立春) instant, month pillar by solar-term (節) boundaries
- 📅 **Embedded precise solar-term table** (1800–2300, minute-level agreement with KASI)
- 🌙 **Official KASI lunar calendar** — lunisolar conversion for 1391–2100 (leap months, Korea/China differences corrected)
- ☀️ Optional true solar time correction — longitude + equation of time + historical standard time/DST (IANA)
- 🌃 Three midnight-boundary (`dayBoundary`) conventions for the Zi hour (23:00–23:59)
- 🧮 Ten Gods (十神), Luck Pillars (大運), Void Branches (空亡) — only deterministic values, independent of interpretive schools
- ⚡ Full TypeScript support, works with both `require` and `import`, zero runtime dependencies

## Installation

```bash
npm install manseryeok   # or yarn add / pnpm add
```

## Usage

```typescript
import { calculateFourPillars } from 'manseryeok';

const result = calculateFourPillars({
  year: 1992,      // year
  month: 10,       // month (1-12)
  day: 24,         // day
  hour: 5,         // hour (24h clock, 0-23)
  minute: 30,      // minute (0-59)
});

result.toObject();      // { year: '임신', month: '경술', day: '계유', hour: '을묘' }
result.toHanjaString(); // '壬申年柱, 庚戌月柱, 癸酉日柱, 乙卯時柱'

result.dayElement;      // { stem: '수', branch: '금' } — five elements of the day pillar
result.dayYinYang;      // { stem: '음', branch: '음' } — yin/yang of the day pillar
```

Stems, branches, elements, and Ten Gods are returned as Korean strings
(e.g. `'갑'` for 甲). Hanja (Chinese character) representations are available via
`toHanjaString`/`toHanjaObject` and the exported `*_HANJA` constant tables.

### Lunar calendar input

```typescript
const result = calculateFourPillars({
  year: 1992, month: 9, day: 29, hour: 5, minute: 30,
  isLunar: true,        // lunar input
  isLeapMonth: false,   // leap month flag
});
// Lunar 1992-09-29 = solar 1992-10-24; same result as above
```

### Input parameters

| Parameter | Type | Description | Range |
|---------|------|------|------|
| `year` | number | Year | solar 1800–2300, lunar 1800–2100 |
| `month` | number | Month | 1–12 |
| `day` | number | Day | 1–31 (solar) / 1–30 (lunar) |
| `hour` | number | Hour (24h) | 0–23 |
| `minute` | number | Minute | 0–59 |
| `isLunar` | boolean? | Lunar input | default false |
| `isLeapMonth` | boolean? | Leap month (lunar only) | default false |
| `trueSolarTime` | object? | True solar time correction | see below |
| `dayBoundary` | string? | Zi-hour day boundary convention | see below |
| `gender` | string? | `'male'`/`'female'` — required for Luck Pillars | — |

Invalid input (nonexistent dates, out-of-range years, `NaN`, impossible
stem-branch combinations) throws a `RangeError` instead of silently returning
wrong values.

### True solar time (optional, off by default)

Korean standard time is based on 135°E, but the peninsula sits around 127°E — about
a 30-minute offset from apparent solar time. With this option, the day and hour
pillars are judged by the apparent solar time at the birthplace.
**Without it, the input time is used as-is (KST).**

```typescript
const result = calculateFourPillars({
  year: 1990, month: 5, day: 15, hour: 7, minute: 5,
  trueSolarTime: {
    longitude: 126.978,         // birthplace longitude (°E), default 127.5
    applyEquationOfTime: true,  // default true
    applyHistoricalDst: true,   // historical standard time / DST, default true
  },
});
// 07:05 KST → apparent solar time in Seoul ≈ 06:33 → Myo hour (05–07) instead of Jin (07–09)
```

- **Longitude**: `(birth longitude − 135°) × 4 min`
- **Equation of time**: ±16 min orbital correction
- **Historical standard time / DST**: UTC+8:30 during 1954–61 and DST in
  1948–51, 1955–60, 1987–88 are applied automatically (source: IANA tz database).
  Year/month pillars are judged by the absolute astronomical instant, so only the
  standard-time/DST correction affects them — longitude does not.

### Zi-hour day boundary (dayBoundary)

Schools differ on how to assign the day and hour pillars for births between
23:00–23:59.

| `dayBoundary` | Day pillar | Hour-stem reference |
| --- | --- | --- |
| `'midnight'` (default) | same day | same day's stem |
| `'jasi'` | next day | next day's stem |
| `'splitJasi'` | same day | next day's stem |

### Ten Gods, Luck Pillars, Void Branches

The result always includes `tenGods` and `voidBranches`; passing `gender` adds
`luckPillars`.

```typescript
const r = calculateFourPillars({
  year: 1990, month: 5, day: 15, hour: 14, minute: 30,
  gender: 'male',
});

r.tenGods;       // { year: {stem,branch}, month: …, day: {stem:'일간', branch}, hour: … }
r.voidBranches;  // ['신', '유']
r.luckPillars;   // { forward, startAge, startYears, startMonths, startDays,
                 //   pillars: [{ age, pillar, korean }, …] }
```

Luck Pillar conventions:

- **Direction**: yang-year male / yin-year female → forward; otherwise backward.
- **Starting age (`startAge`)**: days from birth to the adjacent solar term ÷ 3,
  **rounded** (minimum 1). Schools that always round up/down may differ by 1; use
  `startYears`/`startMonths`/`startDays` (3 days = 1 year, 1 day = 4 months) for
  the precise value.
- Standalone functions: `getTenGod`, `getTenGodChart`, `getVoidBranches`, `getLuckPillars`.

### Lunisolar conversion

Independent of Four Pillars calculation, calendar conversion supports **1391
onward** (official KASI data).

```typescript
import { solarToLunar, lunarToSolar } from 'manseryeok';

solarToLunar(2024, 1, 1);          // { year: 2023, month: 11, day: 20, isLeapMonth: false }
lunarToSolar(2023, 11, 20, false); // { year: 2024, month: 1, day: 1 }
lunarToSolar(2020, 4, 1, true);    // leap 4th month → { year: 2020, month: 5, day: 23 }
```

### Solar terms

```typescript
import { getSolarTerm, getSolarTermsOfYear } from 'manseryeok';

const lichun = getSolarTerm(2024, 2);    // Lichun (index 2)
lichun.date.toISOString();               // absolute instant (UTC)
lichun.date.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }); // KST

getSolarTermsOfYear(2024);               // all 24 terms
```

## Accuracy & Notes

**Data sources and accuracy:**

| Item | Source | Range | Accuracy |
|------|------|------|--------|
| Solar term instants | embedded table, verified against KASI | 1800–2300 | minute |
| Lunar calendar | official KASI lunisolar API | 1391–2049 | authoritative |
| Lunar calendar | astronomical computation (6tail) | 2050–2100 | new-moon based |
| Day pillar (sexagenary) | verified against KASI iljin | all | exact |
| Historical standard time/DST | IANA tz database (Asia/Seoul) | 1908– | exact |

**Things to know:**

- **Korean standard time basis**: against China-based (UTC+8) calendars, the
  year/month pillars can differ within the 1-hour window around term boundaries,
  and lunar dates can differ in years where the new moon falls near midnight
  (e.g. Lunar New Year 1997: Korea 2/8 vs China 2/7). For Korea, this library is
  the correct reference.
- **Why Four Pillars input starts at 1800**: only the range where term instants
  are minute-accurate is accepted, preventing wrong year/month pillars near
  boundaries. Calendar conversion still works from 1391.
- **Pre-1908 times**: before standard time was introduced in Korea (1908), input
  times are still interpreted as KST (UTC+9). Records from that era are usually
  local mean time, so apply `trueSolarTime.longitude` for precision.
- **Pre-1582 solar dates** use the proleptic Gregorian calendar. Absolute days
  are exact, but the notation differs by several days from Julian-calendar
  historical records.
- **No Shensha (神煞) / Twelve Stages**: their rules and results vary by school,
  so only deterministically computable values are provided.

## Development

```bash
pnpm install
pnpm test        # tests (golden + cross-validation against 6tail)
pnpm build
pnpm lint
```

## References

- Lunar data: [KASI lunisolar API](https://www.data.go.kr/data/15012679/openapi.do)
- Solar terms: embedded precise table + Jean Meeus, *Astronomical Algorithms* (fallback outside range)
- Historical standard time/DST: IANA tz database (Asia/Seoul + ROK rules)
- Cross-validation: [6tail/lunar-javascript](https://github.com/6tail/lunar-javascript)

## License

MIT © Yoohyojun
