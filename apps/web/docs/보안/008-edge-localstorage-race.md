# 008 · localStorage 레이스 컨디션 (멀티탭)

## 심각도

Low

## 위치

- `apps/web/src/entities/bookmark/api/local.repository.ts` — `save()` 메서드

## 문제

비회원 5개 제한 체크가 read-modify-write 패턴으로 구현되어 있고, 멀티탭 환경에서 원자적이지 않습니다.

```ts
async save(request): Promise<Bookmark> {
  const currentRows = this.getRows();       // 탭A: 4개 읽음
                                            // 탭B: 동시에 4개 읽음
  if (currentRows.length >= 5) throw ...   // 둘 다 통과
  // 탭A 저장 → 5개
  // 탭B 저장 → 6개 (제한 초과)
}
```

같은 브라우저에서 두 탭을 동시에 사용하는 경우 5개 제한을 초과해 6개 이상 저장될 수 있습니다.

## 수정 방향

`storage` 이벤트로 다른 탭의 변경을 감지하거나, `BroadcastChannel`로 동기화합니다.

```ts
// 간단한 대안: 저장 직전 storage에서 다시 읽어 검증
async save(request): Promise<Bookmark> {
  // 항상 최신 상태로 재확인 (현재도 이렇게 되어 있지만 JS는 단일 스레드라
  // 동기 흐름 내에서는 문제없음. 다만 비동기 작업 사이 다른 탭이 끼어들 수 있음)
  const currentRows = this.getRows();
  if (currentRows.length >= 5) throw new Error("...");
  // ...
}
```

실제로 비회원이 같은 브라우저에서 두 탭을 동시에 사용하는 경우가 드물고 영향이 낮아 우선순위는 낮습니다.
포트폴리오 수준에서는 허용 가능한 트레이드오프입니다.
