export function validateUrl(url: string): string | null {
  if (!url.trim()) return "URL을 입력해주세요";

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "올바른 URL 형식이 아닙니다";
  }

  // http/https 외 스킴(javascript:, data:, file:, ftp: 등) 차단.
  // 저장된 url은 <a href>로 렌더되므로 javascript: 스킴 허용 시 저장형 XSS가 된다.
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "http 또는 https 주소만 저장할 수 있습니다";
  }

  return null;
}
