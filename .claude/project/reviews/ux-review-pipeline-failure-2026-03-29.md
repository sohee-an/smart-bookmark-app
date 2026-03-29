# UX 리뷰 결과 — 파이프라인 실패 알림 방식

> 분석 일자: 2026-03-29
> 분석 대상: BookmarkCard.tsx, AddBookmarkOverlay.tsx
> 검토 기준: Nielsen 10 Heuristics, Apple HIG, Material Design 3

---

### Critical

- [AddBookmarkOverlay.tsx:103-107, 128-132] 크롤링/AI 성공=false 분기에서 toast 없음 → 조용한 실패
  원칙: Nielsen #1 시스템 상태의 가시성
  수정: success===false 분기에도 toast 호출. "URL을 읽을 수 없었어요" / "AI 요약 생성에 실패했어요" 구분

- [AddBookmarkOverlay.tsx] 네트워크 예외는 toast 있고, 정상 응답 실패는 toast 없음 → 불일치
  원칙: Nielsen #4 일관성
  수정: 모든 실패 경로에서 동일하게 toast 호출

### High

- [BookmarkCard.tsx:109-112] "AI 요약에 실패했습니다." — 원인/해결 방법 없음, 재시도 CTA 없음
  원칙: Nielsen #9 에러 메시지
  수정: 실패 유형별 메시지 구분 + "다시 시도" 버튼 제공

- [복수 실패] toast 여러 개 폭탄
  원칙: Material Design 3 Snackbar 병합 원칙
  수정: debounce 500ms + 실패 카운터로 "북마크 N개 분석 실패" 단일 toast 병합

- [AddBookmarkOverlay.tsx:71-77] 5개 한도 toast가 저장 성공 직후 발행 → 실패인지 혼동
  수정: 성공/경고/에러 toast 3종 분리 또는 inline 메시지로 전환

### Medium

- [BookmarkCard.tsx] 실패 카드 클릭 시 재시도 CTA 없이 빈 상세 패널만 표시
- [BookmarkCard.tsx:109] bg-status-error/5 대비 불충분 → bg-status-error/10 이상으로
- [AddBookmarkOverlay.tsx:162] catch 내 updateBookmark 실패 시 patchCache 미실행 → 카드 상태 고착

---

### 질문 직접 답변

Q1. 여러 개 동시 실패 시 toast 여러 개?
→ 아니다. debounce 500ms + 카운터로 "북마크 N개 분석 실패" 단일 병합

Q2. 카드 실패 표시만으로 충분한가?
→ 충분하지 않다. 모달 닫힘과 실패 사이 딜레이, 스크롤에 묻히는 문제, 재시도 안내 부재

Q3. 권장 패턴:
저장 → 카드 즉시 표시 (crawling)
실패 시 → 카드: "AI 분석 실패. 다시 시도하기" (인라인)
→ Toast: 단건 즉시 / 다건 병합 (500ms debounce)

### 잘된 부분

- crawling/processing 상태를 시각적으로 다르게 처리한 것 (Nielsen #1)
- 처리 중 카드 클릭 비활성화 + cursor-wait (Nielsen #1)
- DB 저장 즉시 모달 닫고 카드 표시하는 Optimistic UI 구조
