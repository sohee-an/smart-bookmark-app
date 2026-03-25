# Next.js 심화 활용 — Smart Bookmark

## 1. Server Actions

클라이언트에서 `fetch('/api/...')` 없이 서버 함수를 직접 호출하는 방식.
별도 API Route 없이 form 제출, 데이터 변경이 가능.

### 현재 방식 vs Server Actions

```tsx
// 현재 방식 — 클라이언트에서 API 호출
const res = await fetch("/api/crawl", {
  method: "POST",
  body: JSON.stringify({ url }),
});
const data = await res.json();

// Server Actions 방식
("use server");
export async function crawlAndSave(url: string) {
  const crawlResult = await crawlerService.crawl(url);
  const supabase = await createSupabaseServerClient();
  await supabase.from("bookmarks").insert({ url, ...crawlResult });
  revalidatePath("/"); // 북마크 목록 자동 갱신
}

// 클라이언트에서 사용
import { crawlAndSave } from "@/features/bookmark/model/actions";
await crawlAndSave(url); // fetch 없이 직접 호출
```

**장점**:

- 타입 안전 (API 요청/응답 타입 별도 정의 불필요)
- 네트워크 왕복 1번 감소
- `revalidatePath` / `revalidateTag`로 캐시 자동 갱신

### Smart Bookmark에서 적용할 곳

```
features/bookmark/model/actions.ts
  ├── addBookmark(url)        → POST /api/crawl + DB 저장 통합
  ├── updateBookmark(id, data) → PATCH 처리
  └── deleteBookmark(id)      → DELETE 처리
```

---

## 2. Parallel Routes + Intercepting Routes

### 현재 방식의 한계

북마크 상세 패널이 Zustand 상태로 관리됨.

- 특정 북마크 URL 공유 불가
- 새로고침 시 패널 닫힘
- 뒤로가기 동작 어색함

### Parallel Routes로 해결

```
app/
├── @panel/                     ← 병렬 슬롯
│   └── bookmark/
│       └── [id]/
│           └── page.tsx        ← 북마크 상세 (URL: /bookmark/123)
├── layout.tsx                  ← @panel 슬롯 렌더링
└── page.tsx
```

```tsx
// app/layout.tsx
export default function Layout({
  children,
  panel, // @panel 슬롯
}: {
  children: React.ReactNode;
  panel: React.ReactNode;
}) {
  return (
    <div>
      {children}
      {panel} {/* 북마크 상세 패널 */}
    </div>
  );
}
```

### Intercepting Routes

목록에서 카드 클릭 시 → 모달(패널)로 오픈.
직접 URL 접근 시 → 전체 페이지로 표시.

```
app/
├── (.)bookmark/[id]/           ← 같은 레벨에서 가로채기
│   └── page.tsx                ← 모달로 표시
└── bookmark/
    └── [id]/
        └── page.tsx            ← 직접 접근 시 전체 페이지
```

---

## 3. Metadata API + 동적 OG 이미지

### 정적 metadata

```tsx
// app/landing/page.tsx
export const metadata: Metadata = {
  title: "SmartMark — 똑똑한 북마크 관리의 시작",
  description: "AI가 분류하고 정리하는 나만의 스마트 북마크 솔루션",
};
```

### 동적 metadata (북마크 상세 페이지 추후 추가 시)

```tsx
// app/bookmark/[id]/page.tsx
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const bookmark = await getBookmark(params.id);

  return {
    title: `${bookmark.title} — SmartMark`,
    description: bookmark.summary,
    openGraph: {
      title: bookmark.title,
      description: bookmark.summary,
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(bookmark.title)}&desc=${encodeURIComponent(bookmark.summary)}`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}
```

현재 `/api/og` Route Handler(Edge)가 이미 구현됨 → 연동만 하면 됨 ✅

---

## 4. Route Handlers 심화

### 현재 구조

```
app/api/
├── crawl/route.ts
├── ai-analyze/route.ts
├── embed/route.ts
├── semantic-search/route.ts
├── auth/callback/route.ts
└── og/route.tsx                ← Edge Runtime
```

### Edge Runtime vs Node.js Runtime

```tsx
// Edge Runtime — 가볍고 빠름, Node.js API 사용 불가
export const runtime = "edge";

// Node.js Runtime (기본값) — 무겁지만 Node.js API 모두 사용 가능
export const runtime = "nodejs";
```

|             | Edge            | Node.js            |
| ----------- | --------------- | ------------------ |
| 콜드 스타트 | ~0ms            | ~100ms             |
| 메모리      | 128MB           | 최대 1GB           |
| Node.js API | ❌              | ✅                 |
| 사용 케이스 | OG 이미지, 인증 | DB 접근, 파일 처리 |

Smart Bookmark에서:

- `/api/og` → Edge (이미 적용 ✅)
- `/api/crawl`, `/api/ai-analyze` → Node.js (cheerio 등 Node.js 의존)

### 응답 스트리밍

AI 분석 결과를 스트리밍으로 내려줘서 사용자가 기다리는 동안 진행상황 표시.

```tsx
// app/api/ai-analyze/route.ts
export async function POST(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Gemini Streaming API
      const result = await model.generateContentStream(prompt);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}
```

---

## 5. 캐시 전략

### Next.js 캐시 레이어

```
요청
  ↓
Router Cache (브라우저 메모리, 30초)
  ↓
Full Route Cache (서버, Static 페이지)
  ↓
Data Cache (fetch 캐시, 서버)
  ↓
Request Memoization (같은 요청 중복 제거)
```

### 실제 적용

```tsx
// 서버 컴포넌트에서 fetch 캐시 제어
const bookmarks = await fetch(`${process.env.API_URL}/bookmarks`, {
  cache: "no-store", // 캐시 없음 (북마크 목록)
  next: { revalidate: 3600 }, // 1시간 캐시
  next: { tags: ["bookmarks"] }, // 태그 기반 캐시 무효화
});

// Server Action에서 캐시 무효화
import { revalidateTag, revalidatePath } from "next/cache";

export async function addBookmark(url: string) {
  await saveToDb(url);
  revalidatePath("/"); // / 페이지 캐시 제거
  revalidatePath("/bookmarks"); // /bookmarks 페이지 캐시 제거
  revalidateTag("bookmarks"); // bookmarks 태그 캐시 제거
}
```

---

## 6. Middleware(Proxy) 심화

현재 `proxy.ts`에서 Supabase 인증 확인 + 리다이렉트 처리 중.

### 추가할 수 있는 것

```tsx
// proxy.ts
export async function proxy(request: NextRequest) {
  // 1. 인증 확인 (현재 구현)

  // 2. A/B 테스트 (추후)
  const bucket = Math.random() < 0.5 ? "a" : "b";
  response.cookies.set("ab-test", bucket);

  // 3. 봇 차단 (추후)
  const userAgent = request.headers.get("user-agent") ?? "";
  if (isBot(userAgent)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 4. 요청 로깅 (추후)
  console.log(`[${new Date().toISOString()}] ${request.method} ${request.nextUrl.pathname}`);

  return response;
}
```

---

## 면접 단골 질문 대비

**Q. Server Component와 Client Component 차이는?**

> Server Component는 서버에서만 실행되어 번들에 포함되지 않는다.
> useState, useEffect 등 훅을 사용할 수 없지만, DB 직접 접근, 민감 정보 처리가 가능하다.
> Client Component는 브라우저에서 실행되며 인터랙션 처리를 담당한다.

**Q. App Router에서 데이터 페칭을 어떻게 하나요?**

> Server Component에서 async/await로 직접 fetch 또는 DB 접근.
> 캐시는 fetch의 next.revalidate나 revalidatePath/revalidateTag로 제어.
> 클라이언트 사이드는 useEffect 또는 SWR/React Query 사용.

**Q. SSR과 SSG 중 어떤 걸 선택하나요?**

> 데이터가 요청마다 달라지면 SSR, 모든 사용자에게 같은 데이터면 SSG.
> 이 프로젝트에서 /landing은 정적(SSG), 북마크 목록은 사용자별로 달라서 SSR.

**Q. Streaming은 무엇이고 왜 쓰나요?**

> 서버에서 HTML을 청크 단위로 전송하는 방식.
> 느린 데이터 fetch가 있어도 준비된 부분을 먼저 렌더링해서 사용자가 빠르게 볼 수 있음.
> Suspense boundary로 어느 부분을 스트리밍할지 제어.
