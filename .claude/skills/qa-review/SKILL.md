---
description: 웹 제품 완성도를 QA 관점으로 분석한다. 기능 단위 또는 전체 UI를 백그라운드 에이전트에서 검토한다.
allowed-tools: Agent
---

## 사용법

```
/qa-review [기능명]   → 해당 기능 관련 파일만 집중 분석
/qa-review full       → 전체 UI 컴포넌트 전수 분석
```

---

## 모드 1 — 기능 단위 QA (기본)

사용자가 기능명 또는 파일명을 지정한 경우.

**실행 전 반드시:**

1. `PROJECT_INDEX.md`를 읽고 해당 기능과 관련된 파일 목록을 파악
2. 파악한 파일 목록을 prompt에 명시

```
Agent 호출:
  subagent_type: general-purpose
  run_in_background: true
  description: "기능 단위 QA 리뷰"
  prompt: |
    다음 기능에 대해 QA 리뷰를 수행해줘: [기능명]

    분석 대상 파일 (PROJECT_INDEX.md 기준):
    - [관련 파일 1]
    - [관련 파일 2]
    - [관련 파일 N]

    각 파일을 직접 읽고, .claude/agents/qa-reviewer.md 의 체크리스트를 기준으로 아래 항목을 스스로 감지해줘:

    1. 로딩 중 빈 상태(empty state)가 먼저 노출되는지
    2. skeleton/placeholder 없이 데이터가 갑자기 뜨는지 (CLS)
    3. 버튼 클릭 후 로딩 피드백 없는지
    4. 에러 상태 처리 누락 여부
    5. 빈 배열/null/undefined 엣지 케이스 처리 여부
    6. 터치 타겟 크기, 접근성(aria, alt) 누락 여부
    7. 애니메이션/트랜지션 어색함

    .claude/agents/qa-reviewer.md 의 출력 형식(Critical / High / Medium)으로 리포트해줘.
```

---

## 모드 2 — 전체 UI QA (`full`)

사용자가 `full`을 입력한 경우.

```
Agent 호출:
  subagent_type: general-purpose
  run_in_background: true
  description: "전체 UI QA 리뷰"
  prompt: |
    전체 UI 컴포넌트에 대해 QA 리뷰를 수행해줘.

    아래 파일들을 순서대로 직접 읽고 분석해줘:
    1. apps/web/src/components/layout/Header.tsx
    2. apps/web/src/app/_home-content.tsx
    3. apps/web/src/widgets/bookmark/RecentBookmarkSlider.tsx
    4. apps/web/src/entities/bookmark/ui/BookmarkCard.tsx
    5. apps/web/src/entities/bookmark/ui/BookmarkDetailPanel.tsx
    6. apps/web/src/features/bookmark/ui/AddBookmarkOverlay.tsx
    7. apps/web/src/features/bookmark/ui/BookmarkList.tsx
    8. apps/web/src/app/bookmarks/BookmarksContent.tsx

    각 파일을 직접 읽고, .claude/agents/qa-reviewer.md 의 체크리스트를 기준으로 아래 항목을 스스로 감지해줘:

    1. 로딩 중 빈 상태(empty state)가 먼저 노출되는지
    2. skeleton/placeholder 없이 데이터가 갑자기 뜨는지 (CLS)
    3. 버튼 클릭 후 로딩 피드백 없는지
    4. 에러 상태 처리 누락 여부
    5. 빈 배열/null/undefined 엣지 케이스 처리 여부
    6. 터치 타겟 크기, 접근성(aria, alt) 누락 여부
    7. 애니메이션/트랜지션 어색함
    8. 반응형 레이아웃 깨짐 가능성
    9. 모달/오버레이 포커스 관리, ESC 닫기, body scroll lock

    .claude/agents/qa-reviewer.md 의 출력 형식(Critical / High / Medium)으로 파일별 리포트해줘.
```

---

## 안내 메시지

에이전트 호출 후 사용자에게:

- 기능 단위: "**[기능명]** QA 분석을 백그라운드에서 시작했습니다. 코드 분석 → Playwright 테스트 생성 → 실행까지 자동으로 진행됩니다. 완료되면 알려드릴게요."
- full: "전체 UI QA 분석을 백그라운드에서 시작했습니다. 코드 분석 → Playwright 테스트 생성 → 실행까지 자동으로 진행됩니다. 파일이 많아 시간이 걸릴 수 있어요. 완료되면 알려드릴게요."

## 결과 저장

분석 완료 후 결과를 반드시 아래 경로에 저장한다:
`.claude/project/reviews/qa-review-YYYY-MM-DD.md`
