import { Geist, Geist_Mono } from "next/font/google";
import Head from "next/head";
import { Header } from "@/components/layout/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * @description 메인 홈 페이지. 
 * Middleware(`middleware.ts`)에서 인증 여부를 확인하므로 별도의 리다이렉트 로직이 필요 없습니다.
 */
export default function Home() {
  return (
    <div className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-zinc-50 font-sans text-zinc-900 selection:bg-indigo-100 selection:text-indigo-700 dark:bg-zinc-950 dark:text-zinc-100 dark:selection:bg-indigo-900 dark:selection:text-indigo-200`}>
      <Head>
        <title>SmartMark - 스마트 북마크 관리</title>
      </Head>

      <Header />

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <section className="text-center" aria-labelledby="empty-state-title">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600 mb-8 dark:bg-indigo-950/50 dark:text-indigo-400">
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>
          <h2 id="empty-state-title" className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
            시작해볼까요?
          </h2>
          <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
            당신의 소중한 링크들을 한곳에서 스마트하게 관리하세요.
          </p>
          <div className="mt-10">
            <button 
              type="button"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-800 transition-all"
            >
              도움말 확인하기
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
