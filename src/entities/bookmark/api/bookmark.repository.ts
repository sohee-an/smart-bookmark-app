import { Bookmark, BookmarkFilter, CreateBookmarkRequest } from "../model/types";

/**
 * @description 북마크 데이터에 접근하는 추상화된 인터페이스 (Repository)
 * 나중에 백엔드를 갈아끼울 때, 이 인터페이스의 구현체만 교체하면 됩니다.
 */
export interface BookmarkRepository {
  /**
   * @description 북마크를 저장합니다.
   * 비회원인 경우 tempUserId를 사용하며, 5개 제한 로직이 포함됩니다.
   */
  save(request: CreateBookmarkRequest): Promise<Bookmark>;

  /**
   * @description 필터 조건에 맞는 북마크 목록을 조회합니다.
   */
  findAll(filter?: BookmarkFilter): Promise<Bookmark[]>;

  /**
   * @description 특정 북마크의 상세 정보를 조회합니다.
   */
  findById(id: string): Promise<Bookmark | null>;

  /**
   * @description 북마크를 삭제합니다.
   */
  delete(id: string): Promise<void>;

  /**
   * @description 북마크 전체를 삭제합니다.
   */
  removeAll(): Promise<void>;

  /**
   * @description 특정 사용자의 현재 북마크 개수를 조회합니다. (5개 제한 체크용)
   */
  count(userIdOrTempId: string): Promise<number>;
}
