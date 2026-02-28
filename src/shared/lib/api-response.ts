/**
 * @description API 응답의 표준 규격
 */
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  status: number;
}

/**
 * @description 앱 전역에서 사용하는 표준 에러 클래스
 */
export class ApiError extends Error {
  constructor(
    public message: string,
    public code: ErrorCode,
    public status: number = 400
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * @description 에러 카테고리 정의
 */
export type ErrorCode = 
  | "AUTH_ERROR"      // 인증 실패
  | "NOT_FOUND"       // 리소스 없음
  | "FORBIDDEN"       // 권한 없음
  | "VALIDATION_ERROR" // 데이터 유효성 검사 실패
  | "FREE_TIER_LIMIT"  // 비회원 5개 제한 초과
  | "SERVER_ERROR"    // 서버 내부 오류
  | "UNKNOWN_ERROR";  // 알 수 없는 오류
