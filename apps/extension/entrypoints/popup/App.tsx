import React, { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

type AuthMode = "login" | "signup";

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
      <div style={styles.container}>
        <div style={styles.center}>
          <p style={{ color: "#999", fontSize: 13 }}>로딩 중...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>SmartMark</h1>
        <div style={styles.userBox}>
          <p style={styles.userEmail}>{user.email}</p>
          <p style={{ fontSize: 12, color: "#999", marginTop: 2 }}>로그인됨</p>
        </div>
        <button style={styles.logoutBtn} onClick={handleLogout}>
          로그아웃
        </button>
      </div>
    );
  }

  if (signupDone) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>SmartMark</h1>
        <div style={styles.center}>
          <p style={{ fontSize: 14, color: "#333", marginBottom: 8 }}>이메일을 확인해주세요</p>
          <p style={{ fontSize: 12, color: "#999" }}>{email}으로 인증 링크를 보냈습니다.</p>
          <button
            style={{ ...styles.linkBtn, marginTop: 16 }}
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
    <div style={styles.container}>
      <h1 style={styles.title}>SmartMark</h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          style={styles.input}
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          style={styles.input}
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p style={styles.error}>{error}</p>}

        <button style={styles.primaryBtn} type="submit" disabled={submitting}>
          {submitting ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
        </button>
      </form>

      <div style={styles.divider}>
        <div style={styles.dividerLine} />
        <span style={styles.dividerText}>또는</span>
        <div style={styles.dividerLine} />
      </div>

      <button style={styles.googleBtn} onClick={handleGoogleLogin}>
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
        style={styles.linkBtn}
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

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: 300,
    padding: "20px 16px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: 800, color: "#111", margin: 0, textAlign: "center" },
  center: { textAlign: "center", padding: "16px 0" },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #e4e4e7",
    borderRadius: 10,
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
  },
  primaryBtn: {
    width: "100%",
    padding: 11,
    backgroundColor: "#18181b",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  googleBtn: {
    width: "100%",
    padding: 10,
    backgroundColor: "#fff",
    color: "#333",
    border: "1px solid #e4e4e7",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoutBtn: {
    width: "100%",
    padding: 10,
    backgroundColor: "#f4f4f5",
    color: "#333",
    border: "none",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  linkBtn: {
    background: "none",
    border: "none",
    color: "#6366f1",
    fontSize: 12,
    cursor: "pointer",
    textAlign: "center",
    padding: 0,
  },
  divider: { display: "flex", alignItems: "center", gap: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e4e4e7" },
  dividerText: { fontSize: 11, color: "#a1a1aa" },
  userBox: { backgroundColor: "#f4f4f5", borderRadius: 10, padding: "12px 14px" },
  userEmail: { fontSize: 13, fontWeight: 600, color: "#111", margin: 0 },
  error: { fontSize: 12, color: "#ef4444", margin: 0 },
};
