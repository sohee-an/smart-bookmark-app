import type { Metadata } from "next";
import Link from "next/link";
import {
  Bookmark,
  Sparkles,
  Shield,
  Zap,
  Search,
  Puzzle,
  FolderOpen,
  MousePointerClick,
} from "lucide-react";
import { LandingActions } from "./LandingActions";

export const metadata: Metadata = {
  title: "SmartMark — AI 북마크 관리",
  description: "저장은 했는데, 어디 있는지 모르겠다고요? AI가 내용을 읽고 의미로 찾아드려요.",
};

export default function LandingPage() {
  return (
    <div className="bg-surface-card dark:bg-surface-base-dark selection:bg-brand-primary/10 selection:text-brand-primary min-h-screen overflow-x-hidden text-zinc-900 dark:text-zinc-50">
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
          <Link
            href="/login"
            className="hover:text-brand-primary text-sm font-bold text-zinc-600 transition-colors dark:text-zinc-400 dark:hover:text-white"
          >
            이미 계정이 있으신가요?
          </Link>
        </header>

        <section className="mx-auto max-w-4xl pt-20 pb-32 text-center">
          <div className="bg-brand-primary/10 border-brand-primary/20 mb-8 inline-flex items-center gap-2 rounded-full border px-3 py-1">
            <Sparkles className="text-brand-primary h-4 w-4" />
            <span className="text-brand-primary text-xs font-bold tracking-wider uppercase">
              AI 의미 검색 · SmartMark
            </span>
          </div>

          <h1 className="mb-8 text-5xl leading-[1.1] font-black tracking-tight text-zinc-900 md:text-7xl dark:text-white">
            수많은 링크 속에서
            <br />
            <span className="text-gradient">진짜 가치</span>를 찾아내세요
          </h1>

          <p className="mx-auto mb-12 max-w-2xl text-xl leading-relaxed text-zinc-600 dark:text-zinc-400">
            단순한 링크 저장을 넘어, AI가 내용을 요약하고 최적의 태그를 추천합니다. 제목이 기억 안
            나도 괜찮아요. 의미만 알아도 관련된 북마크를 찾아드려요.
          </p>

          {/* 인터랙티브 버튼만 Client Component */}
          <LandingActions />

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
              desc: '"재테크"를 검색하면 제목엔 없어도 내용이 관련된 북마크를 찾아줍니다.',
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

        {/* 익스텐션 섹션 */}
        <section className="pb-32">
          <div className="from-brand-primary/5 to-brand-accent/5 dark:from-brand-primary/10 dark:to-brand-accent/10 relative overflow-hidden rounded-3xl border border-zinc-100 bg-gradient-to-br via-white p-12 dark:border-zinc-800 dark:via-zinc-900">
            <div className="bg-brand-primary/10 pointer-events-none absolute top-0 right-0 -z-0 h-64 w-64 translate-x-1/3 -translate-y-1/3 rounded-full blur-3xl" />

            <div className="relative flex flex-col items-start gap-10 md:flex-row md:items-center">
              <div className="flex-1">
                <div className="border-brand-primary/20 bg-brand-primary/10 mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1">
                  <Puzzle className="text-brand-primary h-4 w-4" />
                  <span className="text-brand-primary text-xs font-bold tracking-wider uppercase">
                    Chrome Extension
                  </span>
                </div>
                <h2 className="mb-4 text-3xl font-black tracking-tight text-zinc-900 md:text-4xl dark:text-white">
                  브라우징 중에도
                  <br />
                  <span className="text-gradient">원클릭으로 저장</span>
                </h2>
                <p className="mb-8 max-w-md leading-relaxed text-zinc-600 dark:text-zinc-400">
                  탭 전환 없이 지금 보는 페이지를 바로 저장. 기존 북마크 수백 개도 AI가 한 번에
                  정리해드려요.
                </p>
                <a
                  href="https://chromewebstore.google.com/detail/jmoedoefcinmibboekbampkdmgnmokad"
                  className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-zinc-700 active:scale-[0.98] dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                >
                  Chrome에 추가하기 →
                </a>
              </div>

              <div className="flex flex-col gap-4 md:min-w-[280px]">
                {[
                  {
                    icon: <MousePointerClick className="text-brand-primary h-5 w-5" />,
                    title: "원클릭 저장",
                    desc: "지금 보는 페이지 즉시 저장",
                  },
                  {
                    icon: <FolderOpen className="text-brand-accent h-5 w-5" />,
                    title: "북마크 일괄 가져오기",
                    desc: "기존 즐겨찾기 한 번에 이전",
                  },
                  {
                    icon: <Sparkles className="text-brand-secondary h-5 w-5" />,
                    title: "AI 자동 분류",
                    desc: "수백 개도 카테고리별로 정리",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-2xl border border-zinc-100 bg-white/70 p-4 backdrop-blur-sm dark:border-zinc-700/50 dark:bg-zinc-800/50"
                  >
                    <div className="mt-0.5 shrink-0">{item.icon}</div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {item.title}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
