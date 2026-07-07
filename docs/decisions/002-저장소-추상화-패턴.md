# 저장소 추상화 — Repository · Factory · DI

> 비회원(localStorage)과 회원(Supabase) 두 저장소를 **UI 변경 없이 교체**하기 위해 선택한 패턴 3종과 근거.

---

## Repository 패턴 — UI가 저장소를 모르게

DB 접근 코드를 한 곳에 모으고, UI는 인터페이스만 알게 한다. 뒤(저장소)가 바뀌어도 앞(UI)이 안 바뀌게 하려는 것.

- UI가 Supabase를 직접 알면 안 됨 → 저장소 교체 시 UI까지 수정해야 함
- 뒤가 바뀌어도 앞은 그대로 (localStorage → Supabase 전환에도 호출부 불변)

### 구조

```
UI
 ↓
BookmarkRepository (인터페이스 - 약속)
 ↓                         ↓
LocalRepository      SupabaseRepository
(localStorage)         (Supabase)
```

### BookmarkRepository 인터페이스

```ts
interface BookmarkRepository {
  save(request: CreateBookmarkRequest): Promise<Bookmark>;
  findAll(filter?: BookmarkFilter): Promise<Bookmark[]>;
  findById(id: string): Promise<Bookmark | null>;
  delete(id: string): Promise<void>;
  removeAll(): Promise<void>;
  count(): Promise<number>;
}
```

- 트레이드오프

1. 복잡도 가 올라간다. 작은 프로젝트에서는 오버엔지니어링일 수 있다.
2. 새로운 팀원이 헷갈려한다
3. 디버깅이 좀 어려워진다.

### 왜 Promise로 통일하나 (동기 Local + 비동기 Supabase)

| 구현체   | 특성                                      |
| -------- | ----------------------------------------- |
| Local    | 동기지만 `Promise.resolve`로 감쌀 수 있음 |
| Supabase | 원래 비동기                               |

- 비동기를 동기로 만드는 건 **불가능**
- 동기를 비동기로 맞추는 건 **가능**
- → **Promise로 통일**

---

## Factory 패턴 — 구현체 선택을 한 곳에서

세션 유무로 어떤 구현체를 줄지 `bookmark.service.ts`가 결정한다. 이렇게 빼지 않으면 아래처럼 모든 호출부에서 분기를 반복해야 한다.

```ts
// 컴포넌트 안에서
if (isLoggedIn) {
  const repo = new SupabaseRepository(userId);
  repo.findAll();
} else {
  const repo = new LocalRepository();
  repo.findAll();
}
```

이렇게 하게 되면 판단은 Factory가 하고, 컴포넌트는 몰라도 된다.

```ts
class BookmarkService {
  static getRepository(): BookmarkRepository {
    if (isLoggedIn) {
      const userId = getCurrentUserId();
      return new SupabaseRepository(userId);
    }
    return new LocalRepository();
  }
}
```

---

## 의존성 주입 (DI) — 생성 시점에 필요한 값 주입

### 파라미터 주입 vs 생성자 주입

| 기준                             | 방식            |
| -------------------------------- | --------------- |
| 매번 바뀌는 값 (필터, 검색 조건) | 파라미터로 받기 |
| 생성 시 정해지는 값 (userId)     | 생성자로 받기   |

### SupabaseRepository 예시

```ts
class SupabaseRepository implements BookmarkRepository {
  constructor(private userId: string) {}
  // userId는 생성될 때 한 번만 주입받고 안 바뀜

  count(): Promise<number> {
    // this.userId 알아서 사용
  }
}
```

### 생성자가 별로인 경우

> 생성자 파라미터가 너무 많으면 **"이 클래스가 너무 많은 걸 알고 있다"** 는 신호.
> 설계를 다시 나눠야 함.
