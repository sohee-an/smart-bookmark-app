import { useState } from "react";

export type Category = { name: string; items: { url: string; title: string }[] };

export function OrganizePreview({
  categories: initial,
  onConfirm,
  onBack,
}: {
  categories: Category[];
  onConfirm: (categories: Category[]) => void;
  onBack: () => void;
}) {
  const [categories, setCategories] = useState<Category[]>(initial);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const totalCount = categories.reduce((sum, c) => sum + c.items.length, 0);

  // 항목 제거
  const removeItem = (catIndex: number, itemIndex: number) => {
    setCategories((prev) =>
      prev
        .map((cat, ci) =>
          ci === catIndex ? { ...cat, items: cat.items.filter((_, ii) => ii !== itemIndex) } : cat
        )
        .filter((cat) => cat.items.length > 0)
    );
  };

  // 항목 카테고리 이동
  const moveItem = (fromCatIndex: number, itemIndex: number, toCatName: string) => {
    setCategories((prev) => {
      const item = prev[fromCatIndex].items[itemIndex];
      return prev
        .map((cat, ci) => {
          if (ci === fromCatIndex) {
            return { ...cat, items: cat.items.filter((_, ii) => ii !== itemIndex) };
          }
          if (cat.name === toCatName) {
            return { ...cat, items: [...cat.items, item] };
          }
          return cat;
        })
        .filter((cat) => cat.items.length > 0);
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

  return (
    <>
      <p className="text-xs text-zinc-400">
        AI가 {totalCount}개를 {categories.length}개 카테고리로 분류했어요.
      </p>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {categories.map((cat, catIndex) => (
          <div key={catIndex} className="rounded-xl border border-zinc-200">
            {/* 카테고리 헤더 */}
            <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2">
              {editingIndex === catIndex ? (
                <input
                  className="flex-1 rounded border border-zinc-300 px-2 py-0.5 text-xs font-semibold text-zinc-900 outline-none"
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
                  className="cursor-pointer border-none bg-transparent p-0 text-xs font-semibold text-zinc-900"
                  onClick={() => startEditName(catIndex)}
                  title="클릭해서 이름 수정"
                >
                  {cat.name}
                </button>
              )}
              <span className="ml-2 shrink-0 text-xs text-zinc-400">{cat.items.length}개</span>
            </div>

            {/* 항목 목록 */}
            {cat.items.map((item, itemIndex) => (
              <div
                key={itemIndex}
                className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-zinc-50"
              >
                <span
                  className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-zinc-600"
                  title={item.url}
                >
                  {item.title || item.url}
                </span>

                {/* 카테고리 이동 */}
                {categories.length > 1 && (
                  <select
                    className="shrink-0 cursor-pointer rounded border border-zinc-200 bg-white px-1 py-0.5 text-[10px] text-zinc-400 outline-none"
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

                {/* 제거 */}
                <button
                  className="shrink-0 cursor-pointer border-none bg-transparent p-0 text-xs text-zinc-300 hover:text-red-400"
                  onClick={() => removeItem(catIndex, itemIndex)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          className="flex-1 cursor-pointer rounded-xl border border-zinc-200 bg-transparent py-2.5 text-xs text-zinc-500"
          onClick={onBack}
        >
          ← 다시 선택
        </button>
        <button
          className="flex-1 cursor-pointer rounded-xl border-none bg-zinc-900 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          disabled={totalCount === 0}
          onClick={() => onConfirm(categories)}
        >
          이대로 가져오기 →
        </button>
      </div>
    </>
  );
}
