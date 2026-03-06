---
description: 현재 수정한 파일 기준으로 vitest 테스트 파일 자동 생성 또는 업데이트
allowed-tools: Read, Write, Edit, Glob, Bash(git diff:*, git status:*)
---

아래 단계를 순서대로 실행해서 테스트 파일을 생성하거나 업데이트해주세요.

## 1단계 — 대상 파일 파악

병렬로 실행:

- `git diff --name-only HEAD` — 현재 수정된 파일 목록
- `git status` — 전체 변경사항 확인

테스트 대상에서 제외할 파일:

- `*.test.ts` — 테스트 파일 자체
- `*.d.ts` — 타입 선언 파일
- `*/ui/**` — UI 컴포넌트 (스냅샷 테스트는 별도)
- `*.config.ts`, `*.config.js` — 설정 파일
- `middleware.ts` — 미들웨어

## 2단계 — 테스트 파일 존재 여부 확인

각 대상 파일에 대해 같은 폴더에 `.test.ts` 파일이 있는지 확인.

```
# 예시
apps/web/src/features/bookmark/bookmarkService.ts
→ apps/web/src/features/bookmark/bookmarkService.test.ts 존재 여부 확인
```

- **없으면** → 새로 생성
- **있으면** → 변경사항에 맞게 업데이트

## 3단계 — 테스트 파일 작성 규칙

### 기본 구조

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { 테스트할것 } from "./파일명";

describe("모듈명", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("함수명", () => {
    it("정상 케이스 설명", () => {
      // given
      // when
      // then
    });

    it("예외 케이스 설명", () => {
      // given
      // when
      // then
    });
  });
});
```

### FSD 레이어별 테스트 우선순위

| 레이어        | 테스트 우선순위 | 주요 테스트 대상         |
| ------------- | --------------- | ------------------------ |
| `entities/`   | 높음            | 도메인 로직, 유효성 검사 |
| `features/`   | 높음            | 비즈니스 로직, API 호출  |
| `shared/lib/` | 높음            | 유틸 함수, 헬퍼          |
| `shared/api/` | 중간            | API 클라이언트           |
| `widgets/`    | 낮음            | 통합 동작                |
| `pages/`      | 낮음            | 라우팅 수준              |

### 테스트 케이스 작성 기준

1. **정상 케이스** — 기대한 대로 동작하는지
2. **경계값 케이스** — 빈 배열, null, undefined, 최대/최소값
3. **예외 케이스** — 에러가 올바르게 던져지는지
4. **비회원/회원 분기** — storage가 localStorage/Supabase로 나뉘는 경우 반드시 둘 다 테스트

### Mocking 규칙

```typescript
// Supabase mock
vi.mock("@/shared/api/supabase", () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
  },
}));

// localStorage mock
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
vi.stubGlobal("localStorage", localStorageMock);
```

## 4단계 — 생성 전 확인

생성할 테스트 파일 목록과 각 파일의 테스트 케이스 목록을 먼저 보여주고 승인을 받은 뒤 파일을 생성해주세요.

## 주의사항

- 테스트 설명은 한국어로 작성
- `it('should ...')` 형식 금지, 한국어로 동작 설명
- 구현 세부사항이 아닌 동작(behavior) 기준으로 테스트 작성
- 한 `it` 블록에 하나의 동작만 테스트

$ARGUMENTS
