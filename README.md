# Manseryeok (만세력)

[![npm](https://img.shields.io/npm/v/manseryeok)](https://www.npmjs.com/package/manseryeok)
[![CI](https://github.com/yhj1024/manseryeok/actions/workflows/ci.yml/badge.svg)](https://github.com/yhj1024/manseryeok/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/manseryeok)](./LICENSE)

**한국어** | [English](./README.en.md)

**한국천문연구원(KASI) 정본 데이터 기반 만세력·사주팔자 계산 TypeScript 라이브러리.**

양력/음력 생년월일시를 입력하면 사주팔자(연주·월주·일주·시주)와 십신·대운·공망을
계산합니다. 런타임 의존성 없음, 패키지 약 40KB.

> **v2.0 안내** — 정확도 전면 재정비(연주 입춘 보정, 정밀 절기, KASI 음력 정본화)로
> 일부 출력이 1.x와 달라집니다. [CHANGELOG.md](./CHANGELOG.md)를 참고하세요.

## Features

- 🎯 사주팔자 계산 — 연주는 입춘(立春) 절입 순간, 월주는 절기(節) 경계 기준
- 📅 **정밀 24절기 절입표 임베드** (1800–2300, KASI와 분 단위 일치)
- 🌙 **KASI 정본 음력** — 음양력 변환 1391–2100 (윤달 포함, 한·중 차이 교정)
- ☀️ 진태양시(眞太陽時) 보정 옵션 — 경도 + 균시차 + 과거 표준시/서머타임(IANA)
- 🌃 야자시/조자시(`dayBoundary`) 세 관법 지원
- 🧮 십신(十神)·대운(大運)·공망(空亡) — 학파와 무관하게 값이 결정되는 정보만 제공
- ⚡ TypeScript 완벽 지원, `require`/`import` 모두 호환, 런타임 의존성 0

## Installation

```bash
npm install manseryeok   # or yarn add / pnpm add
```

## Usage

```typescript
import { calculateFourPillars } from 'manseryeok';

const result = calculateFourPillars({
  year: 1992,      // 연도
  month: 10,       // 월 (1-12)
  day: 24,         // 일
  hour: 5,         // 시 (24시간제, 0-23)
  minute: 30,      // 분 (0-59)
});

result.toString();      // '임신연주, 경술월주, 계유일주, 을묘시주'
result.toObject();      // { year: '임신', month: '경술', day: '계유', hour: '을묘' }
result.toHanjaString(); // '壬申年柱, 庚戌月柱, 癸酉日柱, 乙卯時柱'

result.dayElement;      // { stem: '수', branch: '금' }  — 일주 천간/지지의 오행
result.dayYinYang;      // { stem: '음', branch: '음' }  — 일주 천간/지지의 음양
```

### 음력 입력

```typescript
const result = calculateFourPillars({
  year: 1992, month: 9, day: 29, hour: 5, minute: 30,
  isLunar: true,        // 음력 입력
  isLeapMonth: false,   // 윤달 여부
});
// 음력 1992-09-29 = 양력 1992-10-24, 위와 동일한 결과
```

### 입력 파라미터

| 파라미터 | 타입 | 설명 | 범위 |
|---------|------|------|------|
| `year` | number | 연도 | 양력 1800–2300, 음력 1800–2100 |
| `month` | number | 월 | 1–12 |
| `day` | number | 일 | 1–31 (양력) / 1–30 (음력) |
| `hour` | number | 시 (24시간제) | 0–23 |
| `minute` | number | 분 | 0–59 |
| `isLunar` | boolean? | 음력 여부 | 기본 false |
| `isLeapMonth` | boolean? | 윤달 여부 (음력일 때만) | 기본 false |
| `trueSolarTime` | object? | 진태양시 보정 | 아래 참고 |
| `dayBoundary` | string? | 자시 일 경계 관법 | 아래 참고 |
| `gender` | string? | 성별 (`'male'`/`'female'`) — 대운 계산에 필요 | — |

잘못된 입력(실재하지 않는 날짜, 범위 밖 연도, `NaN` 등)은 조용히 틀린 값을 내는 대신
`RangeError`를 던집니다.

### 진태양시 보정 (옵션, 기본 OFF)

한국 표준시는 동경 135° 기준이지만 한반도는 약 127°에 위치해 표준시와 실제 태양시가
약 30분 차이 납니다. 옵션을 지정하면 시주·일주를 출생지 진태양시 기준으로 판정합니다.
**미지정 시 입력 시각(KST)을 그대로 사용합니다.**

```typescript
const result = calculateFourPillars({
  year: 1990, month: 5, day: 15, hour: 7, minute: 5,
  trueSolarTime: {
    longitude: 126.978,         // 출생지 경도(동경). 기본 127.5 (한반도 평균)
    applyEquationOfTime: true,  // 균시차 보정 (기본 true)
    applyHistoricalDst: true,   // 과거 표준시/서머타임 보정 (기본 true)
  },
});
// 07:05 KST → 서울 진태양시 약 06:33 → 진시(07–09)가 아닌 묘시(05–07)
```

- **경도 보정**: `(출생경도 − 135°) × 4분`
- **균시차(EoT)**: 지구 공전 궤도에 의한 ±16분 내외 보정
- **과거 표준시/서머타임**: 1954–61년 UTC+8:30, 1948–51·1955–60·1987–88년 서머타임을
  자동 반영 (출처: IANA tz database). 연주·월주(절기)는 천문학적 절대 순간으로 판정되므로
  경도와 무관하며, 표준시·서머타임 보정만 영향을 줍니다.

### 야자시/조자시 (dayBoundary)

자시(23:00–23:59)의 일주·시주 처리는 학파마다 다릅니다.

| `dayBoundary` | 일주(日柱) | 시주(時柱) 천간 기준 |
| --- | --- | --- |
| `'midnight'` (기본) | 당일 | 당일 일간 |
| `'jasi'` | 다음날 | 다음날 일간 |
| `'splitJasi'` | 당일 | 다음날 일간 |

```typescript
// 2024-03-10 23:30
calculateFourPillars({ year: 2024, month: 3, day: 10, hour: 23, minute: 30 });
// → 계유일 임자시 (midnight)
calculateFourPillars({ ...같은입력, dayBoundary: 'jasi' });      // → 갑술일 갑자시
calculateFourPillars({ ...같은입력, dayBoundary: 'splitJasi' }); // → 계유일 갑자시
```

### 십신·대운·공망

결과 객체에 십신(`tenGods`)·공망(`voidBranches`)이 항상 포함되고, `gender`를 지정하면
대운(`luckPillars`)이 추가됩니다.

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

대운 계산 기준:

- **순행/역행**: 양년 남자·음년 여자 = 순행, 그 외 역행.
- **대운수(`startAge`)**: 출생부터 인접 절(節)까지의 일수 ÷ 3을 **반올림**(최소 1).
  절상·절하 등 유파별 관법에 따라 1 차이가 날 수 있으며, 세밀값이 필요하면
  `startYears`/`startMonths`/`startDays`(3일=1년, 1일=4개월 환산)를 사용하세요.
- 개별 함수: `getTenGod`, `getTenGodChart`, `getVoidBranches`, `getLuckPillars`.

### 음양력 변환

사주 계산과 별개로, 음양력 변환은 **1391년부터** 지원합니다 (KASI 정본).

```typescript
import { solarToLunar, lunarToSolar } from 'manseryeok';

solarToLunar(2024, 1, 1);          // { year: 2023, month: 11, day: 20, isLeapMonth: false }
lunarToSolar(2023, 11, 20, false); // { year: 2024, month: 1, day: 1 }
lunarToSolar(2020, 4, 1, true);    // 윤4월 → { year: 2020, month: 5, day: 23 }
```

### 절기(節氣) 조회

```typescript
import { getSolarTerm, getSolarTermsOfYear } from 'manseryeok';

const lichun = getSolarTerm(2024, 2);    // 입춘 (index 2)
lichun.date.toISOString();               // 절입의 절대 순간 (UTC)
lichun.date.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }); // KST 표기

getSolarTermsOfYear(2024);               // 24절기 전체
```

### 음양·오행 유틸

```typescript
import { getHeavenlyStemYinYang, getHeavenlyStemElement, getEarthlyBranchElement } from 'manseryeok';

getHeavenlyStemYinYang('갑');  // '양'
getHeavenlyStemElement('갑');  // '목'
getEarthlyBranchElement('자'); // '수'
```

## API Reference

### 주요 타입

```typescript
interface BirthInfo {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  isLunar?: boolean;
  isLeapMonth?: boolean;
  trueSolarTime?: {
    longitude?: number;             // 기본 127.5
    applyEquationOfTime?: boolean;  // 기본 true
    applyHistoricalDst?: boolean;   // 기본 true
  };
  dayBoundary?: 'midnight' | 'jasi' | 'splitJasi';
  gender?: 'male' | 'female';
}

interface Pillar {
  heavenlyStem: HeavenlyStem;   // 천간
  earthlyBranch: EarthlyBranch; // 지지
}

interface LuckPillar {
  age: number;     // 대운 시작 나이
  pillar: Pillar;  // 대운 간지
  korean: string;  // 예: '임오'
}
```

### 함수

- `calculateFourPillars(birthInfo): FourPillarsDetail` — 사주 계산 (십신·공망·대운 포함)
- `fourPillarsToString(fourPillars): string`
- `solarToLunar(year, month, day): LunarDate` / `lunarToSolar(year, month, day, isLeapMonth): SolarDate`
- `getSolarTerm(year, index): SolarTerm` / `getSolarTermsOfYear(year): SolarTerm[]`
- `getTenGod(dayMaster, target): TenGod` / `getBranchTenGod(dayMaster, branch): TenGod` / `getTenGodChart(pillars): TenGodChart`
- `getVoidBranches(dayStem, dayBranch): EarthlyBranch[]`
- `getLuckPillars(params): LuckPillarInfo`
- `getHeavenlyStemYinYang` / `getHeavenlyStemElement` / `getEarthlyBranchYinYang` / `getEarthlyBranchElement`

`FourPillarsDetail`은 `year/month/day/hour`(각 `Pillar`)와 오행·음양, 한글·한자 문자열,
`tenGods`·`voidBranches`(·`luckPillars`), `toString`/`toObject`/`toHanjaString`/`toHanjaObject`를
포함합니다.

## 12시진 체계

| 시진 | 시간대 | | 시진 | 시간대 |
|------|--------|-|------|--------|
| 자시(子時) | 23:00–01:00 | | 오시(午時) | 11:00–13:00 |
| 축시(丑時) | 01:00–03:00 | | 미시(未時) | 13:00–15:00 |
| 인시(寅時) | 03:00–05:00 | | 신시(申時) | 15:00–17:00 |
| 묘시(卯時) | 05:00–07:00 | | 유시(酉時) | 17:00–19:00 |
| 진시(辰時) | 07:00–09:00 | | 술시(戌時) | 19:00–21:00 |
| 사시(巳時) | 09:00–11:00 | | 해시(亥時) | 21:00–23:00 |

시진은 2시간 단위이므로 분(minute)은 시진 경계 부근에서만 결과에 영향을 주며,
분 단위의 정밀 보정은 `trueSolarTime` 옵션과 함께 의미를 가집니다.

## Accuracy & Notes

**데이터 출처와 정확도:**

| 항목 | 출처 | 범위 | 정확도 |
|------|------|------|--------|
| 절기 절입 시각 | 임베드 정밀 절입표 (KASI와 분 단위 일치 검증) | 1800–2300 | 분 단위 |
| 음력 날짜 | KASI 음양력 API 정본 | 1391–2049 | 정본 |
| 음력 날짜 | 천문 계산 (6tail) | 2050–2100 | 삭 시각 기준 |
| 일주(60갑자) | KASI 일진과 전 구간 일치 검증 | 전체 | 정확 |
| 과거 표준시/서머타임 | IANA tz database (Asia/Seoul) | 1908– | 정확 |

**알아둘 점:**

- **한국 표준시 기준**: 중국 표준시(UTC+8) 기준 만세력과는 절입 경계 1시간 구간에서
  연주·월주가, 삭이 자정 근처인 해(예: 1997 설날 한국 2/8·중국 2/7)에는 음력 날짜가
  다를 수 있습니다. 한국 기준으로는 본 라이브러리가 정답입니다.
- **사주 계산 범위가 1800년부터인 이유**: 절입 시각이 분 단위로 정확한 구간만 허용해,
  경계 출생의 연주·월주 오판을 차단하기 위함입니다. 음양력 변환은 1391년부터 가능합니다.
- **1908년 이전 시각**: 한국에 표준시가 도입(1908)되기 전의 입력 시각도 KST(UTC+9)로
  간주합니다. 당시 기록은 지방시(LMT)인 경우가 많으므로, 정밀한 계산이 필요하면
  `trueSolarTime.longitude`로 출생지 경도 보정을 적용하세요.
- **자시 관법·진태양시**: 학파마다 다르므로 옵션으로 선택합니다. 기본값은 보정 없는
  KST + 자정 일 경계입니다.
- **1582년 이전 양력 표기**: 그레고리력 소급(proleptic) 기준입니다. 절대일은 정확하나
  율리우스력을 쓰는 역사 기록과 표기가 며칠 다를 수 있습니다.
- **신살(神煞)·12운성 미제공**: 기준과 결과가 학파마다 갈리는 해석 영역이므로, 값이
  결정적으로 정해지는 계산만 제공합니다.

## Development

```bash
pnpm install
pnpm test        # 테스트 (golden + 6tail 교차검증 포함)
pnpm build
pnpm lint
```

## References

- 음력 데이터: [한국천문연구원(KASI) 음양력 API](https://www.data.go.kr/data/15012679/openapi.do)
- 절기 계산: 임베드 정밀 절입표 + Jean Meeus, *Astronomical Algorithms* (범위 밖 폴백)
- 과거 표준시/서머타임: IANA tz database (Asia/Seoul + ROK rules)
- 교차검증: [6tail/lunar-javascript](https://github.com/6tail/lunar-javascript)

## License

MIT © Yoohyojun

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
