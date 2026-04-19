/**
 * @description 북마크 관련 에러 코드
 */
export enum BookmarkErrorCode {
  // 게스트 관련
  GUEST_LIMIT_EXCEEDED = "GUEST_LIMIT_EXCEEDED",

  // 조회 관련
  BOOKMARK_NOT_FOUND = "BOOKMARK_NOT_FOUND",

  // DB 작업 관련
  DB_INSERT_FAILED = "DB_INSERT_FAILED",
  DB_QUERY_FAILED = "DB_QUERY_FAILED",
  DB_UPDATE_FAILED = "DB_UPDATE_FAILED",
  DB_DELETE_FAILED = "DB_DELETE_FAILED",

  // 태그 관련
  TAG_DELETE_FAILED = "TAG_DELETE_FAILED",
  TAG_INSERT_FAILED = "TAG_INSERT_FAILED",

  // 임베딩 관련
  EMBEDDING_SAVE_FAILED = "EMBEDDING_SAVE_FAILED",

  // 기타
  INVALID_URL = "INVALID_URL",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * @description 북마크 관련 커스텀 에러
 */
export class BookmarkError extends Error {
  constructor(
    public readonly code: BookmarkErrorCode,
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = "BookmarkError";

    // Error 프로토타입 체인 복구 (instanceof 동작 보장)
    Object.setPrototypeOf(this, BookmarkError.prototype);
  }
}

/**
 * @description 에러 메시지 매핑 (사용자에게 표시할 메시지)
 */
export const BookmarkErrorMessages: Record<BookmarkErrorCode, string> = {
  [BookmarkErrorCode.GUEST_LIMIT_EXCEEDED]:
    "무료 체험 한도(5개)를 초과했습니다. 로그인이 필요합니다.",
  [BookmarkErrorCode.BOOKMARK_NOT_FOUND]: "북마크를 찾을 수 없습니다.",
  [BookmarkErrorCode.DB_INSERT_FAILED]: "북마크 저장에 실패했습니다.",
  [BookmarkErrorCode.DB_QUERY_FAILED]: "북마크 조회에 실패했습니다.",
  [BookmarkErrorCode.DB_UPDATE_FAILED]: "북마크 업데이트에 실패했습니다.",
  [BookmarkErrorCode.DB_DELETE_FAILED]: "북마크 삭제에 실패했습니다.",
  [BookmarkErrorCode.TAG_DELETE_FAILED]: "태그 삭제에 실패했습니다.",
  [BookmarkErrorCode.TAG_INSERT_FAILED]: "태그 추가에 실패했습니다.",
  [BookmarkErrorCode.EMBEDDING_SAVE_FAILED]: "임베딩 저장에 실패했습니다.",
  [BookmarkErrorCode.INVALID_URL]: "유효하지 않은 URL입니다.",
  [BookmarkErrorCode.UNKNOWN_ERROR]: "알 수 없는 오류가 발생했습니다.",
};
