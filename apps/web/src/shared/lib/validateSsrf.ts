export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}

const PRIVATE_IP_RANGES = [
  /^127\./, // loopback
  /^10\./, // 사설망
  /^172\.(1[6-9]|2\d|3[01])\./, // 사설망
  /^192\.168\./, // 사설망
  /^169\.254\./, // AWS 메타데이터
];

/**
 * SSRF 방어용 URL 검증
 * - http/https 프로토콜만 허용
 * - DNS 조회 후 사설 IP 대역 차단
 *
 * @throws {SsrfError} 검증 실패 시
 */
export async function validateSsrf(url: string): Promise<void> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new SsrfError("유효하지 않은 URL입니다.");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new SsrfError("허용되지 않은 프로토콜입니다.");
  }

  const { lookup } = await import("dns/promises");
  let resolved: Awaited<ReturnType<typeof lookup>>;
  try {
    resolved = await lookup(parsedUrl.hostname);
  } catch {
    throw new SsrfError("URL을 확인할 수 없습니다.");
  }

  if (PRIVATE_IP_RANGES.some((range) => range.test(resolved.address))) {
    throw new SsrfError("허용되지 않은 주소입니다.");
  }
}
