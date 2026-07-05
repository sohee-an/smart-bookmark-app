# TypeScript 타입 설계 결정

> Repository 패턴에서 마주친 두 가지 타입 설계 결정 — update 타입으로 "변경 가능 범위"를 제한하고, save 요청 타입을 공통화한 이유.

---

## 결정 1 — update 타입: 변경 가능 범위를 타입으로 제한

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

## 결정 2 — save 요청 타입: 공통 타입 vs 분리

> Repository 인터페이스의 `save` 메서드 파라미터를 어떻게 설계할 것인가

`BookmarkRepository` 인터페이스의 `save` 메서드 파라미터 타입을 결정해야 했어요.

비회원(Local)과 회원(Supabase)이 필요한 정보가 달랐어요.

```ts
// 비회원은 guestId가 필요
{
  (url, userMemo, guestId);
}

// 회원은 userId가 필요
{
  (url, userMemo, userId);
}
```

---

## 시도 1 — 각각 따로 만들기

```ts
interface LocalCreateBookmarkRequest {
  url: string;
  userMemo?: string;
  guestId: string; // 필수
}

interface SupabaseCreateBookmarkRequest {
  url: string;
  userMemo?: string;
  userId: string; // 필수
}
```

**문제점**

```ts
// 인터페이스에서 save 타입을 뭘로 해야 해?
interface BookmarkRepository {
  save(request: ???): Promise<Bookmark>; // 타입이 달라서 묶을 수 없음
}
```

인터페이스를 하나로 유지할 수 없게 됨.

---

## 시도 2 — Union Type

```ts
interface BookmarkRepository {
  save(request: LocalCreateBookmarkRequest | SupabaseCreateBookmarkRequest): Promise<Bookmark>;
}
```

**문제점**

```ts
// 쓰는 쪽에서 매번 타입 가드 필요
if ("guestId" in request) {
  // Local
} else {
  // Supabase
}
```

인터페이스가 복잡해짐.

---

## 최종 결정 — 공통 타입 하나로

```ts
interface CreateBookmarkRequest {
  url: string;
  userMemo?: string;
  guestId?: string; // 비회원일 때
  userId?: string; // 회원일 때
}
```

구현체 안에서 필요한 것만 꺼내 씀.

```ts
// LocalRepository
async save(request: CreateBookmarkRequest): Promise<Bookmark> {
  const guestId = request.guestId  // 필요한 것만 꺼냄
}

// SupabaseRepository
async save(request: CreateBookmarkRequest): Promise<Bookmark> {
  const userId = request.userId  // 필요한 것만 꺼냄
}
```

---

## 트레이드오프

```
공통 타입 하나
  장점: 인터페이스 단순, 관리 편함
  단점: guestId, userId 둘 다 옵셔널이라
        컴파일 때 "둘 다 없는 경우" 못 잡음

각각 따로
  장점: 타입 안전성 높음
  단점: 인터페이스 복잡, 관리 어려움
```

---

## 판단 기준

```
"인터페이스 일관성" vs "타입 안전성"

지금 프로젝트에서는
→ 인터페이스 일관성을 선택
→ 구현체 안에서 유효성 검사로 보완
```

```ts
// LocalRepository에서 방어 코드
async save(request: CreateBookmarkRequest): Promise<Bookmark> {
  if (!request.guestId) throw new Error('guestId가 필요합니다')
  // ...
}
```
