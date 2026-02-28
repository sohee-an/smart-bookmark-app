/**
 * @description 스마트 북마크 앱 전역에서 사용하는 표준 북마크 모델
 */
export interface Bookmark {
  id: string;
  url: string;
  title: string;
  summary: string; // AI 생성 요약
  content?: string; // 본문 텍스트 (검색용)
  userMemo?: string; // 사용자 메모
  thumbnailUrl?: string;
  tags: string[];
  status: "unread" | "read";
  createdAt: string;
  userId?: string; // 회원 ID
  tempUserId?: string; // 비회원 익명 ID
}

/**
 * @description 북마크 생성을 위한 요청 타입
 */
export interface CreateBookmarkRequest {
  url: string;
  userMemo?: string;
  tempUserId?: string;
}

/**
 * @description 북마크 목록 조회를 위한 필터 옵션
 */
export interface BookmarkFilter {
  tag?: string;
  status?: "unread" | "read";
  searchQuery?: string;
}
