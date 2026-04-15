# 022 — SSR + TanStack Query 하이드레이션 패턴

## 문제: 모든 페이지가 클라이언트 fetch 폭포수

기존 흐름:

```
1. page.tsx → 빈 HTML 전송
2. 브라우저: Client Component 마운트
3. 브라우저: TanStack Query fetch 시작 (네트워크 요청)
4. 브라우저: 데이터 도착 → 화면 표시
```

사용자 입장에서는 페이지 진입 후 데이터가 보이기까지 무조건 2번의 왕복이 필요하다:

- 1번: HTML 수신
- 2번: 데이터 fetch

---

## 해결: 서버 prefetch + 하이드레이션

개선된 흐름:

```
1. page.tsx → 서버에서 북마크 fetch
2. 서버: 데이터를 HTML에 직렬화(dehydrate)해서 함께 전송
3. 브라우저: Client Component 마운트
4. 브라우저: TanStack Query가 캐시에서 즉시 읽음 (fetch 없음)
```

네트워크 왕복이 1번으로 줄고, 화면에 데이터가 즉시 표시된다.

---

## 핵심 개념

### dehydrate / hydrate

TanStack Query의 QueryClient는 메모리 캐시다.
서버에서 이 캐시를 **직렬화(serialize)** 해서 HTML에 포함시키고,
클라이언트에서 **역직렬화(deserialize)** 해서 자신의 캐시에 채운다.

```
서버 QueryClient (데이터 있음)
        ↓ dehydrate()
JSON 형태의 직렬화된 상태
        ↓ HTML에 포함해 전송
클라이언트 수신
        ↓ HydrationBoundary가 hydrate()
클라이언트 QueryClient (서버 데이터로 채워짐)
        ↓
useBookmarks() → 캐시 히트 → fetch 없음
```

### HydrationBoundary

서버에서 dehydrate한 상태를 받아서 클라이언트 QueryClient에 주입하는 컴포넌트.
React Context 방식으로 동작하며, 자식 컴포넌트들이 하이드레이션된 데이터를 즉시 사용할 수 있게 한다.

```tsx
// page.tsx (Server Component)
const queryClient = new QueryClient();

await queryClient.prefetchQuery({
  queryKey: bookmarkKeys.list(),
  queryFn: fetchBookmarksServer,
});

return (
  <HydrationBoundary state={dehydrate(queryClient)}>
    <BookmarksContent /> {/* useBookmarks()가 캐시 히트 */}
  </HydrationBoundary>
);
```

---

## 구현 구조

### 서버 전용 fetch 함수 (`bookmark.server.ts`)

서버에서만 쓰는 Supabase 클라이언트(`createSupabaseServerClient`)로 북마크를 조회한다.
클라이언트 Supabase(`supabase`)는 브라우저 환경에서만 동작하므로 Server Component에서 사용할 수 없다.

```ts
// 서버 Supabase vs 클라이언트 Supabase 차이
createSupabaseServerClient(); // cookies()로 세션 읽음 → Server Component, API Route에서 사용
supabase(client.ts); // localStorage/쿠키 직접 접근 → 브라우저에서만 사용
```

### 비회원 처리

비회원 북마크는 `localStorage`에 있다. 서버에서는 접근 불가.
따라서 **회원일 때만 prefetch**하고, 비회원은 기존 CSR 방식 그대로 유지한다.

```ts
const { data: { user } } = await supabase.auth.getUser();

if (user) {
  // 회원 → 서버에서 prefetch → HydrationBoundary로 전달
  await queryClient.prefetchQuery({ ... });
}
// 비회원 → queryClient 비어있음 → 클라이언트에서 localStorage fetch
```

빈 QueryClient를 dehydrate하면 빈 상태가 전달되고,
`useBookmarks()`는 캐시 미스 → 클라이언트에서 정상 fetch한다.

---

## query key 일치가 핵심

서버의 `prefetchQuery`와 클라이언트의 `useBookmarks()`가 **정확히 같은 query key**를 써야 한다.
key가 다르면 캐시 히트가 발생하지 않아 하이드레이션 의미가 없다.

```ts
// 서버 prefetch
queryKey: bookmarkKeys.list(); // ["bookmarks", "list", undefined]

// 클라이언트 useBookmarks()
queryKey: bookmarkKeys.list(filter); // filter 없으면 ["bookmarks", "list", undefined]
```

필터가 있는 경우(태그, 검색어) key가 달라지므로 그 경우엔 서버 데이터를 쓰지 않고 클라이언트에서 fetch한다.
이건 의도된 동작이다 — 초기 전체 목록만 SSR하고, 필터링은 CSR에서 처리.

---

## staleTime과 리페치 방지

클라이언트 `QueryProvider`의 `defaultOptions.staleTime`이 `5 * 60 * 1000` (5분)으로 설정되어 있다.

TanStack Query는 하이드레이션된 데이터의 `dataUpdatedAt`을 서버 fetch 시점으로 설정한다.
이 시간 + `staleTime` 이전이면 fresh로 판단 → 클라이언트에서 즉시 리페치하지 않는다.

서버 렌더링 직후 클라이언트 마운트 시점은 수 초 차이이므로, `staleTime: 5분` 설정 덕분에 중복 fetch가 발생하지 않는다. ✅

단, `refetchInterval`이 설정된 쿼리(`aiStatus`가 processing/crawling인 경우)는 인터벌에 따라 계속 폴링한다. 이것도 의도된 동작이다.

---

## 적용 범위

| 페이지       | SSR 여부  | 이유                                    |
| ------------ | --------- | --------------------------------------- |
| `/` (홈)     | ✅ 회원만 | 첫 진입점, 초기 북마크 목록 즉시 표시   |
| `/bookmarks` | ✅ 회원만 | 검색 페이지, 전체 북마크 목록 사전 로드 |
| 비회원       | ❌ CSR    | localStorage 접근 불가                  |

---

## 패턴 요약

```
Server Component (page.tsx)
  ├── createSupabaseServerClient() → 서버 세션 읽기
  ├── user 존재 시 prefetchQuery()
  ├── dehydrate(queryClient) → JSON 직렬화
  └── HydrationBoundary state={...}
        └── Suspense
              └── Client Component (Content)
                    └── useQuery() → 캐시 히트 → fetch 없음
```
