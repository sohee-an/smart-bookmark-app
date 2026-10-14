/**
 * 한국 시간(KST, UTC+9) 기준 날짜 유틸. "하루 N회" 제한은 한국 자정에 리셋한다.
 * toISOString()의 날짜는 UTC라 한국 시간 오전 9시에 날짜가 바뀐다. 그래서 9시간을 더한 뒤 날짜를 읽는다.
 * 한국은 서머타임이 없어서 고정 오프셋으로 충분하다.
 */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 한국 시간 기준 날짜 문자열 (YYYY-MM-DD) */
export function kstDate(now: Date = new Date()): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** 한국 시간 기준 오늘 0시의 시각 (DB 비교용, UTC 기준 Date) */
export function kstDayStart(now: Date = new Date()): Date {
  return new Date(`${kstDate(now)}T00:00:00+09:00`);
}
