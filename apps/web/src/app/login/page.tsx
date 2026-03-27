"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/shared/api/supabase/client";
import { Input } from "@/shared/ui/input/Input";
import { MailIcon, LockIcon } from "@smart-bookmark/ui/icons";
import { authSchema, AuthFormData } from "@/features/auth/model/auth-schema";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromExtension = searchParams.get("from") === "extension";
  const [isLogin, setIsLogin] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    mode: "onBlur",
  });

  const handleGoogleLogin = async () => {
    setServerError(null);
    const redirectTo = fromExtension
      ? `${window.location.origin}/auth/callback?from=extension`
      : `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) setServerError(error.message);
  };

  const onSubmit = async (data: AuthFormData) => {
    setServerError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (error) {
          if (error.message.toLowerCase().includes("email not confirmed")) {
            setServerError("이메일 인증이 완료되지 않았습니다. 받은 편지함을 확인해주세요.");
            return;
          }
          throw error;
        }
      } else {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
        });
        if (error) throw error;

        if (!signUpData.session) {
          setPendingEmail(data.email);
          return;
        }
      }
      router.push("/");
    } catch (err: any) {
      setServerError(err.message || "인증에 실패했습니다.");
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setServerError(null);
    reset();
  };

  if (pendingEmail) {
    return (
      <div className="bg-surface-base dark:bg-surface-base-dark flex min-h-screen items-center justify-center px-4">
        <div className="bg-surface-card dark:bg-surface-card-dark w-full max-w-md space-y-6 rounded-3xl border border-zinc-200 p-8 text-center shadow-xl dark:border-zinc-800">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <svg
              className="h-8 w-8 text-zinc-600 dark:text-zinc-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-black text-zinc-900 dark:text-white">
              이메일을 확인해주세요
            </h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">{pendingEmail}</span>
              으로 인증 링크를 보냈습니다.
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              링크를 클릭하면 자동으로 로그인됩니다.
            </p>
          </div>
          <button
            onClick={() => {
              setPendingEmail(null);
              setIsLogin(true);
            }}
            className="text-brand-primary cursor-pointer text-sm font-semibold hover:opacity-80"
          >
            로그인 화면으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-base dark:bg-surface-base-dark flex min-h-screen items-center justify-center px-4">
      <div className="bg-surface-card dark:bg-surface-card-dark w-full max-w-md space-y-8 rounded-3xl border border-zinc-200 p-8 shadow-xl dark:border-zinc-800">
        <div className="text-center">
          <h1 className="text-brand-primary text-3xl font-black transition-colors">SmartMark</h1>
          <p className="mt-2 font-medium text-zinc-600 dark:text-zinc-400">
            {isLogin ? "돌아오신 것을 환영합니다!" : "나만의 똑똑한 북마크를 시작하세요"}
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <Input
              label="이메일"
              type="email"
              placeholder="example@email.com"
              icon={<MailIcon />}
              {...register("email")}
              error={errors.email?.message}
              required
            />

            <Input
              label="비밀번호"
              type="password"
              placeholder="••••••••"
              icon={<LockIcon />}
              showPasswordToggle
              {...register("password")}
              error={errors.password?.message}
              required
            />
          </div>

          {serverError && (
            <div className="text-status-error bg-status-error/5 border-status-error/20 animate-shake rounded-2xl border p-4 text-sm">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-brand-primary hover:bg-brand-primary-hover focus:ring-brand-primary/20 flex w-full cursor-pointer justify-center rounded-2xl border border-transparent px-4 py-4 text-base font-bold text-white shadow-lg transition-all focus:ring-4 focus:outline-none active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                처리 중...
              </span>
            ) : isLogin ? (
              "로그인"
            ) : (
              "회원가입"
            )}
          </button>
        </form>

        <div className="relative my-2 flex items-center">
          <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700" />
          <span className="mx-3 text-xs text-zinc-400">또는</span>
          <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-sm font-semibold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 active:scale-[0.98] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
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

        <div className="mt-4 text-center">
          <button
            onClick={toggleMode}
            className="text-brand-primary cursor-pointer text-sm font-semibold transition-all hover:opacity-80"
          >
            {isLogin ? "아직 계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
          </button>
        </div>
      </div>
    </div>
  );
}
