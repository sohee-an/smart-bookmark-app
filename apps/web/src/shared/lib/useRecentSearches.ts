import { useCallback, useState } from "react";

const KEY = "sm:recent-searches";
const MAX = 5;

function load(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function useRecentSearches() {
  const [searches, setSearches] = useState<string[]>(() => load());

  const add = useCallback((q: string) => {
    if (!q.trim()) return;
    const trimmed = q.trim();
    const next = [trimmed, ...load().filter((s) => s !== trimmed)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
    setSearches(next);
  }, []);

  const remove = useCallback((q: string) => {
    const next = load().filter((s) => s !== q);
    localStorage.setItem(KEY, JSON.stringify(next));
    setSearches(next);
  }, []);

  return { searches, add, remove };
}
