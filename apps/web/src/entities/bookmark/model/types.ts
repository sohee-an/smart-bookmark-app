/**
 * @description 북마크의 AI 처리 상태
 */
export type AIStatus = "processing" | "completed" | "failed";

/**
 * @description 북마크의 읽음 상태
 */
export type BookmarkStatus = "read" | "unread";

/**
 * @description 우리 앱 내에서 사용하는 북마크 표준 도메인 모델
 */
export interface Bookmark {
  id: string;
  url: string;
  title: string;
  summary?: string;
  thumbnailUrl?: string;
  aiStatus: AIStatus;
  status: BookmarkStatus; // 읽음/안 읽음 상태 유지
  tags: string[];
  userId: string;
  createdAt: string;
  updatedAt: string;
}
export interface BookmarkFilter {
  tag?: string;
  status?: "unread" | "read";
  searchQuery?: string;
}
