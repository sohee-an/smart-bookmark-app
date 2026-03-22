import { X } from "lucide-react";

interface TagFilterProps {
  tags: string[];
  onRemove: (tag: string) => void;
}

export const TagFilter = ({ tags, onRemove }: TagFilterProps) => {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          #{tag}
          <button
            onClick={() => onRemove(tag)}
            className="rounded-full p-0.5 transition-colors hover:bg-white/20 dark:hover:bg-zinc-900/20"
            aria-label={`${tag} 태그 제거`}
          >
            <X size={11} />
          </button>
        </span>
      ))}
    </div>
  );
};
