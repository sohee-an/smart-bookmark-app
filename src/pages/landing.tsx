import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Bookmark, Sparkles, Shield, Zap, ArrowRight } from 'lucide-react';
import storage from '@/shared/lib/storage';

/**
 * @description 디자인 토큰이 적용된 SSG 랜딩 페이지
 */
export default function LandingPage() {
  const router = useRouter();

  const handleStartAsGuest = () => {
    storage.cookie.set('is_guest', 'true', 7);
    router.push('/');
  };

  const handleLogin = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-surface-card text-zinc-900 dark:bg-surface-base-dark dark:text-zinc-50 overflow-x-hidden selection:bg-brand-primary/10 selection:text-brand-primary">
      <Head>
        <title>SmartMark - 똑똑한 북마크 관리의 시작</title>
        <meta name="description" content="AI가 분류하고 정리하는 나만의 스마트 북마크 솔루션" />
      </Head>

      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-brand-primary/10 rounded-full blur-[100px]" />
        <div className="absolute top-[200px] right-[-100px] w-[500px] h-[500px] bg-brand-accent/10 rounded-full blur-[120px]" />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between py-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
              <Bookmark className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-black tracking-tight text-gradient">
              SmartMark
            </span>
          </div>
          <button 
            onClick={handleLogin}
            className="text-sm font-bold text-zinc-600 hover:text-brand-primary dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            이미 계정이 있으신가요?
          </button>
        </header>

        <section className="pt-20 pb-32 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 mb-8">
            <Sparkles className="w-4 h-4 text-brand-primary" />
            <span className="text-xs font-bold text-brand-primary uppercase tracking-wider">AI 기반 북마크 큐레이션</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-zinc-900 dark:text-white mb-8 leading-[1.1]">
            수많은 링크 속에서<br />
            <span className="text-gradient">진짜 가치</span>를 찾아내세요
          </h1>
          
          <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            단순한 링크 저장을 넘어, AI가 내용을 요약하고 최적의 태그를 추천합니다. 
            나만의 지식 베이스를 가장 스마트한 방법으로 구축해보세요.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={handleStartAsGuest}
              className="group w-full sm:w-auto flex items-center justify-center gap-2 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-8 py-4 rounded-2xl font-bold text-lg hover:scale-[1.02] transition-all active:scale-[0.98] shadow-xl shadow-zinc-200 dark:shadow-none cursor-pointer"
            >
              비회원으로 시작하기
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={handleLogin}
              className="w-full sm:w-auto bg-surface-card text-zinc-900 border border-zinc-200 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-zinc-50 transition-all dark:bg-transparent dark:text-white dark:border-zinc-800 dark:hover:bg-zinc-900 cursor-pointer"
            >
              로그인 / 회원가입
            </button>
          </div>

          <div className="mt-16 flex items-center justify-center gap-8 text-sm font-medium text-zinc-500 dark:text-zinc-500">
             <div className="flex items-center gap-2">
               <Shield className="w-4 h-4" />
               안전한 데이터 보관
             </div>
             <div className="w-1 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
             <div className="flex items-center gap-2">
               <Zap className="w-4 h-4" />
               실시간 AI 분석
             </div>
          </div>
        </section>

        <section className="pb-32 grid md:grid-cols-3 gap-8">
          {[
            {
              title: "스마트 AI 요약",
              desc: "링크만 넣으세요. AI가 핵심 내용을 파악해 요약해 드립니다.",
              icon: <Sparkles className="w-6 h-6 text-brand-primary" />,
              color: "bg-brand-primary/5"
            },
            {
              title: "자동 태그 추천",
              desc: "번거로운 태깅은 그만. 내용에 맞는 최적의 카테고리를 자동 생성합니다.",
              icon: <Zap className="w-6 h-6 text-brand-accent" />,
              color: "bg-brand-accent/5"
            },
            {
              title: "개인화 검색",
              desc: "강력한 필터와 검색으로 내가 저장한 지식을 즉시 찾아보세요.",
              icon: <Bookmark className="w-6 h-6 text-brand-secondary" />,
              color: "bg-brand-secondary/5"
            }
          ].map((feature, i) => (
            <div key={i} className="p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800 bg-surface-card/50 dark:bg-surface-card-dark/50 backdrop-blur-sm hover:border-brand-primary/30 transition-all group">
              <div className={`w-12 h-12 ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </section>
      </main>

      <footer className="py-12 border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-950/50">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4 opacity-50 grayscale hover:grayscale-0 transition-all">
             <Bookmark className="w-4 h-4" />
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
