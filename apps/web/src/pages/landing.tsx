import React from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Bookmark, Sparkles, Shield, Zap, ArrowRight, Search } from "lucide-react";
import storage from "@/shared/lib/storage";

export default function LandingPage() {
  const router = useRouter();

  const handleStartAsGuest = () => {
    storage.cookie.set("is_guest", "true", 7);
    router.push("/");
  };

  const handleLogin = () => {
    router.push("/login");
  };

  return (
    <div className="bg-surface-card dark:bg-surface-base-dark selection:bg-brand-primary/10 selection:text-brand-primary min-h-screen overflow-x-hidden text-zinc-900 dark:text-zinc-50">
      <Head>
        <title>SmartMark - 똑똑한 북마크 관리의 시작</title>
        <meta name="description" content="AI가 분류하고 정리하는 나만의 스마트 북마크 솔루션" />
      </Head>

      {/* Decorative Background Elements */}
      <div className="pointer-events-none absolute top-0 left-1/2 -z-10 h-[600px] w-full -translate-x-1/2 overflow-hidden">
        <div className="bg-brand-primary/10 absolute top-[-100px] left-[-100px] h-[400px] w-[400px] rounded-full blur-[100px]" />
        <div className="bg-brand-accent/10 absolute top-[200px] right-[-100px] h-[500px] w-[500px] rounded-full blur-[120px]" />
      </div>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between py-8">
          <div className="flex items-center gap-2">
            <div className="bg-brand-primary shadow-brand-primary/20 flex h-10 w-10 items-center justify-center rounded-xl shadow-lg">
              <Bookmark className="h-6 w-6 text-white" />
            </div>
            <span className="text-gradient text-2xl font-black tracking-tight">SmartMark</span>
          </div>
          <button
            onClick={handleLogin}
            className="hover:text-brand-primary cursor-pointer text-sm font-bold text-zinc-600 transition-colors dark:text-zinc-400 dark:hover:text-white"
          >
            이미 계정이 있으신가요?
          </button>
        </header>

        <section className="mx-auto max-w-4xl pt-20 pb-32 text-center">
          <div className="bg-brand-primary/10 border-brand-primary/20 mb-8 inline-flex items-center gap-2 rounded-full border px-3 py-1">
            <Sparkles className="text-brand-primary h-4 w-4" />
            <span className="text-brand-primary text-xs font-bold tracking-wider uppercase">
              AI 의미 검색 · SmartMark
            </span>
          </div>

          <h1 className="mb-8 text-5xl leading-[1.1] font-black tracking-tight text-zinc-900 md:text-7xl dark:text-white">
            북마크는 쌓이는데,
            <br />
            <span className="text-gradient">정작 필요할 때 못 찾죠?</span>
          </h1>

          <p className="mx-auto mb-12 max-w-2xl text-xl leading-relaxed text-zinc-600 dark:text-zinc-400">
            키워드가 정확히 맞지 않아도 AI가 내용의{" "}
            <strong className="text-zinc-800 dark:text-zinc-200">의미</strong>를 이해하고
            찾아줍니다. 북마크를 저장하는 순간, 요약·태그·의미 검색이 자동으로 준비됩니다.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={handleStartAsGuest}
              className="group flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-zinc-200 transition-all hover:scale-[1.02] active:scale-[0.98] sm:w-auto dark:bg-white dark:text-zinc-900 dark:shadow-none"
            >
              비회원으로 시작하기
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={handleLogin}
              className="bg-surface-card w-full cursor-pointer rounded-2xl border border-zinc-200 px-8 py-4 text-lg font-bold text-zinc-900 transition-all hover:bg-zinc-50 sm:w-auto dark:border-zinc-800 dark:bg-transparent dark:text-white dark:hover:bg-zinc-900"
            >
              로그인 / 회원가입
            </button>
          </div>

          <div className="mt-16 flex items-center justify-center gap-8 text-sm font-medium text-zinc-500 dark:text-zinc-500">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              안전한 데이터 보관
            </div>
            <div className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              실시간 AI 분석
            </div>
          </div>
        </section>

        <section className="grid gap-8 pb-32 md:grid-cols-3">
          {[
            {
              title: "스마트 AI 요약",
              desc: "링크만 넣으세요. AI가 핵심 내용을 파악해 요약과 태그를 자동으로 만들어줍니다.",
              icon: <Sparkles className="text-brand-primary h-6 w-6" />,
              color: "bg-brand-primary/5",
            },
            {
              title: "AI 의미 검색",
              desc: '"리액트 최적화"를 검색하면 제목엔 없어도 내용이 관련된 북마크를 찾아줍니다.',
              icon: <Search className="text-brand-accent h-6 w-6" />,
              color: "bg-brand-accent/5",
            },
            {
              title: "태그 기반 필터",
              desc: "AI가 자동 생성한 태그로 원하는 주제만 빠르게 필터링할 수 있습니다.",
              icon: <Zap className="text-brand-secondary h-6 w-6" />,
              color: "bg-brand-secondary/5",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="bg-surface-card/50 dark:bg-surface-card-dark/50 hover:border-brand-primary/30 group rounded-3xl border border-zinc-100 p-8 backdrop-blur-sm transition-all dark:border-zinc-800"
            >
              <div
                className={`h-12 w-12 ${feature.color} mb-6 flex items-center justify-center rounded-2xl transition-transform group-hover:scale-110`}
              >
                {feature.icon}
              </div>
              <h3 className="mb-3 text-xl font-bold">{feature.title}</h3>
              <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">{feature.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-zinc-100 bg-zinc-50 py-12 dark:border-zinc-900 dark:bg-zinc-950/50">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <div className="mb-4 flex items-center justify-center gap-2 opacity-50 grayscale transition-all hover:grayscale-0">
            <Bookmark className="h-4 w-4" />
            <span className="text-sm font-bold">SmartMark</span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-600">
            © 2026 SmartMark. All rights reserved. Built with passion.
          </p>
        </div>
      </footer>
    </div>
  );
}
