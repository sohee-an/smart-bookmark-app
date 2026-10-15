/**
 * 비회원 AI 의미 검색 하루 횟수 카운터 (localStorage). 비회원 챗 제한(guestChatLimit)과 같은 구조다.
 * 한국 날짜가 바뀌면(자정) 리셋된다. 이건 UX용(남은 횟수, 로그인 유도)이며 위조 가능하므로,
 * 실제 비용 방어는 서버 IP rate limit(/api/semantic-search)이 담당한다 (이중 구조).
 */
import { kstDate } from "@/shared/lib/kstDate";

const KEY = "guest_semantic_usage";

export const GUEST_SEMANTIC_DAILY_LIMIT = 5;

// 하루의 기준은 한국 자정이다 (UTC 날짜를 쓰면 한국 시간 오전 9시에 리셋된다)
function today(): string {
  return kstDate();
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
