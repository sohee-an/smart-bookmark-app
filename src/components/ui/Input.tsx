import React, { InputHTMLAttributes, useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  label?: string;
  hideLabel?: boolean;
}

export const Input = ({ icon, label, hideLabel = true, className = '', ...props }: InputProps) => {
  const id = useId();
  
  return (
    <div className="relative w-full">
      {label && (
        <label 
          htmlFor={id} 
          className={hideLabel ? 'sr-only' : 'block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1'}
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 dark:text-zinc-500">
            {icon}
          </div>
        )}
        <input
          id={id}
          {...props}
          className={`
            block w-full rounded-full border-0 
            bg-zinc-100 py-2 ${icon ? 'pl-10' : 'pl-4'} pr-4 
            text-sm text-zinc-900 placeholder-zinc-500
            transition-all outline-none
            focus:bg-white focus:ring-2 focus:ring-indigo-500
            dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400 
            dark:focus:bg-zinc-900 dark:focus:ring-indigo-400
            ${className}
          `}
        />
      </div>
    </div>
  );
};
