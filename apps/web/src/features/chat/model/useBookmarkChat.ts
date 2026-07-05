"use client";

import { useCallback, useRef, useState } from "react";

export type ChatSource = {
  n: number;
  id: string;
  url: string;
  title: string;
  summary: string;
  thumbnailUrl: string | null;
  similarity: number;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
};

/**
 * 북마크 대화 훅. POST /api/chat의 SSE(text/event-stream)를 fetch 리더로 소비한다.
 * (EventSource는 POST body를 못 보내므로 fetch + ReadableStream 파싱)
 * AbortController로 생성 중단 가능.
 */
export function useBookmarkChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const send = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || isStreaming) return;

      setMessages((prev) => [
        ...prev,
        { role: "user", content: q },
        { role: "assistant", content: "" },
      ]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const updateAssistant = (fn: (m: ChatMessage) => ChatMessage) => {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") next[next.length - 1] = fn(last);
          return next;
        });
      };

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: q }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const msg =
            res.status === 401
              ? "로그인이 필요해요."
              : res.status === 429
                ? "요청이 너무 많아요. 잠시 후 다시 시도해 주세요."
                : "답변을 받지 못했어요.";
          updateAssistant((m) => ({ ...m, content: msg }));
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // SSE 프레임은 빈 줄(\n\n)로 구분. 마지막 미완성 프레임은 버퍼에 남긴다.
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            const event = frame.match(/^event: (.+)$/m)?.[1];
            const rawData = frame.match(/^data: (.+)$/m)?.[1];
            if (!event || !rawData) continue;

            const data = JSON.parse(rawData);
            if (event === "sources") {
              updateAssistant((m) => ({ ...m, sources: data as ChatSource[] }));
            } else if (event === "token") {
              updateAssistant((m) => ({ ...m, content: m.content + data.text }));
            } else if (event === "error") {
              updateAssistant((m) => ({ ...m, content: m.content || data.message }));
            }
          }
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          updateAssistant((m) => ({ ...m, content: m.content || "답변을 받지 못했어요." }));
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isStreaming]
  );

  return { messages, isStreaming, send, stop };
}
