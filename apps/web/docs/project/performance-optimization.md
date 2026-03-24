# 성능 최적화 — Smart Bookmark

## Core Web Vitals 기준

Google이 SEO 및 UX 평가에 사용하는 지표.

| 지표                                  | 의미                   | 목표값  |
| ------------------------------------- | ---------------------- | ------- |
| LCP (Largest Contentful Paint)        | 가장 큰 요소 렌더 시간 | < 2.5s  |
| FID / INP (Interaction to Next Paint) | 첫 입력 응답 시간      | < 200ms |
| CLS (Cumulative Layout Shift)         | 레이아웃 이동 정도     | < 0.1   |

측정 도구: Chrome DevTools Lighthouse, [pagespeed.web.dev](https://pagespeed.web.dev)

---

## 1. next/image — 이미지 최적화

북마크 카드 썸네일에 적용.

```tsx
// entities/bookmark/ui/BookmarkCard.tsx
import Image from "next/image";

// 현재 (최적화 전)
<img src={thumbnailUrl} alt={title} className="..." />

// 개선 후
<Image
  src={thumbnailUrl}
  alt={title}
  width={400}
  height={200}
  className="..."
  placeholder="blur"
  blurDataURL="data:image/png;base64,..."  // 저해상도 미리보기
  onError={() => setImgError(true)}        // 이미지 로드 실패 처리
/>
```

**next.config.ts에 외부 도메인 허용 필요**:

```ts
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" }, // 모든 외부 이미지 허용
      // 또는 구체적으로
      { protocol: "https", hostname: "og.bild.de" },
    ],
  },
};
```

**효과**:

- WebP/AVIF 자동 변환 (파일 크기 ~40% 감소)
- lazy loading 자동 적용
- 뷰포트 크기에 맞는 해상도 자동 제공

---

## 2. 폰트 최적화

현재 `layout.tsx`에서 `next/font/google` 이미 사용 중 → **이미 완료** ✅

```tsx
// app/layout.tsx — 현재 코드
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
```

`next/font`는 빌드 시 폰트를 다운로드해 self-host하므로
외부 Google Fonts CDN 요청이 없어 FOUT(폰트 로드 전 깜빡임) 제거됨.

---

## 3. 번들 크기 최적화

### Dynamic Import (코드 스플리팅)

무거운 컴포넌트를 필요할 때만 로드.

```tsx
// features/bookmark/ui/AddBookmarkOverlay.tsx
// 북마크 추가 모달 — 자주 쓰이지 않으므로 dynamic import 적합

import dynamic from "next/dynamic";

const AddBookmarkOverlay = dynamic(() => import("@/features/bookmark/ui/AddBookmarkOverlay"), {
  loading: () => <div className="animate-pulse" />,
  ssr: false, // 클라이언트에서만 사용
});
```

### 번들 분석

```bash
# 어떤 모듈이 번들 크기를 차지하는지 분석
pnpm add -D @next/bundle-analyzer

# next.config.ts
import withBundleAnalyzer from "@next/bundle-analyzer";
export default withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })(nextConfig);

# 실행
ANALYZE=true pnpm build
```

---

## 4. 데이터 페칭 최적화

### 병렬 fetch (현재 순차적인 부분 개선)

```tsx
// 개선 전 — 순차 실행 (느림)
const bookmarks = await getBookmarks();
const tags = await getTags();

// 개선 후 — 병렬 실행
const [bookmarks, tags] = await Promise.all([getBookmarks(), getTags()]);
```

### Supabase 쿼리 최적화

```tsx
// 개선 전 — 전체 컬럼 조회
const { data } = await supabase.from("bookmarks").select("*");

// 개선 후 — 필요한 컬럼만
const { data } = await supabase
  .from("bookmarks")
  .select("id, title, url, thumbnail_url, ai_status, created_at")
  .order("created_at", { ascending: false })
  .limit(20);
```

---

## 5. AI API 비용 최적화 + Rate Limiting

현재 `/api/crawl`, `/api/ai-analyze`, `/api/embed`는 무방비 상태.
악의적 호출 1회로 Gemini API 비용 폭탄 가능.

### Upstash Redis Rate Limiting

```bash
pnpm add @upstash/ratelimit @upstash/redis
```

```tsx
// app/api/ai-analyze/route.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 m"), // 분당 5회
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
  const { success, limit, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { message: "Too many requests" },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
        },
      }
    );
  }
  // ... 기존 로직
}
```

### 임베딩 결과 캐싱

같은 텍스트는 항상 같은 임베딩 → Redis에 캐싱해서 Gemini API 호출 절감.

```tsx
// app/api/embed/route.ts
const cacheKey = `embed:${Buffer.from(text).toString("base64").slice(0, 32)}`;
const cached = await redis.get(cacheKey);

if (cached) return NextResponse.json({ success: true, data: { embedding: cached } });

const result = await model.embedContent(...);
await redis.set(cacheKey, result.embedding.values, { ex: 60 * 60 * 24 * 7 }); // 7일
```

---

## 6. 렌더링 성능

### Zustand 셀렉터로 불필요한 리렌더 방지

```tsx
// 개선 전 — 스토어 전체 구독 (bookmarks 변경 시 항상 리렌더)
const { bookmarks, setBookmarks } = useBookmarkStore();

// 개선 후 — 필요한 것만 구독
const bookmarks = useBookmarkStore((s) => s.bookmarks);
const setBookmarks = useBookmarkStore((s) => s.setBookmarks);
```

### React.memo + useCallback

```tsx
// entities/bookmark/ui/BookmarkCard.tsx
export const BookmarkCard = React.memo(function BookmarkCard({ bookmark, onTagClick }) {
  const handleTagClick = useCallback(
    (tag: string) => {
      onTagClick(tag);
    },
    [onTagClick]
  );

  return <div>...</div>;
});
```

**주의**: 무조건 memo가 좋은 건 아님. 비교 비용 > 리렌더 비용이면 역효과.
실제 성능 문제가 측정될 때 적용.

---

## 우선순위 체크리스트

```
즉시 적용 (효과 크고 쉬움)
  □ next/image 전환 (BookmarkCard 썸네일)
  □ next.config.ts 이미지 도메인 설정
  □ Rate Limiting (비용 보호)

중기 적용
  □ SSR 초기 데이터 fetch (/ 및 /bookmarks)
  □ Supabase select * → 필요 컬럼만
  □ 임베딩 Redis 캐싱

장기 적용
  □ 번들 분석 후 dynamic import 적용
  □ Zustand 셀렉터 최적화
  □ Core Web Vitals 측정 후 병목 제거
```
