/**
 * 인메모리 슬라이딩 윈도우 rate limiter.
 *
 * 비인증 접근이 가능한 크롤/AI/임베딩 API의 남용(Gemini 과금 DoS)을 막기 위한
 * 최소 방어선이다. `is_guest` 쿠키는 클라이언트가 위조할 수 있어 인증 게이트만으로는
 * 무제한 호출을 막지 못하므로, IP 단위 호출 빈도를 제한한다.
 *
 * 한계: 서버리스(Vercel) 환경에서는 인스턴스마다 카운터가 분리되어 전역적으로
 * 정확하지 않다. 다중 인스턴스에서 엄밀한 제한이 필요하면 Upstash/Redis 기반
 * (@upstash/ratelimit)으로 교체해야 한다.
 */

type Timestamps = number[];

const buckets = new Map<string, Timestamps>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
};

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > cutoff);

  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { ok: false, remaining: 0, retryAfterMs: hits[0] + windowMs - now };
  }

  hits.push(now);
  buckets.set(key, hits);
  return { ok: true, remaining: limit - hits.length, retryAfterMs: 0 };
}

/** 프록시(Vercel/Nginx) 뒤에서 클라이언트 IP를 추출. 없으면 "unknown". */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
