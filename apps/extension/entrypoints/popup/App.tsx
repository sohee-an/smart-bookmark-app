import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import "../../assets/globals.css";

type AuthMode = "login" | "signup";
type SaveStatus = "idle" | "saving" | "done" | "error" | "duplicate";

const WEB_URL = import.meta.env.VITE_WEB_URL as string;

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signupDone, setSignupDone] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          setSignupDone(true);
          return;
        }
      }
    } catch (err: any) {
      setError(err.message || "인증에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    chrome.tabs.create({ url: `${WEB_URL}/login?from=extension` });
    window.close();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="flex w-[300px] items-center justify-center bg-surface-base py-10 font-sans dark:bg-surface-base-dark">
        <p className="text-sm text-zinc-400 dark:text-zinc-500">로딩 중...</p>
      </div>
    );
  }

  if (user) {
    return <SaveView user={user} onLogout={handleLogout} />;
  }

  if (signupDone) {
    return (
      <div className="flex w-[300px] flex-col gap-3 bg-surface-base px-4 py-5 font-sans dark:bg-surface-base-dark">
        <h1 className="m-0 text-center text-xl font-extrabold text-brand-primary">SmartMark</h1>
        <div className="py-4 text-center">
          <p className="mb-2 text-sm text-zinc-800 dark:text-zinc-200">이메일을 확인해주세요</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            {email}으로 인증 링크를 보냈습니다.
          </p>
          <button
            className="mt-4 cursor-pointer border-none bg-transparent text-xs text-brand-primary"
            onClick={() => {
              setSignupDone(false);
              setMode("login");
            }}
          >
            로그인으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-[300px] flex-col gap-3 bg-surface-base px-4 py-5 font-sans dark:bg-surface-base-dark">
      <h1 className="m-0 text-center text-xl font-extrabold text-brand-primary">SmartMark</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
        <input
          className="box-border w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-brand-primary"
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="box-border w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-brand-primary"
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="m-0 text-xs text-red-500 dark:text-red-400">{error}</p>}

        <button
          className="w-full cursor-pointer rounded-xl border-none bg-brand-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
          type="submit"
          disabled={submitting}
        >
          {submitting ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
        </button>
      </form>

      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">또는</span>
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
      </div>

      <button
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        onClick={handleGoogleLogin}
      >
        <svg width="16" height="16" viewBox="0 0 18 18">
          <path
            fill="#4285F4"
            d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
          />
          <path
            fill="#34A853"
            d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
          />
          <path
            fill="#FBBC05"
            d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
          />
          <path
            fill="#EA4335"
            d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"
          />
        </svg>
        Google로 계속하기
      </button>

      <button
        className="cursor-pointer border-none bg-transparent p-0 text-center text-xs text-brand-primary"
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setError("");
        }}
      >
        {mode === "login" ? "계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
      </button>
    </div>
  );
}

function SaveView({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [currentUrl, setCurrentUrl] = useState("");
  const [currentTitle, setCurrentTitle] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.url) setCurrentUrl(tab.url);
      if (tab?.title) setCurrentTitle(tab.title);
    });
  }, []);

  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setSaveStatus("error");
        return;
      }

      const res = await fetch(`${WEB_URL}/api/extension/save-bookmark`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ url: currentUrl }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setSaveStatus("error");
        return;
      }
      setSaveStatus("done");
    } catch {
      setSaveStatus("error");
    }
  };

  const isChromePage =
    currentUrl.startsWith("chrome://") || currentUrl.startsWith("chrome-extension://");

  return (
    <div className="flex w-[300px] flex-col gap-3 bg-surface-base px-4 py-5 font-sans dark:bg-surface-base-dark">
      <div className="flex items-center justify-between">
        <h1 className="m-0 text-xl font-extrabold text-brand-primary">SmartMark</h1>
        <button
          className="cursor-pointer rounded-lg border-none bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
          onClick={onLogout}
        >
          로그아웃
        </button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-surface-card px-3 py-2.5 dark:border-zinc-700 dark:bg-surface-card-dark">
        <p
          className="m-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-zinc-900 dark:text-zinc-100"
          title={currentTitle}
        >
          {currentTitle || "제목 없음"}
        </p>
        <p
          className="mb-0 mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-zinc-400 dark:text-zinc-500"
          title={currentUrl}
        >
          {currentUrl}
        </p>
      </div>

      {saveStatus === "done" && (
        <div className="rounded-xl bg-green-50 px-3 py-2.5 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">
          저장 완료! AI가 분석 중이에요.
        </div>
      )}
      {saveStatus === "error" && (
        <div className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          저장에 실패했습니다.
        </div>
      )}

      {saveStatus !== "done" && (
        <button
          className="w-full cursor-pointer rounded-xl border-none bg-brand-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
          onClick={handleSave}
          disabled={saveStatus === "saving" || isChromePage}
        >
          {saveStatus === "saving"
            ? "저장 중..."
            : isChromePage
              ? "저장 불가 (크롬 내부 페이지)"
              : "이 페이지 저장"}
        </button>
      )}

      <button
        className="w-full cursor-pointer rounded-xl border border-zinc-200 bg-transparent py-2.5 text-xs text-zinc-600 transition-colors hover:border-brand-primary hover:text-brand-primary dark:border-zinc-700 dark:text-zinc-400"
        onClick={() => {
          chrome.windows.getCurrent((win) => {
            if (win.id !== undefined) {
              chrome.sidePanel.open({ windowId: win.id });
              window.close();
            }
          });
        }}
      >
        📥 즐겨찾기 한번에 가져오기
      </button>

      <button
        className="w-full cursor-pointer rounded-xl border border-zinc-200 bg-transparent py-2.5 text-xs text-zinc-600 transition-colors hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600"
        onClick={async () => {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session) {
            const params = new URLSearchParams({
              access_token: session.access_token,
              refresh_token: session.refresh_token ?? "",
            });
            chrome.tabs.create({ url: `${WEB_URL}/auth/web-redirect#${params.toString()}` });
          } else {
            chrome.tabs.create({ url: `${WEB_URL}/` });
          }
        }}
      >
        앱에서 보기 →
      </button>
    </div>
  );
}
