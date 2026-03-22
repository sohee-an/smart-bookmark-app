import React, {
  HTMLAttributes,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  createContext,
  useContext,
  useId,
} from "react";

// ─── Context ───────────────────────────────────────
interface TagContextValue {
  id: string;
  editable: boolean;
}

const TagContext = createContext<TagContextValue | null>(null);

function useTagContext() {
  const ctx = useContext(TagContext);
  if (!ctx) throw new Error("Tag primitive 컴포넌트는 Tag.Root 안에서 사용해야 합니다.");
  return ctx;
}

// ─── Root ───────────────────────────────────────────
interface TagRootProps extends HTMLAttributes<HTMLDivElement> {
  editable?: boolean;
}

function TagRoot({ children, editable = false, ...props }: TagRootProps) {
  const id = useId();

  return (
    <TagContext.Provider value={{ id, editable }}>
      <div data-editable={editable} {...props}>
        {children}
      </div>
    </TagContext.Provider>
  );
}

// ─── List ───────────────────────────────────────────
function TagList({ children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div role="list" aria-label="태그 목록" {...props}>
      {children}
    </div>
  );
}

// ─── Item ───────────────────────────────────────────
interface TagItemProps extends HTMLAttributes<HTMLSpanElement> {
  value: string;
}

function TagItem({ value, children, ...props }: TagItemProps) {
  const { editable } = useTagContext();

  return (
    <span role="listitem" data-editable={editable} data-tag-value={value} {...props}>
      {children}
    </span>
  );
}

// ─── RemoveButton ────────────────────────────────────
interface TagRemoveButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tag: string;
}

function TagRemoveButton({ tag, children, ...props }: TagRemoveButtonProps) {
  const { editable } = useTagContext();

  if (!editable) return null;

  return (
    <button type="button" aria-label={`${tag} 태그 제거`} data-tag-remove="" {...props}>
      {children}
    </button>
  );
}

TagRemoveButton.displayName = "TagRemoveButton";

// ─── Input ───────────────────────────────────────────
function TagInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { editable } = useTagContext();

  if (!editable) return null;

  return <input type="text" data-tag-input="" aria-label="새 태그 입력" {...props} />;
}

// ─── AddButton ──────────────────────────────────────
function TagAddButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { editable } = useTagContext();

  if (!editable) return null;

  return (
    <button type="button" aria-label="태그 추가" data-tag-add="" {...props}>
      {children}
    </button>
  );
}

// ─── Export ────────────────────────────────────────
export const TagPrimitive = {
  Root: TagRoot,
  List: TagList,
  Item: TagItem,
  RemoveButton: TagRemoveButton,
  Input: TagInput,
  AddButton: TagAddButton,
};
