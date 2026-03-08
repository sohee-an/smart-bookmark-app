export function validateUrl(url: string): string | null {
  if (!url.trim()) return "URL을 입력해주세요";
  try {
    new URL(url);
    return null;
  } catch {
    return "올바른 URL 형식이 아닙니다";
  }
}
