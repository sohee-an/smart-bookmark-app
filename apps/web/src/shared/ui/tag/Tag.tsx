import { HTMLAttributes, KeyboardEvent } from "react";
import { X, Plus, Tag as TagIcon } from "lucide-react";
import { TagPrimitive } from "@smart-bookmark/ui/tag";

interface TagGroupProps extends HTMLAttributes<HTMLDivElement> {
  tags: string[];
  editable?: boolean;
  tagInput?: string;
  onTagInputChange?: (value: string) => void;
  onTagAdd?: () => void;
  onTagRemove?: (tag: string) => void;
  showLabel?: boolean;
  maxVisible?: number;
}

export const TagGroup = ({
  tags,
  editable = false,
  tagInput = "",
  onTagInputChange,
  onTagAdd,
  onTagRemove,
  showLabel = true,
  maxVisible,
  className = "",
  ...props
}: TagGroupProps) => {
  const visibleTags = maxVisible ? tags.slice(0, maxVisible) : tags;

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onTagAdd?.();
    }
  };

  return (
    <TagPrimitive.Root editable={editable} className={`space-y-1.5 ${className}`} {...props}>
      {showLabel && (
        <div className="flex items-center gap-1.5">
          <TagIcon size={11} className="text-zinc-400 dark:text-zinc-500" />
          <span className="text-xs font-bold tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
            태그
          </span>
        </div>
      )}

      <TagPrimitive.List className="flex flex-wrap gap-2">
        {visibleTags.map((tag) => (
          <TagPrimitive.Item
            key={tag}
            value={tag}
            className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          >
            #{tag}
            <TagPrimitive.RemoveButton
              tag={tag}
              onClick={() => onTagRemove?.(tag)}
              className="ml-0.5 text-zinc-400 transition-colors hover:text-red-400"
            >
              <X size={12} />
            </TagPrimitive.RemoveButton>
          </TagPrimitive.Item>
        ))}

        {tags.length === 0 && !editable && (
          <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-300 italic dark:text-zinc-600">
            <TagIcon size={10} />
            <span>NO TAGS</span>
          </div>
        )}

        {editable && (
          <div className="flex items-center gap-1">
            <TagPrimitive.Input
              value={tagInput}
              onChange={(e) => onTagInputChange?.(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="태그 추가..."
              className="w-24 rounded-lg border border-dashed border-zinc-300 bg-transparent px-2 py-1 text-xs text-zinc-700 outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-600 dark:text-zinc-200"
            />
            <TagPrimitive.AddButton
              onClick={onTagAdd}
              className="rounded-lg p-1 text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              <Plus size={14} />
            </TagPrimitive.AddButton>
          </div>
        )}
      </TagPrimitive.List>
    </TagPrimitive.Root>
  );
};
