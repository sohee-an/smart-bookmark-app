import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { TreeNode } from "./TreeNode";
import type { BookmarkNode } from "./TreeNode";

const WEB_URL = import.meta.env.VITE_WEB_URL as string;
const BATCH_SIZE = 5;

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
  for (const node of nodes) {
    if (node.url && node.checked && node.url.startsWith("http")) {
      items.push({ url: node.url, title: node.title });
    }
    if (node.children) items.push(...collectSelected(node.children));
  }
  return items;
}

export function ImportView({ user }: { user: User }) {
  const [tree, setTree] = useState<BookmarkNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [errorCount, setErrorCount] = useState(0);

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
    setProgress({ current: 0, total: selectedItems.length });
    setErrorCount(0);

    let errors = 0;
    let completed = 0;

    for (let i = 0; i < selectedItems.length; i += BATCH_SIZE) {
      const batch = selectedItems.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async ({ url, title }) => {
          try {
            const res = await fetch(`${WEB_URL}/api/extension/save-bookmark`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ url, title }),
            });
            if (!res.ok) errors++;
          } catch {
            errors++;
          }
          completed++;
        })
      );

      setProgress({ current: completed, total: selectedItems.length });
      setErrorCount(errors);
    }

    setStatus(errors === selectedItems.length ? "error" : "done");
  };

  if (treeLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <p className="text-sm text-zinc-400">북마크 불러오는 중...</p>
      </div>
    );
  }

  if (status === "importing") {
    const pct = Math.round((progress.current / progress.total) * 100);
    return (
      <div className="flex flex-1 flex-col justify-center gap-3">
        <p className="text-center text-sm font-semibold text-zinc-900">가져오는 중...</p>
        <p className="text-center text-xs text-zinc-400">
          {progress.current} / {progress.total}
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-zinc-900 transition-all duration-200"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-center text-xs text-zinc-400">{pct}%</p>
      </div>
    );
  }

  if (status === "done") {
    const successCount = progress.total - errorCount;
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-xl bg-green-50 px-3 py-2.5 text-sm text-green-700">
          저장 완료! {successCount}개 저장, AI가 분석 중이에요.
          {errorCount > 0 && <span className="text-red-500"> ({errorCount}개 실패)</span>}
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
