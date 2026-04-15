# 002 · IDOR (Insecure Direct Object Reference)

## 심각도

Critical

## 위치

- `apps/web/src/entities/bookmark/api/supabase.repository.ts`
  - `delete()` — 75번째 줄
  - `update()` — 102번째 줄
  - `findById()` — 63번째 줄
  - `replaceTags()` — 114번째 줄

## 문제

`delete`, `update`, `findById` 쿼리가 `id`만으로 레코드를 조회·수정합니다.
`user_id` 필터가 없어서 로그인한 사용자 A가 B의 북마크 ID만 알면 아래가 모두 가능합니다.

```ts
// 현재 코드 — user_id 체크 없음
await supabase.from("bookmarks").delete().eq("id", id);
await supabase.from("bookmarks").update(updateFields).eq("id", id);
```

북마크 ID는 UUID이지만 순차 예측이 아니더라도 다른 경로(공유, 로그 노출 등)로 획득 가능합니다.

## 수정 방향

### 방법 1 — 쿼리에 user_id 조건 추가 (즉시 적용 가능)

```ts
await supabase.from("bookmarks").delete().eq("id", id).eq("user_id", this.userId); // 추가

await supabase.from("bookmarks").update(updateFields).eq("id", id).eq("user_id", this.userId); // 추가
```

`findById`도 동일하게 `.eq("user_id", this.userId)` 추가.

### 방법 2 — Supabase RLS 정책 (근본 해결)

```sql
-- bookmarks 테이블 RLS
CREATE POLICY "users can only access own bookmarks"
ON bookmarks
FOR ALL
USING (auth.uid() = user_id);
```

RLS가 DB 레벨에서 보장되면 코드 실수가 있어도 데이터가 보호됩니다.
두 방법을 모두 적용하는 것이 가장 안전합니다.
