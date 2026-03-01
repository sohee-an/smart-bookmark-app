# TypeScript Utility Types

> 프로젝트에서 직접 마주친 문제를 해결하면서 정리한 Utility Types 가이드

---

## Utility Types가 뭔가

TypeScript가 기본으로 제공하는 **타입 변환 도구**예요.
기존 타입을 변형해서 새 타입을 만들어요.

---

## 자주 쓰는 것들

### Partial — 모든 필드를 옵셔널로

```ts
interface Bookmark {
  id: string;
  title: string;
  summary: string;
}

type PartialBookmark = Partial<Bookmark>;
// 결과: { id?: string, title?: string, summary?: string }
```

### Omit — 특정 필드 제거

```ts
type LocalBookmark = Omit<Bookmark, "userId" | "tempUserId">;
// userId, tempUserId가 빠진 Bookmark
```

### Pick — 특정 필드만 선택

```ts
type BookmarkId = Pick<Bookmark, "id">;
// 결과: { id: string }
```

### Required — 모든 필드를 필수로

```ts
type RequiredBookmark = Required<Bookmark>;
// 모든 옵셔널이 필수로 바뀜
```

---

## 실제 문제 상황 — update 타입 설계

### 문제

북마크 update 메서드를 만들 때 data 타입을 뭘로 해야 하는지 고민이 생겼어요.

AI 처리 결과로 `title`, `summary`, `tags`, `aiStatus` 만 업데이트하면 되는데,
**어떤 필드를 받을지**, **전부 다 보내야 하는지 일부만 보내도 되는지** 결정해야 했어요.

---

### Partial만 쓰면 — 범위가 너무 넓음

```ts
type UpdateBookmarkData = Partial<Bookmark>;

// 바꾸면 안 되는 것들도 통과돼요
repository.update(id, { url: "해킹된url" }); // ✅ 타입 에러 없음
repository.update(id, { id: "다른id" }); // ✅ 타입 에러 없음
repository.update(id, { createdAt: "조작" }); // ✅ 타입 에러 없음
```

### Pick만 쓰면 — 일부만 보낼 수 없음

```ts
type UpdateBookmarkData = Pick<Bookmark, "title" | "summary" | "tags" | "aiStatus">;

// 전부 다 보내야만 통과돼요
repository.update(id, { title: "제목" }); // ❌ summary, tags, aiStatus 빠짐
```

---

### 해결 — Partial + Pick 같이 쓰기

```ts
type UpdateBookmarkData = Partial<Pick<Bookmark, "title" | "summary" | "tags" | "aiStatus">>;
```

```ts
// 범위 밖은 못 보냄
repository.update(id, { url: "해킹" }); // ❌ 타입 에러
repository.update(id, { id: "조작" }); // ❌ 타입 에러

// 범위 안에서 일부만 보낼 수 있음
repository.update(id, { title: "제목" }); // ✅
repository.update(id, { title: "제목", summary: "요약" }); // ✅
repository.update(id, {
  title: "제목",
  summary: "요약",
  tags: ["react"],
  aiStatus: "completed",
}); // ✅
```

---

## 한 줄 기준

```
Pick    → 울타리를 친다 (이 범위 밖은 못 바꿈)
Partial → 울타리 안에서 자유롭게 (일부만 보내도 됨)
Omit    → 특정 필드만 빼고 싶을 때
Required → 전부 필수로 강제할 때
```

---

## 언제 쓰냐

```
update 메서드         → Partial<Pick<T, '바꿀 수 있는 필드들'>>
비회원 전용 타입      → Omit<Bookmark, 'userId'>
AI 처리 결과 타입     → Pick<Bookmark, 'title' | 'summary' | 'tags'>
전부 입력 강제할 때   → Required<T>
```
