// components/ui/input/input.primitive.tsx
import React, {
  InputHTMLAttributes,
  HTMLAttributes,
  LabelHTMLAttributes,
  useId,
  forwardRef,
  createContext,
  useContext,
} from "react";

// ─── Context ───────────────────────────────────────
interface InputContextValue {
  id: string;
  hasError: boolean;
  hasIcon: boolean;
}

const InputContext = createContext<InputContextValue | null>(null);

function useInputContext() {
  const ctx = useContext(InputContext);
  if (!ctx) throw new Error("Input primitive 컴포넌트는 Input.Root 안에서 사용해야 합니다.");
  return ctx;
}

// ─── Root ──────────────────────────────────────────
interface InputRootProps extends HTMLAttributes<HTMLDivElement> {
  hasError?: boolean;
  hasIcon?: boolean;
}

function InputRoot({ children, hasError = false, hasIcon = false, ...props }: InputRootProps) {
  const id = useId();

  return (
    <InputContext.Provider value={{ id, hasError, hasIcon }}>
      <div {...props}>{children}</div>
    </InputContext.Provider>
  );
}

// ─── Label ─────────────────────────────────────────
interface InputLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  hidden?: boolean;
}

function InputLabel({ hidden = false, children, ...props }: InputLabelProps) {
  const { id } = useInputContext();

  if (!children) return null;

  return (
    <label htmlFor={id} data-hidden={hidden} {...props}>
      {children}
    </label>
  );
}

// ─── Icon ──────────────────────────────────────────
function InputIcon({ children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div aria-hidden="true" data-input-icon="" {...props}>
      {children}
    </div>
  );
}

// ─── Field ─────────────────────────────────────────
const InputField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  (props, ref) => {
    const { id, hasError, hasIcon } = useInputContext();
    const errorId = `${id}-error`;

    return (
      <input
        id={id}
        ref={ref}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        data-has-icon={hasIcon}
        data-error={hasError}
        {...props}
      />
    );
  }
);

InputField.displayName = "InputField";

// ─── ErrorMessage ──────────────────────────────────
function InputError({ children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  const { id, hasError } = useInputContext();
  const errorId = `${id}-error`;

  if (!hasError || !children) return null;

  return (
    <p
      id={errorId}
      role="alert" // 스크린리더가 즉시 읽음
      aria-live="polite" // 에러 생기면 스크린리더에 알림
      {...props}
    >
      {children}
    </p>
  );
}

// ─── Export ────────────────────────────────────────
export const InputPrimitive = {
  Root: InputRoot,
  Label: InputLabel,
  Icon: InputIcon,
  Field: InputField,
  Error: InputError,
};
