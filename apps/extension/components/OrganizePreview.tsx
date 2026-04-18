import { useState } from "react";

export type Category = { name: string; items: { url: string; title: string }[] };

type Item = { url: string; title: string; excluded: boolean };
type InternalCategory = { name: string; items: Item[] };
type ActionStatus = "idle" | "saving" | "done" | "error";

function toInternal(categories: Category[]): InternalCategory[] {
  return categories.map((cat) => ({
    ...cat,
    items: cat.items.map((item) => ({ ...item, excluded: false })),
  }));
}

function getActiveCategories(categories: InternalCategory[]): Category[] {
  return categories
    .map((cat) => ({
      name: cat.name,
      items: cat.items.filter((i) => !i.excluded).map(({ url, title }) => ({ url, title })),
    }))
    .filter((cat) => cat.items.length > 0);
}

export function OrganizePreview({
  categories: initial,
  onConfirm,
  onBack,
  hideSmartmark = false,
  originalCount,
  urlToIds,
}: {
  categories: Category[];
  onConfirm: (categories: Category[]) => void;
  onBack: () => void;
  hideSmartmark?: boolean;
  originalCount?: number;
  urlToIds?: Map<string, string[]>;
}) {
  const [categories, setCategories] = useState<InternalCategory[]>(toInternal(initial));
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [browserStatus, setBrowserStatus] = useState<ActionStatus>("idle");
  const [smartmarkStatus, setSmartmarkStatus] = useState<ActionStatus>("idle");

  const totalCount = categories.reduce(
    (sum, c) => sum + c.items.filter((i) => !i.excluded).length,
    0
  );
  const missingCount = originalCount ? Math.max(0, originalCount - totalCount) : 0;
  const allIncluded = originalCount ? totalCount >= originalCount : false;

  // 항목 제외/복원 토글
  const toggleExclude = (catIndex: number, itemIndex: number) => {
    setCategories((prev) =>
      prev.map((cat, ci) =>
        ci === catIndex
          ? {
              ...cat,
              items: cat.items.map((item, ii) =>
                ii === itemIndex ? { ...item, excluded: !item.excluded } : item
              ),
            }
          : cat
      )
    );
  };

  // 항목 카테고리 이동
  const moveItem = (fromCatIndex: number, itemIndex: number, toCatName: string) => {
    setCategories((prev) => {
      const item = { ...prev[fromCatIndex].items[itemIndex], excluded: false };
      return prev.map((cat, ci) => {
        if (ci === fromCatIndex) {
          return { ...cat, items: cat.items.filter((_, ii) => ii !== itemIndex) };
        }
        if (cat.name === toCatName) {
          return { ...cat, items: [...cat.items, item] };
        }
        return cat;
      });
    });
  };

  // 카테고리 추가
  const addCategory = () => {
    const newCategory: InternalCategory = { name: "새 카테고리", items: [] };
    setCategories((prev) => {
      const newIndex = prev.length;
      setEditingIndex(newIndex);
      setEditingName(newCategory.name);
      return [...prev, newCategory];
    });
  };

  // 카테고리명 편집 시작
  const startEditName = (index: number) => {
    setEditingIndex(index);
    setEditingName(categories[index].name);
  };

  // 카테고리명 저장
  const saveName = () => {
    if (editingIndex === null) return;
    const trimmed = editingName.trim();
    if (!trimmed) {
      setEditingIndex(null);
      return;
    }
    setCategories((prev) =>
      prev.map((cat, i) => (i === editingIndex ? { ...cat, name: trimmed } : cat))
    );
    setEditingIndex(null);
  };

  // 브라우저 북마크에 카테고리 폴더로 저장
  const handleBrowserSave = async () => {
    if (totalCount === 0) return;
    setBrowserStatus("saving");

    try {
      const activeCategories = getActiveCategories(categories);

      // "기타 즐겨찾기(id:2)" 아래 SmartMark 정리 폴더 생성
      const parentFolder = await new Promise<chrome.bookmarks.BookmarkTreeNode>(
        (resolve, reject) => {
          chrome.bookmarks.create(
            { parentId: "2", title: `SmartMark 정리 (${new Date().toLocaleDateString("ko-KR")})` },
            (folder) => {
              if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
              else resolve(folder);
            }
          );
        }
      );

      // 카테고리별 서브폴더 + 북마크 생성
      for (const cat of activeCategories) {
        const folder = await new Promise<chrome.bookmarks.BookmarkTreeNode>((resolve, reject) => {
          chrome.bookmarks.create({ parentId: parentFolder.id, title: cat.name }, (f) => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else resolve(f);
          });
        });

        for (const item of cat.items) {
          await new Promise<void>((resolve, reject) => {
            chrome.bookmarks.create(
              { parentId: folder.id, title: item.title || item.url, url: item.url },
              () => {
                if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                else resolve();
              }
            );
          });
        }
      }

      // 정리된 URL에 해당하는 원본 북마크 삭제
      if (urlToIds) {
        const organizedUrls = new Set(activeCategories.flatMap((c) => c.items.map((i) => i.url)));
        for (const [url, ids] of urlToIds) {
          if (organizedUrls.has(url)) {
            for (const id of ids) {
              await new Promise<void>((resolve) => {
                chrome.bookmarks.remove(id, () => {
                  void chrome.runtime.lastError;
                  resolve();
                });
              });
            }
          }
        }
      }

      setBrowserStatus("done");
    } catch {
      setBrowserStatus("error");
    }
  };

  // SmartMark로 가져오기
  const handleSmartmarkSave = () => {
    if (totalCount === 0) return;
    setSmartmarkStatus("saving");
    onConfirm(getActiveCategories(categories));
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {originalCount
            ? `${originalCount}개 중 ${totalCount}개 · ${categories.length}개 카테고리`
            : `AI가 ${totalCount}개를 ${categories.length}개 카테고리로 분류했어요.`}
        </p>
        {missingCount > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-400">
            {missingCount}개 누락
          </span>
        )}
        {allIncluded && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-950 dark:text-green-400">
            전체 포함
          </span>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {categories.map((cat, catIndex) => (
          <div
            key={catIndex}
            className="overflow-hidden rounded-xl border border-zinc-200 bg-surface-card shadow-sm dark:border-zinc-700 dark:bg-surface-card-dark"
          >
            {/* 카테고리 헤더 */}
            <div className="flex items-center justify-between bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
              {editingIndex === catIndex ? (
                <input
                  className="flex-1 rounded border border-zinc-300 bg-white px-2 py-0.5 text-xs font-semibold text-zinc-900 outline-none focus:border-brand-primary dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                  value={editingName}
                  autoFocus
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName();
                    if (e.key === "Escape") setEditingIndex(null);
                  }}
                />
              ) : (
                <button
                  className="cursor-pointer border-none bg-transparent p-0 text-xs font-bold text-zinc-800 hover:text-brand-primary dark:text-zinc-200 dark:hover:text-brand-primary"
                  onClick={() => startEditName(catIndex)}
                  title="클릭해서 이름 수정"
                >
                  {cat.name}
                </button>
              )}
              <span className="ml-2 shrink-0 rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                {cat.items.filter((i) => !i.excluded).length}개
              </span>
            </div>

            {/* 항목 목록 */}
            {cat.items.map((item, itemIndex) => (
              <div
                key={itemIndex}
                className={`flex items-center gap-1.5 border-t border-zinc-100 px-3 py-2 dark:border-zinc-700/50 ${
                  item.excluded
                    ? "bg-zinc-50 dark:bg-zinc-800/50"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                }`}
              >
                <span
                  className={`flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs ${
                    item.excluded
                      ? "text-zinc-400 line-through dark:text-zinc-600"
                      : "text-zinc-700 dark:text-zinc-300"
                  }`}
                  title={item.url}
                >
                  {item.title || item.url}
                </span>

                {!item.excluded && categories.length > 1 && (
                  <select
                    className="shrink-0 cursor-pointer rounded border border-zinc-200 bg-white px-1 py-0.5 text-[10px] text-zinc-500 outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                    value={cat.name}
                    onChange={(e) => moveItem(catIndex, itemIndex, e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  className={`shrink-0 cursor-pointer border-none bg-transparent p-0 text-sm leading-none transition-colors ${
                    item.excluded
                      ? "text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                      : "text-zinc-300 hover:text-red-400 dark:text-zinc-600 dark:hover:text-red-400"
                  }`}
                  onClick={() => toggleExclude(catIndex, itemIndex)}
                  title={item.excluded ? "복원" : "제외"}
                >
                  {item.excluded ? "↩" : "×"}
                </button>
              </div>
            ))}
          </div>
        ))}

        <button
          className="w-full cursor-pointer rounded-xl border border-dashed border-zinc-300 bg-transparent py-2 text-xs text-zinc-400 transition-colors hover:border-brand-primary hover:text-brand-primary dark:border-zinc-600 dark:text-zinc-500 dark:hover:border-brand-primary dark:hover:text-brand-primary"
          onClick={addCategory}
        >
          + 카테고리 추가
        </button>
      </div>

      {/* 액션 상태 피드백 */}
      {(browserStatus === "done" || browserStatus === "error") && (
        <div
          className={`rounded-xl px-3 py-2 text-xs ${
            browserStatus === "done"
              ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
              : "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
          }`}
        >
          {browserStatus === "done"
            ? "브라우저 즐겨찾기에 저장됐어요."
            : "브라우저 저장에 실패했어요."}
        </div>
      )}
      {(smartmarkStatus === "done" || smartmarkStatus === "error") && (
        <div
          className={`rounded-xl px-3 py-2 text-xs ${
            smartmarkStatus === "done"
              ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
              : "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
          }`}
        >
          {smartmarkStatus === "done" ? "SmartMark에 가져왔어요." : "SmartMark 저장에 실패했어요."}
        </div>
      )}

      {/* 버튼 영역 */}
      <button
        className="w-full cursor-pointer rounded-xl border border-zinc-200 bg-transparent py-2.5 text-xs text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600"
        onClick={onBack}
      >
        ← 다시 선택
      </button>

      <div className={`flex gap-2 ${hideSmartmark ? "" : ""}`}>
        <button
          className={`cursor-pointer rounded-xl border border-zinc-200 bg-transparent py-2.5 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 ${hideSmartmark ? "flex-1" : "flex-1"}`}
          disabled={totalCount === 0 || browserStatus === "saving"}
          onClick={handleBrowserSave}
        >
          {browserStatus === "saving"
            ? "저장 중..."
            : browserStatus === "done"
              ? "✓ 완료"
              : allIncluded
                ? "📁 기존 북마크 대체"
                : missingCount > 0
                  ? `📁 정리 적용 (${missingCount}개 원위치 유지)`
                  : "📁 브라우저 폴더로 정리"}
        </button>
        {!hideSmartmark && (
          <button
            className="flex-1 cursor-pointer rounded-xl border-none bg-brand-primary py-2.5 text-xs font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-40"
            disabled={totalCount === 0 || smartmarkStatus === "saving"}
            onClick={handleSmartmarkSave}
          >
            {smartmarkStatus === "saving"
              ? "가져오는 중..."
              : smartmarkStatus === "done"
                ? "✓ SmartMark 저장됨"
                : "SmartMark로 가져오기"}
          </button>
        )}
      </div>
    </>
  );
}
