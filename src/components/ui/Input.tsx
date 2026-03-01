import React, { InputHTMLAttributes, useId, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  label?: string;
  hideLabel?: boolean;
  error?: string;
}

/**
 * @description 공통 입력 필드 컴포넌트 (Zod 에러 메시지 지원)
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ icon, label, hideLabel = true, error, className = '', ...props }, ref) => {
    const id = useId();
    const hasError = !!error;

    return (
      <div className="relative w-full space-y-1.5">
        {label && (
          <label 
            htmlFor={id} 
            className={hideLabel ? 'sr-only' : 'block text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1'}
          >
            {label}
          </label>
        )}
        <div className="relative group">
          {icon && (
            <div className={`pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 transition-colors ${hasError ? 'text-red-400' : 'text-zinc-400 group-focus-within:text-indigo-500'}`}>
              {icon}
            </div>
          )}
          <input
            id={id}
            ref={ref}
            {...props}
            className={`
              block w-full rounded-2xl border-2 
              bg-zinc-50 py-3 ${icon ? 'pl-11' : 'pl-4'} pr-4 
              text-sm text-zinc-900 placeholder-zinc-400
              transition-all outline-none
              ${hasError 
                ? 'border-red-100 bg-red-50/30 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                : 'border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
              }
              dark:bg-zinc-800/50 dark:text-zinc-100 dark:placeholder-zinc-500
              ${hasError 
                ? 'dark:border-red-900/30 dark:bg-red-900/10 dark:focus:border-red-500' 
                : 'dark:focus:bg-zinc-900 dark:focus:border-indigo-400'
              }
              ${className}
            `}
          />
        </div>
        {hasError && (
          <p className="text-xs font-semibold text-red-500 dark:text-red-400 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
