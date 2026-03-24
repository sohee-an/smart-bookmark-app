# 포트폴리오 & 취업 체크리스트 — Smart Bookmark

## 공고별 기술 요구사항 대응

### 기초 (신입 / 주니어 공통)

| 항목                                          | 현황           | 파일 위치                                   |
| --------------------------------------------- | -------------- | ------------------------------------------- |
| React 함수형 컴포넌트                         | ✅             | 전체                                        |
| TypeScript 사용                               | ✅ strict mode | tsconfig.json                               |
| React Hooks (useState, useEffect, useMemo...) | ✅             | 전체                                        |
| 상태관리 라이브러리 (Zustand)                 | ✅             | entities/bookmark/model/useBookmarkStore.ts |
| REST API 연동                                 | ✅             | features/bookmark/model/bookmark.service.ts |
| 반응형 UI (Tailwind)                          | ✅             | 전체                                        |
| Git / GitHub                                  | ✅             | —                                           |
| next/image                                    | ❌ → 적용 필요 | BookmarkCard.tsx                            |

---

### 중급 (1~3년차 수준)

| 항목                           | 현황           | 파일 위치                      |
| ------------------------------ | -------------- | ------------------------------ |
| Next.js App Router             | ✅             | app/                           |
| Server / Client Component 구분 | ✅             | app/                           |
| Route Handlers (API)           | ✅             | app/api/                       |
| 인증 구현 (Supabase Auth)      | ✅             | proxy.ts, shared/api/supabase/ |
| Middleware (Proxy)             | ✅             | proxy.ts                       |
| SSR / SSG 이해 및 적용         | △ 이해O 미적용 | rendering-strategy.md 참고     |
| Repository 패턴                | ✅             | entities/bookmark/api/         |
| FSD 아키텍처                   | ✅             | CLAUDE.md                      |
| 모노레포 (Turborepo)           | ✅             | turbo.json                     |
| OG 이미지 생성 (Edge)          | ✅             | app/api/og/route.tsx           |
| Headless 컴포넌트 패턴         | ✅             | packages/ui/                   |

---

### 고급 (3년차+ / AI 기능 관련 공고)

| 항목                   | 현황           | 파일 위치                        |
| ---------------------- | -------------- | -------------------------------- |
| AI API 연동 (Gemini)   | ✅             | app/api/ai-analyze/              |
| 임베딩 / 벡터 검색     | ✅             | app/api/embed/, semantic-search/ |
| RAG 개념 적용          | ✅             | Supabase match_bookmarks RPC     |
| Rate Limiting          | ❌ → 적용 필요 | performance-optimization.md 참고 |
| Server Actions         | ❌ → 적용 예정 | nextjs-deep-dive.md 참고         |
| Streaming Response     | ❌ → 적용 예정 | nextjs-deep-dive.md 참고         |
| Core Web Vitals 최적화 | ❌ → 측정 필요 | —                                |

---

## 어필 포인트별 스크립트

### "아키텍처 설계"

> FSD(Feature-Sliced Design)를 적용해 레이어 간 의존성 방향을 엄격히 관리했습니다.
> pages → widgets → features → entities → shared 순서로 상위가 하위를 import하고,
> 역방향 import는 ESLint 규칙으로 빌드 시 자동 차단됩니다.
> 추후 React Native 확장을 고려해 로직은 packages/에서 공유하고,
> UI만 플랫폼별로 교체 가능하도록 Headless 패턴을 적용했습니다.

---

### "AI 기능 구현"

> Gemini API를 활용한 북마크 자동 요약/태깅과,
> 임베딩 기반 시맨틱 서치를 구현했습니다.
> URL을 저장하면 서버에서 크롤링 → AI 분석 → 임베딩 생성 파이프라인이 비동기로 실행되고,
> 사용자는 카드가 즉시 표시된 후 AI 결과가 채워지는 방식으로 UX를 개선했습니다.
> "React 최적화"를 검색하면 제목에 없어도 의미적으로 관련된 북마크가 검색됩니다.

---

### "Next.js 활용"

> Pages Router에서 App Router로 전환하면서 Server Component와 Client Component를
> 목적에 맞게 분리했습니다.
> Edge Runtime에서 동적 OG 이미지를 생성하고,
> Supabase SSR 클라이언트를 활용해 서버에서 안전하게 인증을 처리합니다.
> proxy.ts(Middleware)에서 인증 여부에 따라 랜딩/메인 페이지로 라우팅합니다.

---

### "데이터 구조"

> 비회원은 localStorage, 회원은 Supabase DB에 저장하는 두 가지 저장소를
> Repository 패턴으로 추상화해 클라이언트 코드 변경 없이 전환 가능합니다.
> 추후 Spring Boot 백엔드로 교체 시에도 Repository 구현체만 교체하면 됩니다.

---

## 개선 우선순위 (포폴 완성도 기준)

### 1순위 — 금방 할 수 있고 효과 큼

```
□ next/image 전환
  → BookmarkCard 썸네일에 적용, next.config.ts 도메인 설정
  → 예상 시간: 1~2시간

□ generateMetadata 전 페이지 설정
  → 현재 /landing, /login 메타데이터 없음
  → 예상 시간: 1시간

□ Rate Limiting 적용
  → Upstash Redis 무료 플랜으로 충분
  → 예상 시간: 2~3시간
```

### 2순위 — 면접 기술 질문 대비

```
□ SSR 초기 데이터 fetch 적용
  → / 및 /bookmarks 페이지에 서버 컴포넌트 fetch 추가
  → Server Component + Client Component 분리 구조 명확화
  → 예상 시간: 반나절

□ Vercel Analytics + SpeedInsights 설치
  → layout.tsx에 컴포넌트 추가만 하면 됨
  → Core Web Vitals 수치 포폴에 기재 가능
  → 예상 시간: 30분
```

### 3순위 — 차별화

```
□ Server Actions 전환
  → 북마크 추가/수정/삭제를 Server Actions으로
  → 예상 시간: 하루

□ AI 스트리밍 응답
  → 분석 중 실시간 진행상황 표시
  → 예상 시간: 하루

□ Parallel Routes (URL 기반 패널)
  → 북마크 상세 패널 공유 가능
  → 예상 시간: 1~2일
```

---

## README 작성 가이드

포폴용 README에 반드시 들어가야 할 것들:

```markdown
# SmartMark

## 기술 스택

## 주요 기능 (GIF/영상)

## 아키텍처 설명 (다이어그램)

## AI 파이프라인 설명

## 성능 최적화 내용 (Core Web Vitals 수치)

## 로컬 실행 방법

## 배포 링크
```

**GIF/영상 필수**: 북마크 추가 → AI 분석 자동 완성 과정을 화면 녹화해서 README에 포함.
텍스트만 있는 포폴은 읽지 않는 리뷰어가 많음.
