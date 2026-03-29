import React, { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

const WEB_URL = import.meta.env.VITE_WEB_URL as string;

interface BookmarkNode {
  id: string;
  title: string;
  url?: string;
  children?: BookmarkNode[];
  checked: boolean;
}

type ImportStatus = "idle" | "importing" | "done" | "error";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={styles.container}>
        <p style={{ color: "#999", fontSize: 13, textAlign: "center" }}>로딩 중...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>SmartMark</h1>
        <p style={{ fontSize: 13, color: "#666", textAlign: "center", lineHeight: 1.6 }}>
          브라우저 북마크를 가져오려면 먼저 로그인이 필요합니다.
        </p>
        <button
          style={styles.primaryBtn}
          onClick={() => {
            chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
              if (tab?.id) chrome.storage.local.set({ returnToTabId: tab.id });
              chrome.tabs.create({ url: `${WEB_URL}/login?from=extension` });
            });
          }}
        >
          로그인하기
        </button>
      </div>
    );
  }

  return <ImportView user={user} />;
}

function ImportView({ user }: { user: User }) {
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

      // 루트 노드(id=0)는 숨기고 하위 항목(즐겨찾기 바, 기타 즐겨찾기)부터 표시
      const children = rawTree[0]?.children ?? [];
      setTree(convert(children));
      setTreeLoading(false);
    });
  }, []);

  const toggleNode = (id: string, nodes: BookmarkNode[]): BookmarkNode[] =>
    nodes.map((node) => {
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

  const setAllChecked = (nodes: BookmarkNode[], checked: boolean): BookmarkNode[] =>
    nodes.map((n) => ({
      ...n,
      checked,
      children: n.children ? setAllChecked(n.children, checked) : undefined,
    }));

  const isValidUrl = (url: string) => url.startsWith("http://") || url.startsWith("https://");

  const collectSelected = (nodes: BookmarkNode[]): string[] => {
    const urls: string[] = [];
    for (const node of nodes) {
      if (node.url && node.checked && isValidUrl(node.url)) urls.push(node.url);
      if (node.children) urls.push(...collectSelected(node.children));
    }
    return urls;
  };

  const countBookmarks = (nodes: BookmarkNode[]): number =>
    nodes.reduce((acc, n) => {
      if (n.url) return acc + 1;
      return acc + (n.children ? countBookmarks(n.children) : 0);
    }, 0);

  const selectedUrls = collectSelected(tree);
  const allChecked = tree.length > 0 && tree.every((n) => n.checked);

  const handleToggleAll = () => {
    setTree((prev) => setAllChecked(prev, !allChecked));
  };

  const handleImport = async () => {
    if (selectedUrls.length === 0) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    setStatus("importing");
    setProgress({ current: 0, total: selectedUrls.length });
    setErrorCount(0);

    let errors = 0;
    for (let i = 0; i < selectedUrls.length; i++) {
      try {
        const res = await fetch(`${WEB_URL}/api/extension/save-bookmark`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ url: selectedUrls[i] }),
        });
        if (!res.ok) errors++;
      } catch {
        errors++;
      }
      setProgress({ current: i + 1, total: selectedUrls.length });
    }

    setErrorCount(errors);
    setStatus(errors === selectedUrls.length ? "error" : "done");
  };

  if (treeLoading) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>SmartMark</h1>
        <p style={{ color: "#999", fontSize: 13, textAlign: "center" }}>북마크 불러오는 중...</p>
      </div>
    );
  }

  if (status === "importing") {
    const pct = Math.round((progress.current / progress.total) * 100);
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>SmartMark</h1>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#111", textAlign: "center" }}>
          가져오는 중...
        </p>
        <p style={{ fontSize: 12, color: "#888", textAlign: "center" }}>
          {progress.current} / {progress.total}
        </p>
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressBar, width: `${pct}%` }} />
        </div>
        <p style={{ fontSize: 11, color: "#aaa", textAlign: "center" }}>{pct}%</p>
      </div>
    );
  }

  if (status === "done") {
    const successCount = progress.total - errorCount;
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>SmartMark</h1>
        <div style={styles.successBox}>
          저장 완료! {successCount}개 저장, AI가 분석 중이에요.
          {errorCount > 0 && <span style={{ color: "#ef4444" }}> ({errorCount}개 실패)</span>}
        </div>
        <button
          style={styles.secondaryBtn}
          onClick={() => {
            setStatus("idle");
            setTree((prev) => setAllChecked(prev, false));
          }}
        >
          더 가져오기
        </button>
        <button
          style={styles.primaryBtn}
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
    <div style={styles.container}>
      <h1 style={styles.title}>SmartMark</h1>
      <p style={{ fontSize: 12, color: "#888", margin: "0 0 8px" }}>{user.email}</p>

      <div style={styles.header}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>
          브라우저 북마크 가져오기
        </span>
        <button style={styles.toggleAllBtn} onClick={handleToggleAll}>
          {allChecked ? "전체 해제" : "전체 선택"}
        </button>
      </div>

      <div style={styles.treeContainer}>
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
        <div style={styles.errorBox}>저장에 실패했습니다. 다시 시도해주세요.</div>
      )}

      <button
        style={{
          ...styles.primaryBtn,
          opacity: selectedUrls.length === 0 ? 0.4 : 1,
        }}
        disabled={selectedUrls.length === 0}
        onClick={handleImport}
      >
        선택한 {selectedUrls.length}개 가져오기
      </button>
    </div>
  );
}

function TreeNode({
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
        style={{
          ...styles.treeRow,
          paddingLeft: 8 + depth * 16,
        }}
      >
        <input
          type="checkbox"
          checked={node.checked}
          onChange={() => onToggle(node.id)}
          style={{ marginRight: 6, cursor: "pointer", flexShrink: 0 }}
        />
        {isFolder && (
          <button style={styles.expandBtn} onClick={() => setExpanded((v) => !v)}>
            {expanded ? "▾" : "▸"}
          </button>
        )}
        <span
          style={{
            fontSize: 12,
            color: isFolder ? "#111" : "#444",
            fontWeight: isFolder ? 600 : 400,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            cursor: isFolder ? "pointer" : "default",
          }}
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

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "16px 14px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minHeight: "100vh",
    boxSizing: "border-box",
  },
  title: {
    fontSize: 18,
    fontWeight: 800,
    color: "#111",
    margin: 0,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  treeContainer: {
    flex: 1,
    overflowY: "auto",
    border: "1px solid #e4e4e7",
    borderRadius: 10,
    padding: "6px 0",
    maxHeight: "calc(100vh - 220px)",
  },
  treeRow: {
    display: "flex",
    alignItems: "center",
    padding: "4px 8px",
    cursor: "default",
  },
  expandBtn: {
    background: "none",
    border: "none",
    padding: "0 4px 0 0",
    cursor: "pointer",
    fontSize: 10,
    color: "#888",
    flexShrink: 0,
  },
  toggleAllBtn: {
    background: "none",
    border: "1px solid #e4e4e7",
    borderRadius: 6,
    padding: "3px 8px",
    fontSize: 11,
    cursor: "pointer",
    color: "#555",
  },
  primaryBtn: {
    width: "100%",
    padding: 11,
    backgroundColor: "#18181b",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  secondaryBtn: {
    width: "100%",
    padding: 10,
    backgroundColor: "#f4f4f5",
    color: "#555",
    border: "none",
    borderRadius: 10,
    fontSize: 12,
    cursor: "pointer",
  },
  progressTrack: {
    width: "100%",
    height: 6,
    backgroundColor: "#e4e4e7",
    borderRadius: 99,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#18181b",
    borderRadius: 99,
    transition: "width 0.2s ease",
  },
  successBox: {
    fontSize: 13,
    color: "#16a34a",
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    padding: "10px 12px",
  },
  errorBox: {
    fontSize: 13,
    color: "#dc2626",
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: "10px 12px",
  },
};
