# 009 · thumbnailUrl 미검증

## 심각도

Low

## 위치

- `apps/web/src/server/services/crawler.service.ts` — 51번째 줄
- `apps/web/src/features/bookmark/ui/AddBookmarkOverlay.tsx` — 85번째 줄

## 문제

크롤 결과에서 추출한 `og:image` URL을 아무 검증 없이 저장하고 `<img src={thumbnailUrl}>`로 렌더링합니다.

```ts
// crawler.service.ts
const thumbnailUrl = $('meta[property="og:image"]').attr("content") || "";
```

악의적인 웹사이트가 `og:image`에 다음을 넣을 수 있습니다.

- `http://attacker.com/track?id=...` — 사용자 IP/브라우저 정보 추적
- `http://internal-server/secret-image` — 내부 서버 탐색 (서버에서 fetch하는 경우)
- `javascript:alert(1)` — img src에서는 실행 안 되지만 다른 렌더링 컨텍스트에서 위험

현재는 클라이언트 `<img src>` 렌더링만 하므로 XSS 위험은 낮지만 사용자 추적은 가능합니다.

## 수정 방향

```ts
function isSafeThumbnailUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

const thumbnailUrl = isSafeThumbnailUrl(raw) ? raw : "";
```

더 엄격하게 하려면 SSRF 방어(001 참조)와 동일한 private IP 차단 로직을 적용합니다.
