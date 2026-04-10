"use client";

import { useEffect, useState } from "react";

/**
 * 마운트 후 클라이언트 현재 시간을 반환합니다.
 * SSR 시에는 null을 반환해 hydration mismatch를 방지합니다.
 */
export function useClientNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
  }, []);
  return now;
}
