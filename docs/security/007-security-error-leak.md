# 007 · 에러 상세 정보 클라이언트 노출

## 심각도

Medium

## 위치

- `apps/web/src/pages/api/ai-analyze.ts` — 49번째 줄

## 문제

500 에러 응답에 내부 `error.message`를 그대로 포함해 클라이언트에 반환합니다.

```ts
return res.status(500).json({
  success: false,
  message: "AI 분석 중 예기치 않은 오류가 발생했습니다.",
  details: error.message, // ← 내부 오류 노출
});
```

`error.message`에는 다음이 포함될 수 있습니다.

- API 키 관련 인증 오류 메시지
- 내부 모듈 경로, 의존성 버전 힌트
- Gemini API 응답 본문(쿼터 초과, 과금 정보 등)

## 수정 방향

프로덕션에서는 상세 정보를 서버 로그에만 기록하고 클라이언트에는 일반 메시지만 반환합니다.

```ts
catch (error: any) {
  console.error("[API AI Analyze] 오류:", error); // 서버 로그에만 기록
  return res.status(500).json({
    success: false,
    message: "AI 분석 중 예기치 않은 오류가 발생했습니다.",
    // details 제거
  });
}
```

개발 환경에서만 details를 포함하려면

```ts
...(process.env.NODE_ENV === "development" && { details: error.message }),
```
