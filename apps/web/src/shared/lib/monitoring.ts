/**
 * 에러 모니터링 seam.
 *
 * 테스트는 "아는 케이스"만 잡는다. 프로덕션에서 발생하는 "모르는 에러"까지 수집해야
 * 검증 루프가 닫힌다 — 그 수집 지점을 벤더(Sentry 등)에 직접 의존하지 않고 이 함수로
 * 추상화한다. 지금은 console.error로 남기고(프로덕션에서도 next.config의 removeConsole
 * exclude로 유지됨), 실서비스에서 Sentry를 붙일 때 이 함수 내부만 교체하면 된다.
 *
 * Sentry 활성화 (계정/DSN 발급 후):
 *   1) pnpm add @sentry/nextjs
 *   2) NEXT_PUBLIC_SENTRY_DSN 환경변수 + instrumentation.ts / client config에서 Sentry.init
 *   3) 아래 body를:
 *        import * as Sentry from "@sentry/nextjs";
 *        Sentry.captureException(error, { extra: context });
 *   호출부(error.tsx 등)는 전혀 바꿀 필요 없음 — seam 덕분에.
 */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  console.error("[monitoring] captureError:", error, context ?? "");
}
