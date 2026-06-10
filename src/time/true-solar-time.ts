/**
 * 진태양시(眞太陽時) 보정.
 *
 * 기록된 한국 벽시계 시각을 (1) 절대 UTC 순간과 (2) 출생지 지방 진태양시(local
 * apparent solar time)로 환산한다.
 *
 * - 연주/월주: 절기(절입)는 천문학적 절대 순간이므로 instantUTCms 로 판정한다.
 * - 일주/시주: 태양의 실제 위치(지방 진태양시)로 판정하므로 apparentMs 를 사용한다.
 *
 * 진태양시 옵션을 주지 않으면(기본) longitude=135, 균시차=0, 서머타임 미적용이 되어
 * 결과적으로 '입력 벽시계 = KST 표준시'로 동작한다(하위호환).
 */

import type { TrueSolarTimeOptions } from '../types';
import { equationOfTimeMinutes } from '../astro/sun-longitude';
import { koreaCivilOffsetMin } from './korea-timezone';

const MINUTE_MS = 60000;
const KST_STANDARD_MERIDIAN = 135;
const KST_OFFSET_MIN = 540;

/** 한반도 평균 자오선 (기본 출생 경도) */
export const DEFAULT_LONGITUDE = 127.5;

export interface ResolvedInstant {
  /** 출생의 절대 순간 (UTC ms) — 연주/월주(절기) 판정용 */
  instantUTCms: number;
  /** 지방 진태양시를 UTC 필드로 표현한 ms — 일주/시주 판정용 */
  apparentMs: number;
}

/**
 * 양력 벽시계 시각(한국 기준)을 절대 순간 및 지방 진태양시로 환산한다.
 *
 * @param year 양력 연
 * @param month 양력 월 (1-12)
 * @param day 양력 일
 * @param hour 시 (0-23)
 * @param minute 분 (0-59)
 * @param options 진태양시 옵션. 미지정 시 보정 없음(KST 표준시 그대로).
 */
export function resolveInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  options?: TrueSolarTimeOptions,
): ResolvedInstant {
  const wallMs = Date.UTC(year, month - 1, day, hour, minute, 0);

  if (!options) {
    // 보정 없음: 입력을 KST(UTC+9) 표준시로 간주
    const instantUTCms = wallMs - KST_OFFSET_MIN * MINUTE_MS;
    const apparentMs = instantUTCms + KST_STANDARD_MERIDIAN * 4 * MINUTE_MS; // = wallMs
    return { instantUTCms, apparentMs };
  }

  const longitude = options.longitude ?? DEFAULT_LONGITUDE;
  const applyEoT = options.applyEquationOfTime ?? true;
  const applyDst = options.applyHistoricalDst ?? true;

  const civilOffsetMin = applyDst ? koreaCivilOffsetMin(year, month, day, hour) : KST_OFFSET_MIN;
  const instantUTCms = wallMs - civilOffsetMin * MINUTE_MS;

  const eotMin = applyEoT ? equationOfTimeMinutes(instantUTCms) : 0;
  const apparentMs = instantUTCms + (longitude * 4 + eotMin) * MINUTE_MS;

  return { instantUTCms, apparentMs };
}
