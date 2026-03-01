import React, { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/shared/api/supabase";
import { Input } from "@/components/ui/Input";
import { MailIcon, LockIcon } from "@/shared/ui/icons";

const authSchema = z
  .object({
    email: z.string().email("유효한 이메일 형식을 입력해주세요."),
    password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다."),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      // 회원가입 모드일 때만 비밀번호 일치 확인
      if (data.confirmPassword !== undefined && data.password !== data.confirmPassword) {
        return false;
      }
      return true;
    },
    {
      message: "비밀번호가 일치하지 않습니다.",
      path: ["confirmPassword"],
    }
  );

type AuthFormData = z.infer<typeof authSchema>;

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
        const { error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
        });
        if (error) throw error;
        alert("회원가입 확인 메일을 확인해주세요!");
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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <Head>
        <title>{isLogin ? "로그인" : "회원가입"} | SmartMark</title>
      </Head>

      <div className="w-full max-w-md space-y-8 rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-center">
          <h1 className="text-3xl font-black text-indigo-600 dark:text-indigo-400">SmartMark</h1>
          <p className="mt-2 font-medium text-zinc-600 dark:text-zinc-400">
            {isLogin ? "돌아오신 것을 환영합니다!" : "나만의 똑똑한 북마크를 시작하세요"}
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <Input
                label="이메일"
                type="email"
                placeholder="example@email.com"
                icon={<MailIcon />}
                {...register("email")}
                error={errors.email?.message}
                required
              />
            </div>

            <div>
              <Input
                label="비밀번호"
                type="password"
                placeholder="••••••••"
                icon={<LockIcon />}
                {...register("password")}
                error={errors.password?.message}
                required
              />
            </div>

            {!isLogin && (
              <div>
                <Input
                  label="비밀번호 확인"
                  type="password"
                  placeholder="••••••••"
                  icon={<LockIcon />}
                  {...register("confirmPassword")}
                  error={errors.confirmPassword?.message}
                  required
                />
              </div>
            )}
          </div>

          {serverError && (
            <div className="animate-shake rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-500 dark:border-red-900/50 dark:bg-red-900/10">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full cursor-pointer justify-center rounded-2xl border border-transparent bg-indigo-600 px-4 py-4 text-base font-bold text-white shadow-lg transition-all hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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
            className="cursor-pointer text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            {isLogin ? "아직 계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
          </button>
        </div>
      </div>
    </div>
  );
}
