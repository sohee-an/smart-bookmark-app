"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Square, ExternalLink, Sparkles } from "lucide-react";
import { useBookmarkChat, type ChatSource } from "../model/useBookmarkChat";
import { Markdown } from "./Markdown";

const EXAMPLES = [
  "React 상태관리 관련해서 저장한 거 있어?",
  "성능 최적화에 대해 뭘 모아놨지?",
  "최근에 저장한 것 중 TypeScript 관련은?",
];

export function ChatContent() {
  const { messages, isStreaming, send, stop } = useBookmarkChat();
  const [input, setInput] = useState("");

  // 자동 스크롤 — 맨 아래 고정, 사용자가 위로 스크롤하면 해제
  const scrollRef = useRef<HTMLDivElement>(null);
  const [stick, setStick] = useState(true);

  useEffect(() => {
    if (stick && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, stick]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setStick(nearBottom);
  };

  const submit = (q: string) => {
    if (isStreaming) return;
    const trimmed = q.trim();
    if (!trimmed) return;
    setStick(true);
    send(trimmed);
    setInput("");
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-4">
      {/* 메시지 영역 */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto py-8">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <div className="bg-brand-primary/10 text-brand-primary flex h-14 w-14 items-center justify-center rounded-2xl">
              <Sparkles size={26} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-zinc-900 dark:text-white">
                저장한 북마크에게 물어보세요
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                내가 모아둔 북마크를 근거로 답해드려요.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => submit(ex)}
                  className="rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="bg-brand-primary max-w-[80%] rounded-3xl rounded-br-lg px-4 py-2.5 text-sm font-medium text-white">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex flex-col gap-3">
                  <div className="text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                    {m.content ? (
                      <Markdown text={m.content} />
                    ) : (
                      isStreaming &&
                      i === messages.length - 1 && <span className="text-zinc-400">생각 중…</span>
                    )}
                  </div>
                  {m.sources && m.sources.length > 0 && <SourceList sources={m.sources} />}
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* 입력 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="mb-6 flex items-end gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="북마크에게 물어보기…"
          className="flex-1 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 outline-none focus:border-zinc-400 md:text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={stop}
            aria-label="생성 중단"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            <Square size={16} fill="currentColor" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            aria-label="보내기"
            className="bg-brand-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white transition-all disabled:opacity-40"
          >
            <ArrowUp size={18} />
          </button>
        )}
      </form>
    </div>
  );
}

function SourceList({ sources }: { sources: ChatSource[] }) {
  return (
    <div className="flex flex-col gap-1.5 border-t border-zinc-100 pt-3 dark:border-zinc-800">
      <p className="text-xs font-bold tracking-widest text-zinc-400 uppercase">근거 북마크</p>
      <div className="flex flex-col gap-1.5">
        {sources.map((s) => (
          <a
            key={s.id}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <span className="text-brand-primary shrink-0 text-xs font-bold">[{s.n}]</span>
            <span className="flex-1 truncate text-zinc-700 dark:text-zinc-300">
              {s.title || s.url}
            </span>
            <span className="shrink-0 text-xs text-zinc-400">
              {Math.round(s.similarity * 100)}%
            </span>
            <ExternalLink size={13} className="shrink-0 text-zinc-400" />
          </a>
        ))}
      </div>
    </div>
  );
}
