# dev 브랜치 PR 게이트 우회 차단 — required check가 admin 직접 push엔 안 통했다

> "Bypassed rule violations" 한 줄에서 시작해, required status check가 **직접 push 경로에선
> 게이트로 작동하지 않는다**는 걸 규명하고 `enforce_admins` + PR 전용 흐름으로 닫은 기록.
> 겸사겸사 그 흐름의 마찰을 `git ship`으로 자동화했다.

---

## 증상

`dev`에 직접 push했더니 remote가 이런 메시지를 뱉었다 — 그런데 **push는 성공**했다.

```
remote: Bypassed rule violations for refs/heads/dev:
remote: - 3 of 3 required status checks are expected.
```

`dev`엔 branch protection의 required status check 3개(`Lint & Typecheck`,
`Unit & Integration Tests`, `Build`)가 걸려 있었다. "전부 통과해야 머지된다"고
믿고 있었는데, 규칙을 **우회**했다는 메시지와 함께 코드가 그냥 올라간 것이다.

## 추적 — 왜 게이트가 뚫렸나

1. **CI는 실제로 돌았고 통과했다.** 해당 커밋의 check-runs를 조회하니 3개 required check가
   모두 `success`. E2E는 `base_ref != main`이라 정상 skip. 즉 "테스트가 안 돈" 문제가 아니다.
2. **문제는 순서였다.** required status check는 **머지를 게이팅**하는 규칙이지, push를
   막는 규칙이 아니다. 직접 push는 이렇게 흐른다:

   ```
   push 순간 → 그 커밋엔 아직 체크 결과가 없음(pending)
            → 규칙상 "required check 미충족" = 위반
            → 하지만 enforce_admins:false → 관리자라 bypass 허용
            → push 통과 (코드는 이미 dev에 올라감)
   push 후   → CI 실행 → 통과하든 실패하든 이미 늦음
   ```

3. **핵심**: required check는 "push 전에 체크가 통과돼 있어야" 하는데, 직접 push는 정의상
   push 순간에 체크가 존재할 수 없다. 그래서 **가장 자주 쓰는 경로(dev 직접 push)에서는
   게이트가 항상 우회**되고 있었다. 만약 CI가 실패했다면 깨진 커밋이 dev에 남았을 것이다.

> 설정은 게이트(required check)인데 실사용은 우회(admin 직접 push)라, 둘이 어긋나 있었다.
> "테스트가 있다"와 "통과 못 하면 막힌다"는 다르다 — 후자를 보장하지 못하고 있었다.

## 결정 — dev를 PR 전용으로 닫는다 (Design A)

두 가지 운영 모델이 있었다:

|                       | A. PR 전용              | B. 직접 push 유지      |
| --------------------- | ----------------------- | ---------------------- |
| dev 진입              | PR로만 (직접 push 차단) | 직접 push 허용         |
| required check        | **실제 게이트로 작동**  | 게이트 아님(사후 신호) |
| "깨진 코드 못 들어옴" | 사실로 말할 수 있음     | 말할 수 없음           |
| 혼자 개발 마찰        | 매번 브랜치+PR          | 없음                   |

포트폴리오에서 "실무형 CI 게이트"를 **거짓 없이** 주장하려면 A여야 한다. B는 required check
표기가 장식이 되어 면접에서 정확히 이 지점(우회 가능성)을 찔린다.

## 수정

**1. `enforce_admins: true`** — 이게 핵심. 관리자(=본인)도 규칙에서 예외가 아니게 되어
직접 push가 실제로 거부된다. required check + enforce_admins = push 순간 체크가 없으니
**직접 push는 항상 거부** → PR로만 진입.

```jsonc
// PUT /repos/{owner}/{repo}/branches/dev/protection
{
  "required_status_checks": {
    "strict": true, // base 최신 상태로 테스트된 것만 머지
    "contexts": ["Lint & Typecheck", "Unit & Integration Tests", "Build"],
  },
  "enforce_admins": true, // 관리자도 직접 push 불가
  "required_pull_request_reviews": null, // 리뷰 필수 X (혼자라 자기 PR 승인 불가 → 머지 막힘 방지)
  "restrictions": null,
}
```

- `required_pull_request_reviews`를 켜지 않은 이유: 1인 개발이라 리뷰어를 요구하면 본인
  PR을 승인할 수 없어 머지가 영영 막힌다. 게이트의 목적(깨진 코드 차단)은 CI 통과 필수만으로
  달성되므로 리뷰 필수는 뺐다.

**2. CI 트리거를 PR 전용으로** — 직접 push가 없어졌으니 `on.push[dev]`는 (머지 커밋 재실행
용) 중복이라 제거. `strict:true`가 이미 "base 최신 병합 프리뷰"를 검증하므로 머지 후
재실행이 불필요하다. `concurrency`로 같은 ref의 옛 run은 취소.

```yaml
on:
  pull_request:
    branches: [main, dev]

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

## 마찰 제거 — `git ship`

A의 유일한 단점은 "혼자인데 매번 브랜치+PR"의 번거로움이다. 그 왕복을 한 줄로 감쌌다
([`scripts/ship.sh`](../../scripts/ship.sh)).

```
git ship "메시지"
  → feature 브랜치 생성(현재 dev/main이면) → 커밋 → push → PR 생성
  → required check 통과 대기 → squash 머지 → 브랜치 삭제 → base 동기화
  (CI 실패 시 머지하지 않고 중단)
```

게이트를 *우회*하는 게 아니라 게이트를 *지키는 왕복*을 자동화한 것이다. 이 문서를 포함해
관련 커밋(#107~#110, 031)이 전부 이 게이트를 통과해 dev에 들어갔다.

## 부수 발견 — 브랜치명 멀티바이트 깨짐

`git ship` 첫 실행에서 브랜치명이 `ship/...스크립트-ì¶-...`처럼 깨졌다. 슬러그를
`cut -c1-40`으로 자를 때 한글(UTF-8 3바이트)이 바이트 중간에서 잘린 것. 슬러그를
ASCII 전용(`[^a-z0-9]` 제거)으로 바꾸고, 전부 한글이면 `change`로 폴백하게 했다.
브랜치는 머지 후 삭제되므로 기능상 무해했지만, 조용한 깨짐을 방치하지 않았다.

## 교훈

1. **required status check는 머지 게이트지 push 게이트가 아니다.** 직접 push를 허용하면
   가장 자주 쓰는 경로에서 게이트가 통째로 우회된다.
2. **`enforce_admins`가 진짜 스위치다.** 이게 false면 규칙은 "권장사항"이고, 관리자
   1인 레포에선 사실상 무방비다.
3. **"Bypassed" 같은 경고 한 줄을 넘기지 말 것.** 성공 로그에 섞인 우회 메시지가
   설정과 실사용의 드리프트를 드러내는 유일한 신호였다. ([028](./028-RLS-스키마-드리프트-추적.md)의
   "설정 파일 ≠ 실제 상태"와 같은 냄새 — 여기선 "보호규칙 설정 ≠ 실제 강제".)
4. **게이트를 강화하면 마찰이 는다 — 마찰은 자동화로 없애되, 게이트는 우회하지 않는다.**
   `git ship`은 CI 실패 시 머지를 거부한다.
