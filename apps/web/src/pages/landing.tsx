import React, { useEffect, useRef, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Bookmark, Sparkles, Shield, Zap, ArrowRight, Search, Tag } from "lucide-react";
import storage from "@/shared/lib/storage";

const DEMO_SCENARIOS = [
  {
    query: "리액트 성능 개선",
    keywordResults: [],
    semanticResults: [
      {
        title: "React 렌더링 최적화 완벽 가이드",
        domain: "velog.io",
        summary: "memo, useMemo, useCallback을 언제 써야 하는지 실제 예제로 정리했습니다.",
        tags: ["React", "성능"],
        similarity: 0.94,
      },
      {
        title: "웹 앱 Core Web Vitals 점수 올리기",
        domain: "web.dev",
        summary: "LCP, CLS, FID 지표를 실제로 개선한 사례와 함께 설명합니다.",
        tags: ["성능", "Web"],
        similarity: 0.87,
      },
      {
        title: "번들 사이즈 줄이는 7가지 방법",
        domain: "medium.com",
        summary: "코드 스플리팅과 트리 쉐이킹으로 초기 로드 시간을 50% 단축한 경험기.",
        tags: ["번들링", "최적화"],
        similarity: 0.81,
      },
    ],
  },
  {
    query: "배포 자동화 설정",
    keywordResults: [],
    semanticResults: [
      {
        title: "GitHub Actions로 CI/CD 파이프라인 구축하기",
        domain: "docs.github.com",
        summary: "PR 머지 시 자동 테스트 → 빌드 → 배포까지 이어지는 워크플로우 설정법.",
        tags: ["DevOps", "CI/CD"],
        similarity: 0.96,
      },
      {
        title: "Docker Compose로 로컬 환경 통일하기",
        domain: "docker.com",
        summary: "팀원 간 환경 차이로 생기는 문제를 컨테이너로 해결하는 실전 가이드.",
        tags: ["Docker", "인프라"],
        similarity: 0.83,
      },
      {
        title: "Vercel + Supabase 풀스택 배포 전략",
        domain: "vercel.com",
        summary: "프론트엔드와 DB를 각각 최적의 플랫폼에 배포하는 아키텍처 설계.",
        tags: ["Vercel", "배포"],
        similarity: 0.79,
      },
    ],
  },
  {
    query: "타입스크립트 실용 패턴",
    keywordResults: [],
    semanticResults: [
      {
        title: "TypeScript 제네릭 — 언제, 어떻게 써야 할까",
        domain: "typescript.tv",
        summary: "제네릭을 남용하지 않으면서도 타입 안정성을 최대화하는 실전 패턴 모음.",
        tags: ["TypeScript", "타입"],
        similarity: 0.93,
      },
      {
        title: "zod로 런타임 타입 검증 완전 정복",
        domain: "zod.dev",
        summary: "API 응답부터 폼 유효성까지, zod 스키마로 안전하게 처리하는 방법.",
        tags: ["zod", "TypeScript"],
        similarity: 0.86,
      },
      {
        title: "Discriminated Union으로 상태 모델링하기",
        domain: "velog.io",
        summary: "불가능한 상태를 타입으로 표현 불가능하게 만드는 설계 패턴.",
        tags: ["TypeScript", "설계"],
        similarity: 0.8,
      },
    ],
  },
];

function useTypewriter(text: string, speed = 60) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  return { displayed, done };
}

function SimilarityBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 90
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      : pct >= 85
        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${color}`}>
      {pct}% 일치
    </span>
  );
}

function MockBookmarkCard({
  title,
  domain,
  summary,
  tags,
  similarity,
  delay = 0,
}: {
  title: string;
  domain: string;
  summary: string;
  tags: string[];
  similarity: number;
  delay?: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={`rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm transition-all duration-500 dark:border-zinc-800 dark:bg-zinc-900 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="line-clamp-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">{title}</p>
        <SimilarityBadge value={similarity} />
      </div>
      <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        {summary}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            >
              #{t}
            </span>
          ))}
        </div>
        <span className="text-xs text-zinc-400">{domain}</span>
      </div>
    </div>
  );
}

function SemanticDemo() {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"typing" | "results">("typing");
  const scenario = DEMO_SCENARIOS[idx];
  const { displayed, done } = useTypewriter(scenario.query, 65);

  // 타이핑 완료 → 결과 표시 → 다음 시나리오
  useEffect(() => {
    if (!done) return;
    const t1 = setTimeout(() => setPhase("results"), 400);
    const t2 = setTimeout(() => {
      setPhase("typing");
      setIdx((i) => (i + 1) % DEMO_SCENARIOS.length);
    }, 4500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [done]);

  // idx 바뀌면 phase 초기화
  useEffect(() => {
    setPhase("typing");
  }, [idx]);

  return (
    <div className="mx-auto max-w-2xl">
      {/* 검색창 */}
      <div className="relative mb-6">
        <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
          <Search size={18} className="text-zinc-400" />
        </div>
        <div className="flex h-14 w-full items-center rounded-2xl border-2 border-zinc-200 bg-white pr-4 pl-11 text-base font-medium text-zinc-800 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
          <span>{displayed}</span>
          <span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-zinc-400" />
        </div>

        <div className="absolute top-1/2 right-4 -translate-y-1/2">
          <div className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5">
            <Sparkles size={13} className="text-white" />
            <span className="text-xs font-bold text-white">AI 검색</span>
          </div>
        </div>
      </div>

      {/* 결과 */}
      <div
        className={`space-y-3 transition-all duration-300 ${phase === "results" ? "opacity-100" : "opacity-0"}`}
      >
        <div className="mb-3 flex items-center gap-2">
          <Sparkles size={14} className="text-indigo-500" />
          <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
            AI 의미 검색 결과 ({scenario.semanticResults.length})
          </span>
          <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
        </div>

        {phase === "results" &&
          scenario.semanticResults.map((r, i) => (
            <MockBookmarkCard key={`${idx}-${i}`} {...r} delay={i * 120} />
          ))}
      </div>
    </div>
  );
}

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

      {/* Decorative Background */}
      <div className="pointer-events-none absolute top-0 left-1/2 -z-10 h-[600px] w-full -translate-x-1/2 overflow-hidden">
        <div className="bg-brand-primary/10 absolute top-[-100px] left-[-100px] h-[400px] w-[400px] rounded-full blur-[100px]" />
        <div className="bg-brand-accent/10 absolute top-[200px] right-[-100px] h-[500px] w-[500px] rounded-full blur-[120px]" />
      </div>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
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

        {/* Hero */}
        <section className="mx-auto max-w-4xl pt-20 pb-16 text-center">
          <div className="bg-brand-primary/10 border-brand-primary/20 mb-8 inline-flex items-center gap-2 rounded-full border px-3 py-1">
            <Sparkles className="text-brand-primary h-4 w-4" />
            <span className="text-brand-primary text-xs font-bold tracking-wider uppercase">
              AI 기반 북마크 큐레이션
            </span>
          </div>

          <h1 className="mb-8 text-5xl leading-[1.1] font-black tracking-tight text-zinc-900 md:text-7xl dark:text-white">
            수많은 링크 속에서
            <br />
            <span className="text-gradient">진짜 가치</span>를 찾아내세요
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

        {/* Semantic Search Demo */}
        <section className="pb-24">
          <div className="mb-12 text-center">
            <div className="mb-3 flex items-center justify-center gap-2">
              <Sparkles size={16} className="text-indigo-500" />
              <span className="text-xs font-bold tracking-widest text-indigo-500 uppercase">
                AI 의미 검색 체험
              </span>
            </div>
            <h2 className="mb-4 text-3xl font-black tracking-tight text-zinc-900 md:text-4xl dark:text-white">
              제목이 기억 안 나도 괜찮아요
            </h2>
            <p className="mx-auto max-w-xl text-base text-zinc-500 dark:text-zinc-400">
              키워드가 정확히 맞지 않아도 AI가 문서의 <strong>의미</strong>를 이해하고 연관된
              북마크를 찾아줍니다.
            </p>
          </div>

          {/* 비교 레이블 */}
          <div className="mx-auto mb-6 max-w-2xl">
            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-zinc-100 p-1 dark:bg-zinc-800">
              <div className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-300/60 px-4 py-2 text-sm font-bold text-zinc-500 line-through dark:bg-zinc-700 dark:text-zinc-500">
                키워드만 매칭
              </div>
              <div className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white">
                <Sparkles size={13} />
                AI 의미 검색
              </div>
            </div>
          </div>

          <SemanticDemo />

          <p className="mt-8 text-center text-xs text-zinc-400 dark:text-zinc-600">
            * 데모용 예시입니다. 실제 서비스에서는 내가 저장한 북마크를 의미로 찾아드려요.
          </p>
        </section>

        {/* Features */}
        <section className="grid gap-8 pb-32 md:grid-cols-3">
          {[
            {
              title: "스마트 AI 요약",
              desc: "링크만 넣으세요. AI가 핵심 내용을 파악해 요약해 드립니다.",
              icon: <Sparkles className="text-brand-primary h-6 w-6" />,
              color: "bg-brand-primary/5",
            },
            {
              title: "자동 태그 추천",
              desc: "번거로운 태깅은 그만. 내용에 맞는 최적의 카테고리를 자동 생성합니다.",
              icon: <Tag className="text-brand-accent h-6 w-6" />,
              color: "bg-brand-accent/5",
            },
            {
              title: "AI 의미 검색",
              desc: "제목이 기억 안 나도 괜찮아요. 의미가 비슷한 북마크를 AI가 찾아줍니다.",
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
