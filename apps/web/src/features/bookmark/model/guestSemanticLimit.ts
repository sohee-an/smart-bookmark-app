/**
 * 비회원 AI 의미 검색 하루 횟수 카운터 (localStorage). 비회원 챗 제한(guestChatLimit)과 같은 구조다.
 * 날짜가 바뀌면 리셋된다. 이건 UX용(남은 횟수, 로그인 유도)이며 위조 가능하므로,
 * 실제 비용 방어는 서버 IP rate limit(/api/semantic-search)이 담당한다 (이중 구조).
 */
const KEY = "guest_semantic_usage";

export const GUEST_SEMANTIC_DAILY_LIMIT = 5;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function read(): { date: string; count: number } {
  if (typeof localStorage === "undefined") return { date: today(), count: 0 };
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (!parsed || parsed.date !== today()) return { date: today(), count: 0 };
    return parsed;
  } catch {
    return { date: today(), count: 0 };
  }
}

export function getGuestSemanticRemaining(): number {
  return Math.max(0, GUEST_SEMANTIC_DAILY_LIMIT - read().count);
}

export function recordGuestSemantic(): void {
  if (typeof localStorage === "undefined") return;
  const cur = read();
  localStorage.setItem(KEY, JSON.stringify({ date: cur.date, count: cur.count + 1 }));
}
