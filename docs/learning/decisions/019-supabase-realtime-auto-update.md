# Supabase Realtime 자동 갱신 — 익스텐션 저장 후 새로고침 없이 업데이트

## 문제

익스텐션에서 북마크를 저장하면 서버에서 크롤링 → AI 분석이 끝난 뒤 DB가 업데이트된다.
그런데 웹앱은 이 변경을 모르기 때문에 새로고침을 해야 title/summary/tags가 반영된다.

```
익스텐션 저장 → 서버 파이프라인 완료 → DB UPDATE
    ↓
웹앱: "나는 모름" → 카드가 "분석 중..." 상태 그대로 ← 문제
```

---

## 해결 — Supabase Realtime 구독

Supabase Realtime으로 `bookmarks` 테이블 변경을 실시간 구독한다.
DB가 업데이트되면 이벤트가 날아오고, TanStack Query 캐시를 바로 갱신한다.

```
DB UPDATE (ai_status: "completed")
    ↓
Supabase Realtime → 웹앱에 postgres_changes 이벤트 전달
    ↓
TanStack Query 캐시 업데이트
    ↓
카드 자동으로 title/summary/tags 표시 (새로고침 없음)
```

---

## 구현

### useBookmarkRealtime 훅

```typescript
// features/bookmark/model/useBookmarkRealtime.ts
export function useBookmarkRealtime(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("bookmark-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${userId}`, // 본인 데이터만 구독
        },
        (payload) => {
          // 변경된 row를 캐시에 즉시 반영
          queryClient.setQueriesData<any[]>({ queryKey: bookmarkKeys.all }, (old = []) =>
            old.map((b) =>
              b.id === payload.new.id
                ? {
                    ...b,
                    title: payload.new.title ?? b.title,
                    summary: payload.new.summary ?? b.summary,
                    aiStatus: payload.new.ai_status ?? b.aiStatus,
                    thumbnailUrl: payload.new.thumbnail_url ?? b.thumbnailUrl,
                  }
                : b
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // 다른 기기/익스텐션에서 새 북마크 추가 시 전체 갱신
          queryClient.invalidateQueries({ queryKey: bookmarkKeys.all });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
```

### BookmarkRealtimeSync 컴포넌트

훅을 앱 전체에 적용하기 위해 layout.tsx에 마운트하는 컴포넌트를 만든다.

```typescript
// shared/lib/BookmarkRealtimeSync.tsx
export function BookmarkRealtimeSync() {
  const [userId, setUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    // 현재 로그인 유저 확인
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
    });

    // 로그인/로그아웃 시 userId 갱신
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  useBookmarkRealtime(userId);
  return null;
}
```

### layout.tsx에 등록

```tsx
// app/layout.tsx
<QueryProvider>
  <BookmarkRealtimeSync /> {/* ← 앱 전체에서 Realtime 구독 */}
  <OverlayProvider>{children}</OverlayProvider>
</QueryProvider>
```

---

## UPDATE vs invalidateQueries 차이

| 방식                         | 동작                                  | 특징                        |
| ---------------------------- | ------------------------------------- | --------------------------- |
| `setQueriesData` (UPDATE)    | 캐시를 payload 데이터로 직접 교체     | 서버 재요청 없음, 즉각 반영 |
| `invalidateQueries` (INSERT) | 캐시를 stale 처리 → 백그라운드 재요청 | 새 데이터 정확히 가져옴     |

- **UPDATE**: 서버가 보내준 payload에 변경된 값이 있으므로 재요청 없이 바로 반영
- **INSERT**: 새 북마크는 캐시에 없으므로 전체 목록을 다시 불러와야 함

---

## 주의사항

Supabase Realtime을 사용하려면 Supabase 대시보드에서 해당 테이블의 Realtime이 활성화돼 있어야 한다.

```
Supabase 대시보드 → Database → Replication → bookmarks 테이블 체크
```

---

## 관련 파일

- `apps/web/src/features/bookmark/model/useBookmarkRealtime.ts` — 신규 생성
- `apps/web/src/shared/lib/BookmarkRealtimeSync.tsx` — 신규 생성
- `apps/web/src/app/layout.tsx` — BookmarkRealtimeSync 추가
