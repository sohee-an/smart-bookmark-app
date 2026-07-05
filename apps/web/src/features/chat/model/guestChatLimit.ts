/**
 * 게스트 대화 하루 횟수 카운터 (localStorage).
 * 날짜가 바뀌면 리셋된다. 이건 UX용(남은 횟수·로그인 유도)이며 위조 가능하므로,
 * 실제 비용 방어는 서버 IP rate limit이 담당한다 (이중 구조).
 */
const KEY = "guest_chat_usage";

export const GUEST_CHAT_DAILY_LIMIT = 5;

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

export function getGuestChatRemaining(): number {
  return Math.max(0, GUEST_CHAT_DAILY_LIMIT - read().count);
}

export function recordGuestChat(): void {
  if (typeof localStorage === "undefined") return;
  const u = read();
  localStorage.setItem(KEY, JSON.stringify({ date: u.date, count: u.count + 1 }));
}
