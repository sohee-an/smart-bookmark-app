import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { TreeNode } from "./TreeNode";
import type { BookmarkNode } from "./TreeNode";

const WEB_URL = import.meta.env.VITE_WEB_URL as string;

type ImportStatus = "idle" | "importing" | "done" | "error";

function setAllChecked(nodes: BookmarkNode[], checked: boolean): BookmarkNode[] {
  return nodes.map((n) => ({
    ...n,
    checked,
    children: n.children ? setAllChecked(n.children, checked) : undefined,
  }));
}

function toggleNode(id: string, nodes: BookmarkNode[]): BookmarkNode[] {
  return nodes.map((node) => {
    if (node.id === id) {
      const newChecked = !node.checked;
      return {
        ...node,
        checked: newChecked,
        children: node.children ? setAllChecked(node.children, newChecked) : undefined,
      };
    }
    return { ...node, children: node.children ? toggleNode(id, node.children) : undefined };
  });
}

function collectSelected(nodes: BookmarkNode[]): { url: string; title: string }[] {
  const items: { url: string; title: string }[] = [];
  const seen = new Set<string>();

  function traverse(nodes: BookmarkNode[]) {
    for (const node of nodes) {
      if (node.url && node.checked && node.url.startsWith("http") && !seen.has(node.url)) {
        seen.add(node.url);
        items.push({ url: node.url, title: node.title });
      }
      if (node.children) traverse(node.children);
    }
  }

  traverse(nodes);
  return items;
}

export function ImportView({ user }: { user: User }) {
  const [tree, setTree] = useState<BookmarkNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [result, setResult] = useState({ saved: 0, skipped: 0, failed: 0 });

  useEffect(() => {
    chrome.bookmarks.getTree((rawTree) => {
      const convert = (nodes: chrome.bookmarks.BookmarkTreeNode[]): BookmarkNode[] =>
        nodes.map((n) => ({
          id: n.id,
          title: n.title || "제목 없음",
          url: n.url,
          children: n.children ? convert(n.children) : undefined,
          checked: false,
        }));

      const children = rawTree[0]?.children ?? [];
      setTree(convert(children));
      setTreeLoading(false);
    });
  }, []);

  const selectedItems = collectSelected(tree);
  const allChecked = tree.length > 0 && tree.every((n) => n.checked);

  const handleImport = async () => {
    if (selectedItems.length === 0) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    setStatus("importing");

    try {
      const res = await fetch(`${WEB_URL}/api/extension/bulk-import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ items: selectedItems }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setStatus("error");
        return;
      }

      setResult({ saved: json.saved, skipped: json.skipped, failed: json.failed });
      setStatus(json.saved === 0 && json.failed > 0 ? "error" : "done");
    } catch {
      setStatus("error");
    }
  };

  if (treeLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <p className="text-sm text-zinc-400">북마크 불러오는 중...</p>
      </div>
    );
  }

  if (status === "importing") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <p className="text-center text-sm font-semibold text-zinc-900">가져오는 중...</p>
        <p className="text-center text-xs text-zinc-400">
          {selectedItems.length}개를 저장하고 있어요
        </p>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-xl bg-green-50 px-3 py-2.5 text-sm text-green-700">
          저장 완료! {result.saved}개 저장, AI가 분석 중이에요.
          {result.skipped > 0 && (
            <span className="text-zinc-500"> ({result.skipped}개는 이미 저장됨)</span>
          )}
          {result.failed > 0 && <span className="text-red-500"> ({result.failed}개 실패)</span>}
        </div>
        <button
          className="w-full cursor-pointer rounded-xl border-none bg-zinc-100 py-2.5 text-xs text-zinc-500"
          onClick={() => {
            setStatus("idle");
            setTree((prev) => setAllChecked(prev, false));
          }}
        >
          더 가져오기
        </button>
        <button
          className="w-full cursor-pointer rounded-xl border-none bg-zinc-900 py-2.5 text-sm font-semibold text-white"
          onClick={() => {
            supabase.auth.getSession().then(({ data: { session } }) => {
              if (session) {
                const params = new URLSearchParams({
                  access_token: session.access_token,
                  refresh_token: session.refresh_token ?? "",
                });
                chrome.tabs.create({ url: `${WEB_URL}/auth/web-redirect#${params.toString()}` });
              } else {
                chrome.tabs.create({ url: `${WEB_URL}/` });
              }
            });
          }}
        >
          앱에서 보기 →
        </button>
      </div>
    );
  }

  return (
    <>
      <p className="text-xs text-zinc-400">{user.email}</p>

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-900">브라우저 북마크 가져오기</span>
        <button
          className="cursor-pointer rounded-md border border-zinc-200 bg-transparent px-2 py-1 text-xs text-zinc-500"
          onClick={() => setTree((prev) => setAllChecked(prev, !allChecked))}
        >
          {allChecked ? "전체 해제" : "전체 선택"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto rounded-xl border border-zinc-200 py-1.5">
        {tree.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            depth={0}
            onToggle={(id) => setTree((prev) => toggleNode(id, prev))}
          />
        ))}
      </div>

      {status === "error" && (
        <div className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-600">
          저장에 실패했습니다. 다시 시도해주세요.
        </div>
      )}

      <button
        className="w-full cursor-pointer rounded-xl border-none bg-zinc-900 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        disabled={selectedItems.length === 0}
        onClick={handleImport}
      >
        선택한 {selectedItems.length}개 가져오기
      </button>
    </>
  );
}
