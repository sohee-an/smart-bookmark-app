import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/shared/api/supabase';
import { Input } from '@/components/ui/Input';
import { MailIcon, LockIcon } from '@/shared/ui/icons';
import { authSchema, AuthFormData } from '@/features/auth/model/auth-schema';

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
    mode: 'onBlur',
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
        alert('회원가입 확인 메일을 확인해주세요!');
      }
      router.push('/');
    } catch (err: any) {
      setServerError(err.message || '인증에 실패했습니다.');
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setServerError(null);
    reset();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-base dark:bg-surface-base-dark px-4">
      <Head>
        <title>{isLogin ? '로그인' : '회원가입'} | SmartMark</title>
      </Head>

      <div className="max-w-md w-full space-y-8 bg-surface-card dark:bg-surface-card-dark p-8 rounded-3xl shadow-xl border border-zinc-200 dark:border-zinc-800">
        <div className="text-center">
          <h1 className="text-3xl font-black text-brand-primary transition-colors">
            SmartMark
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400 font-medium">
            {isLogin ? '돌아오신 것을 환영합니다!' : '나만의 똑똑한 북마크를 시작하세요'}
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <Input
              label="이메일"
              type="email"
              placeholder="example@email.com"
              icon={<MailIcon />}
              {...register('email')}
              error={errors.email?.message}
              required
            />
            
            <Input
              label="비밀번호"
              type="password"
              placeholder="••••••••"
              icon={<LockIcon />}
              {...register('password')}
              error={errors.password?.message}
              required
            />

            {!isLogin && (
              <Input
                label="비밀번호 확인"
                type="password"
                placeholder="••••••••"
                icon={<LockIcon />}
                {...register('confirmPassword')}
                error={errors.confirmPassword?.message}
                required
              />
            )}
          </div>

          {serverError && (
            <div className="text-status-error text-sm bg-status-error/5 p-4 rounded-2xl border border-status-error/20 animate-shake">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-lg text-base font-bold text-white bg-brand-primary hover:bg-brand-primary-hover focus:outline-none focus:ring-4 focus:ring-brand-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
               <span className="flex items-center gap-2">
                 <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                 </svg>
                 처리 중...
               </span>
            ) : (isLogin ? '로그인' : '회원가입')}
          </button>
        </form>

        <div className="text-center mt-6">
          <button
            onClick={toggleMode}
            className="text-sm font-semibold text-brand-primary hover:opacity-80 cursor-pointer transition-all"
          >
            {isLogin ? '아직 계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
          </button>
        </div>
      </div>
    </div>
  );
}
