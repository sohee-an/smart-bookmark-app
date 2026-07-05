"use client";

import { useEffect } from "react";
import { ErrorState } from "@/shared/ui/ErrorState";
import { captureError } from "@/shared/lib/monitoring";

/**
 * 라우트 세그먼트 에러 바운더리.
 * 하위 페이지/레이아웃(서버 컴포넌트 포함)에서 렌더 중 throw되면 이 UI로 대체된다.
 * (루트 layout.tsx 자체의 에러는 global-error.tsx가 담당)
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { boundary: "root" });
  }, [error]);

  return <ErrorState onRetry={reset} />;
}
