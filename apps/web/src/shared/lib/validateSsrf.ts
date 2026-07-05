import net from "node:net";

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}

function ipv4Parts(ip: string): number[] | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return nums;
}

function isPrivateIPv4(ip: string): boolean {
  const p = ipv4Parts(ip);
  if (!p) return false;
  const [a, b] = p;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 10) return true; // 사설망
  if (a === 172 && b >= 16 && b <= 31) return true; // 사설망
  if (a === 192 && b === 168) return true; // 사설망
  if (a === 169 && b === 254) return true; // link-local / 클라우드 메타데이터
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true; // loopback / unspecified

  // IPv4-mapped(::ffff:…)는 내부 IPv4를 추출해 동일 규칙 적용.
  // WHATWG URL 파서가 ::ffff:169.254.169.254 를 ::ffff:a9fe:a9fe(hex) 로 정규화하므로
  // 점형(a.b.c.d)과 hex형(hhhh:hhhh) 둘 다 처리한다.
  const mapped = lower.match(/^::ffff:(.+)$/);
  if (mapped) {
    const rest = mapped[1];
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(rest)) return isPrivateIPv4(rest);
    const hex = rest.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hex) {
      const hi = parseInt(hex[1], 16);
      const lo = parseInt(hex[2], 16);
      const ipv4 = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
      return isPrivateIPv4(ipv4);
    }
  }

  if (/^f[cd]/.test(lower)) return true; // unique local fc00::/7
  if (/^fe[89ab]/.test(lower)) return true; // link-local fe80::/10
  return false;
}

/**
 * IP 문자열이 내부/사설 대역인지 판정. IPv4·IPv6·IPv4-mapped를 모두 처리한다.
 * 파싱 불가능한 주소는 보수적으로 "사설(차단)"로 간주한다.
 */
export function isPrivateAddress(ip: string): boolean {
  const kind = net.isIP(ip);
  if (kind === 4) return isPrivateIPv4(ip);
  if (kind === 6) return isPrivateIPv6(ip);
  return true;
}

/**
 * SSRF 방어용 URL 검증.
 * - http/https 프로토콜만 허용
 * - 호스트가 IP 리터럴이면 즉시 사설 대역 검사 (IPv4/IPv6/mapped)
 * - 도메인이면 DNS로 조회된 **모든** 주소를 검사, 하나라도 사설이면 차단
 *
 * 주의: 이 함수 통과 후 실제 fetch가 DNS를 재조회하면 DNS rebinding(TOCTOU) 여지가
 * 남는다. 크롤러는 리다이렉트 홉마다 이 함수를 재호출해 창을 좁힌다. 완전 차단은
 * 검증된 IP로 커넥션을 고정(undici dispatcher)해야 하며, 배포 검증 후 도입 예정.
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

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new SsrfError("허용되지 않은 프로토콜입니다.");
  }

  // URL.hostname은 IPv6를 대괄호로 감싸므로 제거 후 판정
  const hostname = parsedUrl.hostname.replace(/^\[|\]$/g, "");

  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new SsrfError("허용되지 않은 주소입니다.");
    }
    return;
  }

  const { lookup } = await import("node:dns/promises");
  let resolved: { address: string; family: number }[];
  try {
    resolved = await lookup(hostname, { all: true });
  } catch {
    throw new SsrfError("URL을 확인할 수 없습니다.");
  }

  if (resolved.length === 0 || resolved.some((r) => isPrivateAddress(r.address))) {
    throw new SsrfError("허용되지 않은 주소입니다.");
  }
}
