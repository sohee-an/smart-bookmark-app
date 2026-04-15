# AI 하네스 · 서브에이전트 · 오케스트레이션 생산성 가이드

> 작성일: 2026-04-05
> "AI를 쓰는 것"에서 "AI 시스템을 설계하는 것"으로

---

## 전체 계층 구조

```
Claude (LLM 두뇌)
  └─ Claude Code (CLI 하네스 — 도구 실행, 파일 접근, 컨텍스트 관리)
       ├─ Hooks          → 이벤트 발생 시 자동 실행
       ├─ Sub-agents     → 독립 작업 병렬/위임 실행
       ├─ MCP Servers    → 외부 도구 연결 (Notion, DB, API 등)
       └─ Skills         → 재사용 가능한 프롬프트 패키지
```

이 계층을 이해하면, 단순히 "AI한테 물어보는 것"이 아니라
**AI가 스스로 도구를 선택하고 실행하는 시스템**을 설계할 수 있다.

---

## 1. Hooks — 이벤트 기반 자동화

### 개념

특정 이벤트가 발생하면 자동으로 셸 커맨드를 실행하는 트리거다.
"AI가 파일을 수정했을 때", "응답하기 전에", "세션이 끝날 때" 같은 시점을 잡을 수 있다.

### Hook 종류

| Hook               | 실행 시점               | 활용 예시                           |
| ------------------ | ----------------------- | ----------------------------------- |
| `PreToolUse`       | AI가 도구 실행 직전     | 위험한 명령어 차단, 로깅            |
| `PostToolUse`      | AI가 도구 실행 직후     | 파일 수정 후 자동 lint, 테스트 실행 |
| `Notification`     | AI가 알림 보낼 때       | 슬랙/데스크탑 알림                  |
| `Stop`             | AI 응답 완료 후         | 작업 완료 후 자동 커밋, 요약 저장   |
| `UserPromptSubmit` | 사용자가 메시지 보낼 때 | 컨텍스트 자동 주입                  |

### 실제 활용 아이디어

```jsonc
// .claude/settings.json
{
  "hooks": {
    "PostToolUse": [
      {
        // 파일 수정될 때마다 자동으로 타입 체크
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "pnpm tsc --noEmit 2>&1 | head -20",
          },
        ],
      },
    ],
    "Stop": [
      {
        // 세션 종료 시 변경된 파일 목록 자동 기록
        "hooks": [
          {
            "type": "command",
            "command": "git diff --name-only >> .claude/session-log.txt",
          },
        ],
      },
    ],
  },
}
```

### 공부 방법

1. 현재 반복하는 수동 작업 목록 적기
2. "이게 어떤 이벤트 직후에 실행돼야 하나?" 매핑
3. 셸 커맨드로 표현 가능한지 확인
4. 하나씩 hooks에 추가 → 동작 확인

---

## 2. Sub-agents — 병렬 위임 실행

### 개념

메인 Claude가 독립적인 작업을 다른 Claude 인스턴스에게 위임한다.
각 서브에이전트는 자신만의 컨텍스트를 가지고 독립적으로 실행된다.

### 언제 쓰나

```
하나의 에이전트가 순서대로 처리 (느림):
A 작업 → B 작업 → C 작업

서브에이전트로 병렬 처리 (빠름):
메인 에이전트
  ├─ 서브A (코드 리뷰)  ┐
  ├─ 서브B (보안 검토)  ├─ 동시 실행
  └─ 서브C (UX 리뷰)   ┘
```

### 이 프로젝트에서 이미 쓰고 있는 것

```
/code-review  → 백그라운드 서브에이전트가 코드 분석
/security-review → 별도 에이전트가 보안 취약점 분석
/qa-review    → QA 에이전트가 UX 검토
```

이것들이 `run_in_background: true`로 실행되는 서브에이전트다.

### 서브에이전트 설계 원칙

**좋은 위임 조건:**

- 독립적으로 실행 가능한가 (다른 작업 결과에 의존하지 않는가)
- 컨텍스트 윈도우를 많이 차지하는가 (메인 컨텍스트를 보호해야 하는가)
- 전문성이 필요한가 (특화된 역할을 줄 수 있는가)

**나쁜 위임 조건:**

- 메인 에이전트의 결과가 필요한 작업
- 너무 단순해서 오버헤드가 더 큰 작업

### 커스텀 서브에이전트 만드는 법

```markdown
## <!-- .claude/agents/performance-reviewer.md -->

name: performance-reviewer
description: React 컴포넌트 성능 이슈 감지. 불필요한 리렌더링, 메모이제이션 누락 검토 시 호출
tools: Read, Grep, Glob

---

당신은 React 성능 최적화 전문가입니다.
주어진 컴포넌트에서 다음을 검토하세요:

1. 불필요한 리렌더링 원인
2. useMemo/useCallback 적용 대상
3. 상태 구조 개선 포인트

발견한 이슈를 심각도(Critical/High/Medium)로 분류해서 보고하세요.
```

---

## 3. MCP (Model Context Protocol) — 외부 도구 연결

### 개념

AI가 외부 서비스를 직접 읽고 쓸 수 있게 해주는 표준 프로토콜이다.
이 프로젝트에서 Notion MCP를 이미 쓰고 있다.

```
AI ←─ MCP ─→ Notion (읽기/쓰기)
AI ←─ MCP ─→ GitHub (PR, Issue)
AI ←─ MCP ─→ Slack (메시지 전송)
AI ←─ MCP ─→ DB (직접 쿼리)
AI ←─ MCP ─→ 내부 API (커스텀 도구)
```

### MCP가 강력한 이유

훅이나 셸 커맨드는 "실행하고 텍스트 받기"지만,
MCP는 **AI가 외부 상태를 읽고 → 판단하고 → 다시 쓰는 루프**가 가능하다.

현재 프로젝트 워크플로우:

```
Notion 상태 읽기 (MCP)
  → 검수=true 감지 (AI 판단)
  → 코드 구현 (도구 실행)
  → Notion 상태 업데이트 (MCP)
  → 댓글 작성 (MCP)
```

이게 MCP의 핵심 패턴이다.

### 직접 MCP 서버 만들기

MCP 서버는 TypeScript로 만들 수 있다.

```typescript
// 예시: 사내 배포 시스템 MCP 서버
import { McpServer } from "@modelcontextprotocol/sdk/server";

const server = new McpServer({ name: "deploy-server" });

server.tool("get_deploy_status", "현재 배포 상태 조회", {}, async () => {
  const status = await fetchDeployStatus();
  return { content: [{ type: "text", text: JSON.stringify(status) }] };
});

server.tool(
  "trigger_deploy",
  "배포 트리거",
  {
    environment: { type: "string", enum: ["staging", "production"] },
  },
  async ({ environment }) => {
    await triggerDeploy(environment);
    return { content: [{ type: "text", text: `${environment} 배포 시작됨` }] };
  }
);
```

이걸 만들면 AI가 배포 상태를 읽고 → 판단하고 → 배포를 직접 실행할 수 있다.

### 공부 순서

```
1. 기존 MCP 서버 써보기 (Notion, GitHub, Filesystem)
2. MCP 프로토콜 스펙 읽기
3. 작은 커스텀 MCP 서버 만들기 (로컬 JSON 파일 읽는 것부터)
4. 사내 내부 도구를 MCP로 감싸기
```

---

## 4. Skills — 재사용 프롬프트 패키지

### 개념

자주 쓰는 복잡한 프롬프트를 패키지화해서 `/명령어`로 바로 실행하는 것이다.

```
/code-review   → 미리 정의된 리뷰 기준으로 코드 분석
/commit        → 변경사항 분석 후 커밋 메시지 자동 생성
/new-task      → Notion에 태스크 분해하고 등록
```

### 좋은 Skill의 조건

- 반복해서 쓰는 작업인가
- 매번 프롬프트를 새로 쓰기 귀찮은가
- 기준이 명확하게 문서화될 수 있는가

### 커스텀 Skill 만들기

```markdown
<!-- .claude/skills/pr-description/SKILL.md -->

현재 브랜치의 변경사항을 분석해서 PR 설명을 작성해줘.

형식:

## 변경 요약

- (변경사항 핵심 3줄)

## 왜 이렇게 했는가

- (설계 결정 이유)

## 테스트 방법

- (검증 단계)

## 스크린샷

(UI 변경이 있으면 표시)
```

---

## 5. 전체를 연결하는 패턴 — 오케스트레이션

### 패턴 1: 이벤트 → 자동 분석

```
파일 저장 (Hook: PostToolUse)
  → lint 자동 실행
  → 에러 있으면 AI가 자동 수정 제안
```

### 패턴 2: 상태 감지 → 자동 실행

```
Notion 상태 변경 (MCP 폴링)
  → 검수=true 감지
  → 서브에이전트에게 구현 위임
  → 완료 시 상태 업데이트 (MCP)
```

### 패턴 3: 병렬 검토 → 통합 리포트

```
PR 생성
  ├─ 서브에이전트A: 코드 품질 리뷰
  ├─ 서브에이전트B: 보안 취약점 검토
  └─ 서브에이전트C: 성능 이슈 감지
          ↓
  메인 에이전트: 결과 통합 → PR 댓글 작성
```

### 패턴 4: Human-in-the-loop

```
AI 분석 → 결과 제안 → 사람 승인 → AI 실행
                           ↑
              이 부분이 핵심 — 어디서 사람이 개입할지 설계
```

---

## 6. 공부 로드맵

### 1단계 — 현재 도구 깊게 쓰기 (지금 당장)

이미 쓰고 있는 것들을 더 의도적으로 활용:

- CLAUDE.md Rules를 더 정교하게 만들기
- Notion MCP 워크플로우 실패 케이스 정리
- 자주 쓰는 프롬프트 → Skill로 패키지화

### 2단계 — Hooks 실험 (1~2주)

```
목표: 파일 수정 후 자동으로 타입 체크 + lint 실행
방법: PostToolUse Hook 설정
확인: AI가 코드 수정할 때마다 자동으로 검사됨
```

### 3단계 — 커스텀 서브에이전트 만들기 (2~4주)

```
목표: 특화된 코드 리뷰어 에이전트 직접 설계
방법: .claude/agents/ 에 역할 정의 파일 작성
확인: 메인 에이전트가 리뷰 시 커스텀 에이전트 호출
```

### 4단계 — MCP 서버 직접 만들기 (1~2개월)

```
목표: 자주 보는 사내 API를 MCP로 감싸기
방법: @modelcontextprotocol/sdk 로 TypeScript 서버 작성
확인: AI가 사내 API를 직접 조회하고 분석
```

### 5단계 — 오케스트레이션 설계 (3개월+)

```
목표: 특정 이벤트 발생 시 전체 파이프라인 자동 실행
방법: Hook + Sub-agent + MCP 조합
확인: 사람 개입 없이 분석 → 보고 → 상태 업데이트 완료
```

---

## 7. 지금 이 프로젝트에서 바로 해볼 수 있는 것

### 즉시 적용

```
1. PostToolUse Hook으로 파일 수정 시 자동 타입 체크
2. 자주 쓰는 Notion 조회 패턴 → Skill로 정리
3. 보안 리뷰 / QA 리뷰를 매 PR마다 자동 실행하는 Hook
```

### 1개월 목표

```
1. 성능 리뷰 전용 커스텀 서브에이전트 만들기
2. GitHub MCP 연결해서 PR 생성까지 자동화
3. 배포 상태 조회 MCP 서버 로컬 실험
```

---

## 핵심 사고방식

> **"내가 반복하는 판단을 AI가 대신 할 수 있도록, AI가 필요한 도구와 컨텍스트를 설계하는 것"**

코드를 짜는 것보다 이 설계를 잘 하는 것이 더 레버리지가 크다.
한 번 잘 설계된 파이프라인은 매 작업마다 시간을 돌려준다.

기술 배우는 순서보다 중요한 것:

```
지금 어디서 시간이 가장 많이 낭비되는가
  → 거기에 자동화를 붙이는 것
```

전부 배우고 나서 쓰려 하면 영원히 못 쓴다.
하나씩 실제 문제에 붙이면서 배우는 것이 맞다.

---

## 레퍼런스

### Claude Code — Hooks & Sub-agents

| 자료                   | 형태      | 링크                                                      | 핵심 내용                               |
| ---------------------- | --------- | --------------------------------------------------------- | --------------------------------------- |
| Claude Code Hooks 공식 | 공식 문서 | https://docs.anthropic.com/en/docs/claude-code/hooks      | Hook 종류, 설정 방법, 예시 전부         |
| Claude Code Sub-agents | 공식 문서 | https://docs.anthropic.com/en/docs/claude-code/sub-agents | 서브에이전트 생성 및 위임 방법          |
| Claude Code Settings   | 공식 문서 | https://docs.anthropic.com/en/docs/claude-code/settings   | settings.json 전체 옵션                 |
| Claude Code GitHub     | GitHub    | https://github.com/anthropics/claude-code                 | 실제 예시 코드, 이슈에서 사용 사례 참고 |

### MCP (Model Context Protocol)

| 자료               | 형태   | 링크                                                   | 핵심 내용                                   |
| ------------------ | ------ | ------------------------------------------------------ | ------------------------------------------- |
| MCP 공식 사이트    | 공식   | https://modelcontextprotocol.io                        | 프로토콜 스펙, 서버 만드는 법               |
| MCP TypeScript SDK | GitHub | https://github.com/modelcontextprotocol/typescript-sdk | 커스텀 MCP 서버 개발 시작점                 |
| MCP 서버 목록      | 공식   | https://github.com/modelcontextprotocol/servers        | 이미 만들어진 서버들 (GitHub, Slack, DB 등) |
| Notion MCP         | GitHub | https://github.com/makenotion/notion-mcp-server        | 현재 프로젝트에서 쓰는 MCP 소스             |

### 오케스트레이션 & 에이전트 설계

| 자료                       | 형태      | 링크                                                         | 핵심 내용                                       |
| -------------------------- | --------- | ------------------------------------------------------------ | ----------------------------------------------- |
| Building effective agents  | Anthropic | https://www.anthropic.com/research/building-effective-agents | 언제 단순하게, 언제 복잡하게 설계할지 기준 제시 |
| LangGraph JS               | 공식 문서 | https://langchain-ai.github.io/langgraphjs                   | 상태 기계 기반 에이전트 — 루프, 분기, 병렬 처리 |
| Vercel AI SDK — Agents     | 공식 문서 | https://sdk.vercel.ai/docs/ai-sdk-core/agents                | Next.js 환경에서 에이전트 구현 가장 현실적      |
| Lilian Weng — Agent Survey | 블로그    | https://lilianweng.github.io/posts/2023-06-23-agent          | ReAct, Plan-Execute 등 패턴 이론 정리           |

### 실용 자동화 사례

| 자료                  | 형태   | 링크                                             | 핵심 내용                                   |
| --------------------- | ------ | ------------------------------------------------ | ------------------------------------------- |
| Simon Willison 블로그 | 블로그 | https://simonwillison.net                        | AI 도구 실용적 활용 사례 지속 업데이트      |
| Anthropic Cookbook    | GitHub | https://github.com/anthropics/anthropic-cookbook | 실전 코드 예시 (에이전트, 도구, 워크플로우) |
| n8n (노코드 자동화)   | 공식   | https://n8n.io                                   | AI 붙이기 전에 자동화 흐름 설계 연습용      |
