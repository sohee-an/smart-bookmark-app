# Repository 패턴

DB 접근 코드를 한 곳에 모아두는 패턴.

> "함께 바뀌는 코드는 함께 있어야 한다"

## 왜 필요한가

- UI → Supabase 직접 알면 안 됨
- UI → 뒤가 뭔지 몰라야 함
- 뒤가 바뀌어도 앞이 안 바뀌어야 함

## 구조

```
UI
 ↓
BookmarkRepository (인터페이스 - 약속)
 ↓                         ↓
LocalRepository      SupabaseRepository
(localStorage)         (Supabase)
```

## BookmarkRepository 인터페이스

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

## 왜 Promise로 통일하나

| 구현체   | 특성                                      |
| -------- | ----------------------------------------- |
| Local    | 동기지만 `Promise.resolve`로 감쌀 수 있음 |
| Supabase | 원래 비동기                               |

- 비동기를 동기로 만드는 건 **불가능**
- 동기를 비동기로 맞추는 건 **가능**
- → **Promise로 통일**

---

# Factory 패턴

조건에 따라 어떤 구현체를 줄지 결정하는 패턴.
`bookmark.service.ts`가 이 역할을 한다.

이렇게 빼지 않으면 이런식으로 모든 곳에서 전부다 고쳐야된다

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

# 의존성 주입 (Dependency Injection)

생성될 때 외부에서 필요한 값을 주입받는 패턴.

## 파라미터 주입 vs 생성자 주입

| 기준                             | 방식            |
| -------------------------------- | --------------- |
| 매번 바뀌는 값 (필터, 검색 조건) | 파라미터로 받기 |
| 생성 시 정해지는 값 (userId)     | 생성자로 받기   |

## SupabaseRepository 예시

```ts
class SupabaseRepository implements BookmarkRepository {
  constructor(private userId: string) {}
  // userId는 생성될 때 한 번만 주입받고 안 바뀜

  count(): Promise<number> {
    // this.userId 알아서 사용
  }
}
```

## 생성자가 별로인 경우

> 생성자 파라미터가 너무 많으면 **"이 클래스가 너무 많은 걸 알고 있다"** 는 신호.
> 설계를 다시 나눠야 함.
