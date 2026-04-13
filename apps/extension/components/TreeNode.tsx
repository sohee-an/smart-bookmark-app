import { useState } from "react";

export interface BookmarkNode {
  id: string;
  title: string;
  url?: string;
  children?: BookmarkNode[];
  checked: boolean;
}

export function TreeNode({
  node,
  depth,
  onToggle,
}: {
  node: BookmarkNode;
  depth: number;
  onToggle: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const isFolder = !node.url;

  return (
    <div>
      <div
        className="flex items-center py-1 pr-2 hover:bg-zinc-50"
        style={{ paddingLeft: 8 + depth * 16 }}
      >
        <input
          type="checkbox"
          checked={node.checked}
          onChange={() => onToggle(node.id)}
          className="mr-1.5 shrink-0 cursor-pointer"
        />
        {isFolder && (
          <button
            className="shrink-0 cursor-pointer border-none bg-transparent px-1 text-xs text-zinc-400"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "▾" : "▸"}
          </button>
        )}
        <span
          className={`flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs ${
            isFolder ? "cursor-pointer font-semibold text-zinc-900" : "text-zinc-500"
          }`}
          onClick={isFolder ? () => setExpanded((v) => !v) : undefined}
          title={node.url ?? node.title}
        >
          {isFolder ? "📁 " : ""}
          {node.title}
        </span>
      </div>

      {isFolder && expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  );
}
