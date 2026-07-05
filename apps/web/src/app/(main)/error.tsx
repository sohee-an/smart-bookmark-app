"use client";

import { useEffect } from "react";
import { ErrorState } from "@/shared/ui/ErrorState";
import { captureError } from "@/shared/lib/monitoring";

/**
 * (main) 세그먼트 에러 바운더리.
 * (main)/layout.tsx의 Header 안쪽에 위치하므로, 페이지 에러 시에도 헤더/셸은 유지되고
 * 콘텐츠 영역만 이 UI로 대체된다. ((main)/layout 자체의 에러는 루트 error.tsx가 담당)
 */
export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { boundary: "main" });
  }, [error]);

  return <ErrorState onRetry={reset} className="min-h-[calc(100vh-4rem)]" />;
}
