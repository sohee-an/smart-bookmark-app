import React, { InputHTMLAttributes, forwardRef } from "react";
import { InputPrimitive } from "./input.primitive";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  label?: string;
  hideLabel?: boolean;
  error?: string;
  inputSize?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "py-1.5 text-xs",
  md: "py-2.5 text-sm",
  lg: "py-3.5 text-base",
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ icon, label, hideLabel = true, error, inputSize = "md", className = "", ...props }, ref) => {
    const hasError = !!error;

    return (
      <InputPrimitive.Root
        hasError={hasError}
        hasIcon={!!icon}
        className="relative w-full space-y-1"
      >
        <InputPrimitive.Label
          hidden={hideLabel}
          className={
            hideLabel ? "sr-only" : "ml-1 block text-sm font-bold text-zinc-700 dark:text-zinc-300"
          }
        >
          {label}
        </InputPrimitive.Label>

        <div className="group relative">
          {icon && (
            <InputPrimitive.Icon
              className={`pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 transition-colors ${
                hasError
                  ? "text-status-error"
                  : "group-focus-within:text-brand-primary text-zinc-400"
              } `}
            >
              {icon}
            </InputPrimitive.Icon>
          )}

          <InputPrimitive.Field
            ref={ref}
            className={`block w-full rounded-2xl border-2 bg-zinc-50 ${icon ? "pl-11" : "pl-4"} pr-4 text-zinc-900 placeholder-zinc-400 transition-all outline-none ${sizeClasses[inputSize]} ${
              hasError
                ? "border-status-error/10 bg-status-error/5 focus:border-status-error focus:ring-status-error/10 focus:ring-4"
                : "focus:border-brand-primary focus:ring-brand-primary/10 border-transparent focus:bg-white focus:ring-4"
            } dark:bg-zinc-800/50 dark:text-zinc-100 dark:placeholder-zinc-500 ${
              hasError
                ? "dark:border-status-error/20 dark:bg-status-error/10 dark:focus:border-status-error"
                : "dark:focus:border-brand-primary dark:focus:bg-zinc-900"
            } ${className} `}
            {...props}
          />
        </div>

        <InputPrimitive.Error className="text-status-error animate-in fade-in slide-in-from-top-1 ml-1 text-xs font-semibold duration-200">
          {error}
        </InputPrimitive.Error>
      </InputPrimitive.Root>
    );
  }
);

Input.displayName = "Input";
