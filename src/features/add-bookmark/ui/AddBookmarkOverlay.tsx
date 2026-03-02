import React, { useState } from "react";
import { Link2, FileText, X, Plus } from "lucide-react";
import { Input } from "@/shared/ui/input/Input";

interface AddBookmarkOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * @description 북마크 추가를 위한 모달 오버레이 컴포넌트입니다.
 * URL과 메모를 입력받아 새로운 북마크를 생성합니다.
 */
export const AddBookmarkOverlay = ({ isOpen, onClose }: AddBookmarkOverlayProps) => {
  const [url, setUrl] = useState("");
  const [memo, setMemo] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => onClose();

  // 저장 로직 (나중에 API 연동 예정)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    // TODO: 북마크 저장 API 호출
    console.log("Saving bookmark:", { url, memo });

    // 임시 딜레이 후 닫기
    setTimeout(() => {
      setIsLoading(false);
      handleClose();
    }, 800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop: 배경 클릭 시 닫기 */}
      <div
        className="animate-in fade-in absolute inset-0 bg-zinc-950/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleClose}
      />

      {/* Modal Container */}
      <div className="animate-in zoom-in-95 fade-in relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl duration-300 dark:bg-zinc-900">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-brand-primary/10 text-brand-primary flex h-10 w-10 items-center justify-center rounded-2xl">
              <Plus size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">새 북마크 추가</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                나중에 기억할 URL을 저장하세요
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-xl p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="URL 주소"
            placeholder="https://example.com"
            icon={<Link2 size={18} />}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoFocus
            required
            className="w-full"
          />

          <Input
            label="메모 (선택)"
            placeholder="이 북마크에 대한 짧은 메모..."
            icon={<FileText size={18} />}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="w-full"
          />

          {/* Footer Actions */}
          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-2xl border-2 border-zinc-100 bg-white py-3 text-sm font-bold text-zinc-600 transition-all hover:bg-zinc-50 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!url || isLoading}
              className="dark:bg-brand-primary dark:hover:bg-brand-primary/90 flex-[1.5] rounded-2xl bg-zinc-900 py-3 text-sm font-bold text-white transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-900"
            >
              {isLoading ? "저장 중..." : "북마크 저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
