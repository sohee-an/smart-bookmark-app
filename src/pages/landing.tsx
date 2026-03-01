import Head from "next/head";
import { useRouter } from "next/router";
import { Bookmark, Sparkles, Shield, Zap, ArrowRight } from "lucide-react";
import storage from "@/shared/lib/storage";

/**
 * @description SSG로 렌더링되는 랜딩 페이지.
 * Middleware에서 인증 정보를 미리 확인하여 접근 여부를 결정하므로,
 * 이 컴포넌트 내부에서는 리다이렉트 로직이 필요 없습니다.
 */
export default function LandingPage() {
  const router = useRouter();

  const handleStartAsGuest = () => {
    // 7일 동안 유지되는 게스트 쿠키 설정
    storage.cookie.set("is_guest", "true", 7);
    // 메인 페이지로 이동 (미들웨어가 이제 통과시켜 줍니다)
    router.push("/");
  };

  const handleLogin = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-zinc-900 selection:bg-indigo-100 selection:text-indigo-700 dark:bg-zinc-950 dark:text-zinc-50 dark:selection:bg-indigo-900/50">
      <Head>
        <title>SmartMark - 똑똑한 북마크 관리의 시작</title>
        <meta name="description" content="AI가 분류하고 정리하는 나만의 스마트 북마크 솔루션" />
      </Head>

      {/* Decorative Background Elements */}
      <div className="pointer-events-none absolute top-0 left-1/2 -z-10 h-[600px] w-full -translate-x-1/2 overflow-hidden">
        <div className="absolute top-[-100px] left-[-100px] h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-[100px]" />
        <div className="absolute top-[200px] right-[-100px] h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-[120px]" />
      </div>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Navigation / Header */}
        <header className="flex items-center justify-between py-8">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-500/20">
              <Bookmark className="h-6 w-6 text-white" />
            </div>
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-2xl font-black tracking-tight text-transparent dark:from-indigo-400 dark:to-purple-400">
              SmartMark
            </span>
          </div>
          <button
            onClick={handleLogin}
            className="cursor-pointer text-sm font-bold text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            이미 계정이 있으신가요?
          </button>
        </header>

        {/* Hero Section */}
        <section className="mx-auto max-w-4xl pt-20 pb-32 text-center">
          <div className="animate-fade-in mb-8 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 dark:border-indigo-900/50 dark:bg-indigo-950/30">
            <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold tracking-wider text-indigo-700 uppercase dark:text-indigo-300">
              AI 기반 북마크 큐레이션
            </span>
          </div>

          <h1 className="mb-8 text-5xl leading-[1.1] font-black tracking-tight text-zinc-900 md:text-7xl dark:text-white">
            수많은 링크 속에서
            <br />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              진짜 가치
            </span>
            를 찾아내세요
          </h1>

          <p className="mx-auto mb-12 max-w-2xl text-xl leading-relaxed text-zinc-600 dark:text-zinc-400">
            단순한 링크 저장을 넘어, AI가 내용을 요약하고 최적의 태그를 추천합니다. 나만의 지식
            베이스를 가장 스마트한 방법으로 구축해보세요.
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
              className="w-full cursor-pointer rounded-2xl border border-zinc-200 bg-white px-8 py-4 text-lg font-bold text-zinc-900 transition-all hover:bg-zinc-50 sm:w-auto dark:border-zinc-800 dark:bg-transparent dark:text-white dark:hover:bg-zinc-900"
            >
              로그인 / 회원가입
            </button>
          </div>

          {/* Quick Stats / Trust */}
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

        {/* Feature Grid */}
        <section className="grid gap-8 pb-32 md:grid-cols-3">
          {[
            {
              title: "스마트 AI 요약",
              desc: "링크만 넣으세요. AI가 핵심 내용을 파악해 요약해 드립니다.",
              icon: <Sparkles className="h-6 w-6 text-indigo-500" />,
              color: "bg-indigo-50 dark:bg-indigo-950/20",
            },
            {
              title: "자동 태그 추천",
              desc: "번거로운 태깅은 그만. 내용에 맞는 최적의 카테고리를 자동 생성합니다.",
              icon: <Zap className="h-6 w-6 text-purple-500" />,
              color: "bg-purple-50 dark:bg-purple-950/20",
            },
            {
              title: "개인화 검색",
              desc: "강력한 필터와 검색으로 내가 저장한 지식을 즉시 찾아보세요.",
              icon: <Bookmark className="h-6 w-6 text-pink-500" />,
              color: "bg-pink-50 dark:bg-pink-950/20",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="group rounded-3xl border border-zinc-100 bg-white/50 p-8 backdrop-blur-sm transition-all hover:border-indigo-500/30 dark:border-zinc-800 dark:bg-zinc-900/50"
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

      {/* Simple Footer */}
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
