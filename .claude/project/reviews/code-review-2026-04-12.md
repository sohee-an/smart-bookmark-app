# 코드 리뷰 — refactor/layout 브랜치 (2026-04-12)

## 치명적 문제 (즉시 수정)

### [1] `typescript.ignoreBuildErrors: true` — TypeScript를 껐다

- `apps/web/next.config.ts:16`
- TypeScript strict 모드가 핵심 어필 포인트인데, `ignoreBuildErrors: true`는 타입 에러가 있어도 빌드를 통과시킨다. 임시 조치가 main으로 병합되면 타입 에러를 묵인한 채 배포하는 구조가 된다.
- **수정:** `ignoreBuildErrors` 블록 제거. 빌드 에러가 있으면 에러를 직접 고쳐야 한다.

### [2] `next/image` remotePatterns — `hostname: "**"` + `http://` 와일드카드

- `apps/web/next.config.ts:9-12`
- `http://` 프로토콜 + `hostname: "**"` 조합은 내부망 IP를 포함한 임의 이미지 URL을 `next/image`로 프록시할 수 있게 허용한다. `http://169.254.169.254/` 등 내부 서버 응답이 이미지로 노출되는 시나리오가 가능하다.
- **수정:** `protocol: "http"` 제거. `hostname: "**"` 대신 실제 CDN/스토리지 도메인만 명시적으로 허용.

---

## 설계 문제 (PR 전 수정)

### [3] `useEffect` 의존성 배열 `[!!bookmarks.length]` — 변경 감지 실패

- `apps/web/src/widgets/home/ui/HomeContent.tsx:46`
- `!!bookmarks.length`는 `false → true` 전환 시 한 번만 실행된다. 이후 북마크가 추가/수정돼도 이미 `true`이므로 재실행 안 됨. 5분 이상 stuck 북마크를 자동 failed 처리하는 로직인데, 마운트 이후에 추가된 stuck 북마크는 영원히 처리되지 않는다. eslint-disable 주석으로 경고를 억제한 것도 문제.
- **수정:** 의존성을 `[bookmarks]`로 교체.

### [4] 날짜 필터링 4개 변수가 매 렌더마다 재계산

- `apps/web/src/widgets/home/ui/HomeContent.tsx:50-55`
- `now`, `recentBookmarks`, `recentIds`, `allBookmarks`가 모두 렌더 최상위에 위치. 패널 선택, 버튼 클릭 등 모든 리렌더마다 전체 배열을 두 번 순회한다.
- **수정:** `useMemo(() => ({ recentBookmarks, allBookmarks }), [bookmarks])`로 감싸기.

### [5] `page.tsx`가 서버 컴포넌트임에도 초기 데이터 prefetch 없음

- `apps/web/src/app/(main)/page.tsx`
- `HomeContent`가 `"use client"`라 전체 클라이언트 렌더. 페이지 로드 후 JS 번들 → TanStack Query 초기화 → fetch → 렌더로 이어지는 클라이언트 waterfall 존재.

### [6] `useBookmarks`에 `staleTime` 미설정 — 포커스마다 전체 refetch + 폴링 중복

- `apps/web/src/features/bookmark/model/queries.ts:15-27`
- `staleTime` 기본값 0 → 탭 전환, 창 포커스마다 `refetchOnWindowFocus` 발동. `refetchInterval` 3초 폴링과 동시에 작동하면 pending 상태일 때 이중 refetch 발생.
- **수정:** `staleTime: 30 * 1000` 이상 설정.

---

## 개선 권장 (선택)

### [7] `retryCounts` / `exhaustedIds` 분리 권장

- `useRef`와 `useState` 혼재. `useRetryBookmark` 훅으로 분리 권장. (`HomeContent.tsx:28`)

### [8] `useUpdateBookmark`의 `data: Partial<Bookmark>` 타입이 너무 넓음

- `id`, `url`, `createdAt` 같은 변경 불가 필드까지 포함됨. `UpdateBookmarkData` 제한 타입 사용 필요. (`queries.ts:32`)

---

## 잘된 부분

- `page.tsx` 간결화 — metadata 선언만 남기고 비즈니스 로직 완전 제거한 방향은 맞다.
- `refetchInterval` 조건부 처리 — pending 상태일 때만 폴링, 그 외 `false` 반환 패턴.
- Optimistic update 롤백 — `onMutate` 스냅샷 → `onError` 복원 → `onSettled` invalidate. TanStack Query 권장 방식에 부합.

---

## 우선순위 요약

| 순위 | 항목                                  | 이유                        |
| ---- | ------------------------------------- | --------------------------- |
| 1    | [1] `ignoreBuildErrors` 제거          | TypeScript strict 어필 붕괴 |
| 2    | [2] `next/image` http 와일드카드 제거 | SSRF 보조 공격 벡터         |
| 3    | [3] `useEffect` 의존성 배열 수정      | stuck 북마크 자동 처리 버그 |
| 4    | [4] `useMemo` 날짜 필터 메모화        | 불필요한 매 렌더 재계산     |
| 5    | [6] `staleTime` 설정                  | 불필요한 DB 쿼리 중복       |
