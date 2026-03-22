import React, { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/shared/api/supabase";
import { Input } from "@/shared/ui/input/Input";
import { MailIcon, LockIcon } from "@smart-bookmark/ui/icons";
import { authSchema, AuthFormData } from "@/features/auth/model/auth-schema";

/**
 * @description 사용자 인증 페이지 (디자인 토큰 적용)
 */
export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: AuthFormData) => {
    setServerError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (error) throw error;
      } else {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
        });
        if (error) throw error;

        // 이메일 인증이 켜져 있으면 session이 null로 옴
        // if (!signUpData.session) {
        //   alert("회원가입 확인 메일을 확인해주세요!");
        //   return;
        // }
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

  return (
    <div className="bg-surface-base dark:bg-surface-base-dark flex min-h-screen items-center justify-center px-4">
      <Head>
        <title>{isLogin ? "로그인" : "회원가입"} | SmartMark</title>
      </Head>

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
              {...register("password")}
              error={errors.password?.message}
              required
            />

            {!isLogin && (
              <Input
                label="비밀번호 확인"
                type="password"
                placeholder="••••••••"
                icon={<LockIcon />}
                {...register("confirmPassword")}
                error={errors.confirmPassword?.message}
                required
              />
            )}
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

        <div className="mt-6 text-center">
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
