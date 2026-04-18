import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { OrganizePreview } from "./OrganizePreview";
import type { Category } from "./OrganizePreview";

type RawNode = chrome.bookmarks.BookmarkTreeNode;
type FolderOption = { id: string; title: string; path: string };

// URL → 폴더 경로 목록 (중복 감지용)
function buildDuplicateMap(nodes: RawNode[]): Map<string, string[]> {
  const urlPaths = new Map<string, string[]>();

  function traverse(nodes: RawNode[], path: string) {
    for (const node of nodes) {
      if (node.url) {
        const existing = urlPaths.get(node.url) ?? [];
        urlPaths.set(node.url, [...existing, path]);
      }
      if (node.children) {
        traverse(node.children, path ? `${path} > ${node.title}` : node.title);
      }
    }
  }

  traverse(nodes, "");

  const duplicates = new Map<string, string[]>();
  urlPaths.forEach((paths, url) => {
    if (paths.length > 1) duplicates.set(url, paths);
  });
  return duplicates;
}

// 모든 폴더 평탄화 (이동 대상 목록용)
function getFolderOptions(nodes: RawNode[], path = ""): FolderOption[] {
  const options: FolderOption[] = [];
  for (const node of nodes) {
    if (!node.url) {
      const currentPath = path ? `${path} > ${node.title}` : node.title;
      options.push({ id: node.id, title: node.title, path: currentPath });
      if (node.children) {
        options.push(...getFolderOptions(node.children, currentPath));
      }
    }
  }
  return options;
}

// AI 정리용 북마크 평탄화
const ALLOWED_PROTOCOLS = ["http://", "https://", "chrome://", "file://"];

const LOADING_TIPS = [
  {
    icon: "🔖",
    title: "원클릭 저장",
    desc: "브라우징 중 좋은 글 발견했을 때\n익스텐션 아이콘 한 번만 누르면\n바로 저장돼요.",
  },
  {
    icon: "🤖",
    title: "AI 자동 요약 & 태깅",
    desc: "저장하면 AI가 자동으로 요약하고\n태그를 달아줘요.\n나중에 내용이 기억 안 나도 괜찮아요.",
  },
  {
    icon: "🔍",
    title: "시맨틱 서치",
    desc: '"다이어트 방법"으로 검색하면\n단어가 달라도 비슷한 의미의 글들을\n함께 찾아줘요.',
  },
  {
    icon: "⚠️",
    title: "중복 북마크 감지",
    desc: "같은 URL이 여러 폴더에 저장된 경우\n자동으로 감지해서 알려줘요.",
  },
  {
    icon: "🗂️",
    title: "브라우저 북마크 가져오기",
    desc: "기존 브라우저 북마크를\nSmartMark로 한 번에 가져와서\nAI 요약과 시맨틱 검색을 활용해보세요.",
  },
];

function OrganizeLoadingScreen({ onAbort }: { onAbort: () => void }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % LOADING_TIPS.length);
        setVisible(true);
      }, 350);
    }, 3800);
    return () => clearInterval(interval);
  }, []);

  const tip = LOADING_TIPS[index];

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-6">
      {/* AI 작업 상태 */}
      <div className="flex w-full flex-col items-center gap-2.5">
        <div className="relative flex items-center justify-center">
          <div className="h-14 w-14 animate-spin rounded-full border-[3px] border-zinc-100 border-t-brand-primary dark:border-zinc-800 dark:border-t-brand-primary" />
          <div className="absolute flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary shadow-lg">
            <span className="text-base">✨</span>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">AI가 작업 중이에요</p>
          <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
            북마크 수에 따라 30초 정도 걸릴 수 있어요
          </p>
        </div>

        <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div className="h-full w-1/3 animate-[loading-bar_2s_ease-in-out_infinite] rounded-full bg-brand-primary" />
        </div>
      </div>

      {/* 팁 카드 */}
      <div className="w-full transition-opacity duration-300" style={{ opacity: visible ? 1 : 0 }}>
        <div className="rounded-2xl border border-zinc-200 bg-surface-card p-4 shadow-sm dark:border-zinc-800 dark:bg-surface-card-dark">
          <div className="mb-2 flex flex-col items-center gap-1.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-base dark:bg-indigo-950">
              {tip.icon}
            </span>
            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-100">{tip.title}</p>
          </div>
          <p className="whitespace-pre-line text-center text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {tip.desc}
          </p>
        </div>

        <div className="mt-2.5 flex justify-center gap-1.5">
          {LOADING_TIPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === index ? "w-5 bg-brand-primary" : "w-1 bg-zinc-300 dark:bg-zinc-700"
              }`}
            />
          ))}
        </div>
      </div>

      {/* 중단 버튼 */}
      <button
        className="cursor-pointer rounded-xl border border-zinc-200 bg-transparent px-5 py-2 text-xs font-medium text-zinc-400 transition-colors hover:border-red-200 hover:text-red-500 dark:border-zinc-700 dark:text-zinc-500 dark:hover:border-red-800 dark:hover:text-red-400"
        onClick={onAbort}
      >
        중단하기
      </button>
    </div>
  );
}

function flattenBookmarks(nodes: RawNode[]): { url: string; title: string }[] {
  const items: { url: string; title: string }[] = [];
  const seen = new Set<string>();

  function traverse(nodes: RawNode[]) {
    for (const node of nodes) {
      if (
        node.url &&
        ALLOWED_PROTOCOLS.some((p) => node.url!.startsWith(p)) &&
        !seen.has(node.url)
      ) {
        seen.add(node.url);
        items.push({ url: node.url, title: node.title || node.url });
      }
      if (node.children) traverse(node.children);
    }
  }
  traverse(nodes);
  return items;
}

// 폴더 선택 모달
function FolderPicker({
  folders,
  onSelect,
  onCancel,
}: {
  folders: FolderOption[];
  onSelect: (folderId: string) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = query
    ? folders.filter((f) => f.path.toLowerCase().includes(query.toLowerCase()))
    : folders;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-surface-card p-3 shadow-lg dark:border-zinc-700 dark:bg-surface-card-dark">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">이동할 폴더 선택</p>
        <button
          className="cursor-pointer border-none bg-transparent text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500"
          onClick={onCancel}
        >
          ✕
        </button>
      </div>

      <input
        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-900 outline-none focus:border-brand-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        placeholder="폴더 검색..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      <div className="max-h-48 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="py-2 text-center text-xs text-zinc-400">검색 결과 없음</p>
        ) : (
          filtered.map((folder) => (
            <button
              key={folder.id}
              className="w-full cursor-pointer rounded-lg border-none bg-transparent px-2.5 py-2 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => onSelect(folder.id)}
            >
              <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-xs font-medium text-zinc-800 dark:text-zinc-200">
                📁 {folder.title}
              </span>
              <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-zinc-400 dark:text-zinc-500">
                {folder.path}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// 드래그 오버레이용 미니 카드
function DragPreview({ node }: { node: RawNode }) {
  return (
    <div className="flex max-w-[220px] items-center gap-1.5 rounded-lg border border-brand-primary bg-white px-2.5 py-1.5 shadow-lg dark:bg-zinc-900">
      <span className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-200">
        {node.url ? "" : "📁 "}
        {node.title || "제목 없음"}
      </span>
    </div>
  );
}

// 드롭 가능한 폴더 wrapper
function DroppableFolder({
  id,
  children,
  isOver,
}: {
  id: string;
  children: React.ReactNode;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={isOver ? "rounded bg-indigo-50 dark:bg-indigo-950/40" : ""}>
      {children}
    </div>
  );
}

// 재귀 트리 노드 컴포넌트
function ManagerNode({
  node,
  depth,
  duplicateMap,
  editingId,
  editingTitle,
  activeId,
  overId,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
  onDelete,
  onAddFolder,
  onMoveStart,
}: {
  node: RawNode;
  depth: number;
  duplicateMap: Map<string, string[]>;
  editingId: string | null;
  editingTitle: string;
  activeId: string | null;
  overId: string | null;
  onEditStart: (id: string, title: string) => void;
  onEditChange: (title: string) => void;
  onEditSave: (id: string) => void;
  onEditCancel: () => void;
  onDelete: (id: string, isFolder: boolean) => void;
  onAddFolder: (parentId: string) => void;
  onMoveStart: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const isFolder = !node.url;
  const isDuplicate = node.url ? duplicateMap.has(node.url) : false;
  const duplicatePaths = node.url ? (duplicateMap.get(node.url) ?? []) : [];
  const [showDuplicateInfo, setShowDuplicateInfo] = useState(false);
  const isDragging = activeId === node.id;

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
  } = useDraggable({
    id: node.id,
  });

  const isOver = overId === node.id && isFolder && activeId !== node.id;

  const rowContent = (
    <div
      className={`group flex items-center gap-1.5 py-1.5 pr-2 transition-opacity ${
        isDragging ? "opacity-30" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
      }`}
      style={{ paddingLeft: 8 + depth * 14 }}
    >
      {/* 드래그 핸들 */}
      <span
        ref={setDragRef}
        {...listeners}
        {...attributes}
        className="shrink-0 cursor-grab touch-none text-[10px] text-zinc-300 hover:text-zinc-500 active:cursor-grabbing dark:text-zinc-600 dark:hover:text-zinc-400"
        title="드래그해서 이동"
      >
        ⠿
      </span>

      {/* 폴더 토글 */}
      {isFolder ? (
        <button
          className="shrink-0 cursor-pointer border-none bg-transparent px-0.5 text-xs text-zinc-400 dark:text-zinc-500"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "▾" : "▸"}
        </button>
      ) : (
        <span className="w-4 shrink-0" />
      )}

      {/* 제목 / 편집 */}
      <div className="flex min-w-0 flex-1 flex-col">
        {editingId === node.id ? (
          <input
            className="w-full rounded border border-brand-primary bg-white px-1.5 py-0.5 text-xs text-zinc-900 outline-none dark:bg-zinc-800 dark:text-zinc-100"
            value={editingTitle}
            autoFocus
            onChange={(e) => onEditChange(e.target.value)}
            onBlur={() => onEditSave(node.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onEditSave(node.id);
              if (e.key === "Escape") onEditCancel();
            }}
          />
        ) : (
          <span
            className={`overflow-hidden text-ellipsis whitespace-nowrap text-xs ${
              isFolder
                ? "cursor-pointer font-semibold text-zinc-800 dark:text-zinc-200"
                : "text-zinc-700 dark:text-zinc-300"
            }`}
            onClick={isFolder ? () => setExpanded((v) => !v) : undefined}
            onDoubleClick={() => onEditStart(node.id, node.title)}
            title="더블클릭해서 이름 수정"
          >
            {isFolder ? "📁 " : ""}
            {node.title || "제목 없음"}
          </span>
        )}

        {/* URL — 클릭 시 새 탭으로 열기 */}
        {node.url && editingId !== node.id && (
          <span
            className="cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-zinc-400 hover:text-brand-primary hover:underline dark:text-zinc-500 dark:hover:text-brand-primary"
            onClick={() => chrome.tabs.create({ url: node.url! })}
            title={node.url}
          >
            {node.url}
          </span>
        )}

        {/* 중복 경로 표시 */}
        {isDuplicate && showDuplicateInfo && (
          <div className="mt-0.5 rounded bg-amber-50 px-1.5 py-1 text-[10px] text-amber-700 dark:bg-amber-950 dark:text-amber-400">
            같은 URL이 다른 곳에도 있어요:
            {duplicatePaths.map((p, i) => (
              <div key={i} className="mt-0.5 font-medium">
                • {p || "즐겨찾기 바"}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 중복 뱃지 */}
      {isDuplicate && (
        <button
          className="shrink-0 cursor-pointer border-none bg-transparent p-0 text-xs text-amber-500"
          onClick={() => setShowDuplicateInfo((v) => !v)}
          title="중복 북마크"
        >
          ⚠️
        </button>
      )}

      {/* 액션 버튼 (hover 시 표시) */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          className="cursor-pointer border-none bg-transparent p-0 text-[11px] text-zinc-400 hover:text-brand-primary dark:text-zinc-500 dark:hover:text-brand-primary"
          onClick={() => onMoveStart(node.id)}
          title="이동"
        >
          📂
        </button>
        {isFolder && (
          <button
            className="cursor-pointer border-none bg-transparent p-0 text-[11px] text-zinc-400 hover:text-brand-primary dark:text-zinc-500 dark:hover:text-brand-primary"
            onClick={() => onAddFolder(node.id)}
            title="하위 폴더 추가"
          >
            📁+
          </button>
        )}
        <button
          className="cursor-pointer border-none bg-transparent p-0 text-[11px] text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400"
          onClick={() => onDelete(node.id, isFolder)}
          title={isFolder ? "폴더 삭제" : "삭제"}
        >
          🗑️
        </button>
      </div>
    </div>
  );

  const childNodes = isFolder && expanded && node.children && (
    <div>
      {node.children.map((child) => (
        <ManagerNode
          key={child.id}
          node={child}
          depth={depth + 1}
          duplicateMap={duplicateMap}
          editingId={editingId}
          editingTitle={editingTitle}
          activeId={activeId}
          overId={overId}
          onEditStart={onEditStart}
          onEditChange={onEditChange}
          onEditSave={onEditSave}
          onEditCancel={onEditCancel}
          onDelete={onDelete}
          onAddFolder={onAddFolder}
          onMoveStart={onMoveStart}
        />
      ))}
    </div>
  );

  if (isFolder) {
    return (
      <DroppableFolder id={node.id} isOver={isOver}>
        {rowContent}
        {childNodes}
      </DroppableFolder>
    );
  }

  return <div>{rowContent}</div>;
}

export function BookmarkManager() {
  const [tree, setTree] = useState<RawNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [duplicateMap, setDuplicateMap] = useState<Map<string, string[]>>(new Map());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [movingId, setMovingId] = useState<string | null>(null);
  const [folderOptions, setFolderOptions] = useState<FolderOption[]>([]);
  const [organizeCategories, setOrganizeCategories] = useState<Category[] | null>(null);
  const [organizeLoading, setOrganizeLoading] = useState(false);
  const [organizeError, setOrganizeError] = useState<string | null>(null);
  const [originalCount, setOriginalCount] = useState(0);
  const [urlToIds, setUrlToIds] = useState<Map<string, string[]>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);
  const [activeNode, setActiveNode] = useState<RawNode | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const loadTree = useCallback(() => {
    setLoading(true);
    chrome.bookmarks.getTree((rawTree) => {
      const children = rawTree[0]?.children ?? [];
      setTree(children);
      setDuplicateMap(buildDuplicateMap(children));
      setFolderOptions(getFolderOptions(children));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  const findNode = useCallback((id: string, nodes: RawNode[]): RawNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNode(id, node.children);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const node = findNode(String(event.active.id), tree);
    setActiveNode(node);
  };

  const handleDragOver = (event: { over: { id: string | number } | null }) => {
    setOverId(event.over ? String(event.over.id) : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveNode(null);
    setOverId(null);

    if (!over || active.id === over.id) return;

    const targetNode = findNode(String(over.id), tree);
    if (!targetNode || targetNode.url) return; // 폴더에만 드롭 가능

    chrome.bookmarks.move(String(active.id), { parentId: String(over.id) }, () => {
      loadTree();
    });
  };

  const handleEditStart = (id: string, title: string) => {
    setEditingId(id);
    setEditingTitle(title);
  };

  const handleEditSave = (id: string) => {
    const trimmed = editingTitle.trim();
    if (trimmed) {
      chrome.bookmarks.update(id, { title: trimmed }, () => {
        setTree((prev) => updateNodeTitle(prev, id, trimmed));
      });
    }
    setEditingId(null);
  };

  const handleDelete = (id: string, isFolder: boolean) => {
    if (isFolder) {
      chrome.bookmarks.removeTree(id, loadTree);
    } else {
      chrome.bookmarks.remove(id, loadTree);
    }
  };

  const handleAddFolder = (parentId: string) => {
    chrome.bookmarks.create({ parentId, title: "새 폴더" }, (newFolder) => {
      loadTree();
      setTimeout(() => {
        setEditingId(newFolder.id);
        setEditingTitle("새 폴더");
      }, 100);
    });
  };

  const handleMoveStart = (id: string) => {
    setMovingId(id);
  };

  const handleMoveConfirm = (targetFolderId: string) => {
    if (!movingId) return;
    chrome.bookmarks.move(movingId, { parentId: targetFolderId }, () => {
      loadTree();
      setMovingId(null);
    });
  };

  const handleOrganize = async () => {
    const items = flattenBookmarks(tree);
    if (items.length === 0) return;

    setOriginalCount(items.length);
    setUrlToIds(buildUrlToIds(tree));

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setOrganizeLoading(true);
    setOrganizeError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setOrganizeError("로그인이 필요해요.");
        return;
      }
      const baseUrl = import.meta.env.VITE_WEB_URL as string;
      const res = await fetch(`${baseUrl}/api/extension/organize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ items }),
        signal: controller.signal,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setOrganizeError(data.message ?? "AI 분류에 실패했어요.");
        return;
      }

      setOrganizeCategories(data.categories);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setOrganizeError("네트워크 오류가 발생했어요.");
    } finally {
      abortControllerRef.current = null;
      setOrganizeLoading(false);
    }
  };

  const handleOrganizeAbort = () => {
    abortControllerRef.current?.abort();
    setOrganizeLoading(false);
  };

  const handleOrganizeConfirm = (_categories: Category[]) => {
    setOrganizeCategories(null);
    loadTree();
  };

  const duplicateCount = duplicateMap.size;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-zinc-400 dark:text-zinc-500">북마크 불러오는 중...</p>
      </div>
    );
  }

  if (organizeLoading) {
    return <OrganizeLoadingScreen onAbort={handleOrganizeAbort} />;
  }

  if (organizeError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-500">{organizeError}</p>
        <button
          className="cursor-pointer rounded-lg border border-zinc-200 bg-transparent px-4 py-2 text-xs text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400"
          onClick={() => setOrganizeError(null)}
        >
          돌아가기
        </button>
      </div>
    );
  }

  if (organizeCategories) {
    return (
      <OrganizePreview
        categories={organizeCategories}
        onConfirm={handleOrganizeConfirm}
        onBack={() => setOrganizeCategories(null)}
        hideSmartmark
        originalCount={originalCount}
        urlToIds={urlToIds}
      />
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {/* 헤더 */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-surface-base pb-2 dark:bg-surface-base-dark">
        <div className="flex items-center gap-2">
          {duplicateCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-400">
              ⚠️ 중복 {duplicateCount}개
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="cursor-pointer rounded-lg border border-zinc-200 bg-transparent px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400"
            onClick={() => handleAddFolder("1")}
            title="즐겨찾기 바에 새 폴더 추가"
          >
            📁+
          </button>
          <button
            className="cursor-pointer rounded-lg border border-zinc-200 bg-transparent px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-brand-primary hover:text-brand-primary disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400"
            onClick={handleOrganize}
            disabled={organizeLoading}
          >
            ✨ AI로 정리하기
          </button>
        </div>
      </div>

      {/* 이동 폴더 선택 */}
      {movingId && (
        <FolderPicker
          folders={folderOptions}
          onSelect={handleMoveConfirm}
          onCancel={() => setMovingId(null)}
        />
      )}

      {/* 트리 */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-zinc-200 bg-surface-card py-1 dark:border-zinc-700 dark:bg-surface-card-dark">
        {tree.map((node) => (
          <ManagerNode
            key={node.id}
            node={node}
            depth={0}
            duplicateMap={duplicateMap}
            editingId={editingId}
            editingTitle={editingTitle}
            activeId={activeNode?.id ?? null}
            overId={overId}
            onEditStart={handleEditStart}
            onEditChange={setEditingTitle}
            onEditSave={handleEditSave}
            onEditCancel={() => setEditingId(null)}
            onDelete={handleDelete}
            onAddFolder={handleAddFolder}
            onMoveStart={handleMoveStart}
          />
        ))}
      </div>

      {/* 드래그 중 떠다니는 미리보기 */}
      <DragOverlay dropAnimation={null}>
        {activeNode ? <DragPreview node={activeNode} /> : null}
      </DragOverlay>

      <button
        className="w-full cursor-pointer rounded-xl border border-zinc-200 bg-transparent py-2 text-xs text-zinc-500 transition-colors hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400"
        onClick={loadTree}
      >
        새로고침
      </button>
    </DndContext>
  );
}

function buildUrlToIds(nodes: RawNode[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  function traverse(ns: RawNode[]) {
    for (const node of ns) {
      if (node.url) {
        map.set(node.url, [...(map.get(node.url) ?? []), node.id]);
      }
      if (node.children) traverse(node.children);
    }
  }
  traverse(nodes);
  return map;
}

function updateNodeTitle(nodes: RawNode[], id: string, title: string): RawNode[] {
  return nodes.map((node) => {
    if (node.id === id) return { ...node, title };
    if (node.children) return { ...node, children: updateNodeTitle(node.children, id, title) };
    return node;
  });
}
