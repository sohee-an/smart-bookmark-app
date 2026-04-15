# 렌더링 전략 — Smart Bookmark

## 개요

Next.js App Router에서 렌더링 방식은 컴포넌트/라우트 단위로 선택한다.
**잘못된 선택 = 느린 첫 로드 or 불필요한 서버 비용.**

---

## 렌더링 방식 비교

| 방식      | 실행 위치 | 언제 실행         | 특징                         |
| --------- | --------- | ----------------- | ---------------------------- |
| SSR       | 서버      | 요청마다          | 최신 데이터, 느린 TTFB       |
| SSG       | 빌드 시   | 빌드 한 번        | 가장 빠름, 데이터 고정       |
| ISR       | 서버      | 주기적 재생성     | SSG + 주기적 갱신            |
| CSR       | 브라우저  | 클라이언트 마운트 | 인터랙션, SEO 불리           |
| Streaming | 서버      | 요청마다 (점진적) | 부분 렌더 후 나머지 스트리밍 |

---

## App Router에서의 기본 원칙

```
Server Component (기본값)
  └─ 데이터 fetch, DB 접근, 민감한 로직
  └─ "use client" 없으면 자동으로 서버 컴포넌트

Client Component ("use client" 선언 필요)
  └─ useState, useEffect, 이벤트 핸들러
  └─ 브라우저 API (window, localStorage)
  └─ 실시간 인터랙션이 필요한 UI
```

**핵심 규칙**: 서버 컴포넌트가 클라이언트 컴포넌트를 import할 수 있지만,
클라이언트 컴포넌트는 서버 컴포넌트를 import 불가 (children으로 전달은 가능).

---

## Smart Bookmark 페이지별 적용 전략

### `/` 메인 페이지

**현재**: 전체 CSR (`"use client"`)

**개선 방향**:

```tsx
// app/page.tsx — Server Component
export default async function HomePage() {
  // 서버에서 초기 데이터 fetch → 빈 화면 깜빡임 제거
  const supabase = await createSupabaseServerClient();
  const { data: initialBookmarks } = await supabase
    .from("bookmarks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <Suspense fallback={<HomePageSkeleton />}>
      <HomeContent initialData={initialBookmarks} /> {/* Client Component */}
    </Suspense>
  );
}
```

**왜**: 북마크 목록은 사용자마다 다르고 실시간성이 필요 → SSR.
초기 데이터를 서버에서 내려줘야 첫 로드 시 빈 화면이 없음.

---

### `/bookmarks` 검색 페이지

**현재**: 전체 CSR

**전략**: **SSR + CSR 혼합**

```
app/bookmarks/page.tsx (Server Component)
  └─ 초기 북마크 목록 서버 fetch (SSR)
  └─ URL searchParams 읽어서 초기 필터 적용

BookmarksContent.tsx (Client Component)
  └─ 검색/필터 인터랙션 (CSR)
  └─ 시맨틱 검색 결과 fetch (CSR, 비동기)
```

**이유**: 검색 결과는 URL query에 따라 바뀌므로 SSR로 초기값을 주되,
이후 인터랙션(태그 필터, 검색)은 클라이언트에서 처리.

---

### `/landing`, `/login` 랜딩/로그인 페이지

**전략**: **SSG (Static)**

```tsx
// 로그인하지 않은 사용자용 정적 페이지
// 데이터 변경이 없으므로 빌드 시 한 번만 생성
// revalidate 선언 없으면 기본적으로 정적 처리됨
export const metadata: Metadata = { title: "..." };
// → 빌드 결과물에서 ○ (Static) 표시
```

현재 빌드 결과:

```
○ /landing   ← 이미 Static으로 처리되고 있음 ✅
○ /login     ← 이미 Static으로 처리되고 있음 ✅
```

---

### `/api/*` Route Handlers

**전략**: 요청 성격에 따라 분리

| 엔드포인트             | 캐시 전략 | 이유                                        |
| ---------------------- | --------- | ------------------------------------------- |
| `/api/crawl`           | 캐시 없음 | 매 요청마다 외부 URL 크롤링                 |
| `/api/ai-analyze`      | 캐시 없음 | 같은 URL도 분석 결과 달라질 수 있음         |
| `/api/embed`           | 캐시 가능 | 같은 텍스트 = 같은 임베딩 (추후 Redis 캐시) |
| `/api/og`              | Edge 캐시 | 정적 이미지 생성, CDN 캐시 적합             |
| `/api/semantic-search` | 캐시 없음 | 실시간 검색                                 |

---

## Streaming + Suspense

데이터 fetch가 느린 구간에 스켈레톤을 즉시 보여주고,
데이터가 준비되면 교체하는 방식.

```tsx
// app/bookmarks/page.tsx
import { Suspense } from "react";

export default function BookmarksPage() {
  return (
    <>
      {/* 헤더는 즉시 렌더 */}
      <Header />

      {/* 북마크 목록은 데이터 준비될 때까지 스켈레톤 */}
      <Suspense fallback={<BookmarkListSkeleton />}>
        <BookmarkListServer /> {/* async Server Component */}
      </Suspense>
    </>
  );
}
```

**효과**: 사용자는 빈 화면 대신 스켈레톤을 보고,
북마크 목록이 준비되면 교체됨 → 체감 속도 향상.

---

## revalidate / 캐시 전략

```tsx
// 페이지 단위 재검증 주기 설정
export const revalidate = 0; // 캐시 없음 (항상 최신) — 북마크 페이지
export const revalidate = 3600; // 1시간 캐시 — 잘 안 바뀌는 페이지
export const dynamic = "force-dynamic"; // SSR 강제 (revalidate = 0과 동일)

// fetch 단위 캐시 제어
const data = await fetch(url, {
  next: { revalidate: 60 }, // 60초 캐시
  cache: "no-store", // 캐시 없음
});
```

---

## 결정 트리

```
이 컴포넌트/페이지가...

사용자 인터랙션이 필요한가?
  Yes → Client Component ("use client")
  No  →
    데이터가 요청마다 달라지는가?
      Yes → SSR (dynamic)
      No  →
        데이터가 주기적으로 바뀌는가?
          Yes → ISR (revalidate: N초)
          No  → SSG (static) ← 가장 빠름
```

---

## 현재 프로젝트 렌더링 현황

```
빌드 결과 기준:

○ (Static)
  /landing         — 비회원 랜딩, 정적
  /login           — 로그인 폼, 정적
  /                — 개선 전: CSR / 개선 후: SSR
  /bookmarks       — 개선 전: CSR / 개선 후: SSR + CSR 혼합

ƒ (Dynamic / Server)
  /api/crawl
  /api/ai-analyze
  /api/embed
  /api/semantic-search
  /api/auth/callback
  /api/og          — Edge Runtime
```
