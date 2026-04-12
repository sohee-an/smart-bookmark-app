"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import storage from "@/shared/lib/storage";

export function LandingActions() {
  const router = useRouter();

  const handleStartAsGuest = () => {
    storage.cookie.set("is_guest", "true", 7);
    router.push("/");
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
      <button
        onClick={handleStartAsGuest}
        className="group flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-zinc-200 transition-all hover:scale-[1.02] active:scale-[0.98] sm:w-auto dark:bg-white dark:text-zinc-900 dark:shadow-none"
      >
        비회원으로 시작하기
        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
      </button>
      <a
        href="/login"
        className="bg-surface-card w-full cursor-pointer rounded-2xl border border-zinc-200 px-8 py-4 text-center text-lg font-bold text-zinc-900 transition-all hover:bg-zinc-50 sm:w-auto dark:border-zinc-800 dark:bg-transparent dark:text-white dark:hover:bg-zinc-900"
      >
        로그인 / 회원가입
      </a>
    </div>
  );
}
