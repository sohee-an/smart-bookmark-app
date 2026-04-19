import storage from "@/shared/lib/storage";
import type { BookmarkRow, BookmarkFilter, CreateBookmarkRequest } from "./bookmark.types.db";
import type { Bookmark } from "../model/types";
import { toBookmark } from "../lib/bookmark.mapper";
import { BookmarkRepository, UpdateBookmarkData } from "./bookmark.repository";
import getGuestId from "@/shared/lib/guest";

const GUEST_KEY = "GUEST_BOOKMARK";

export interface StorageProvider {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
}

export type DateProvider = () => Date;
export type UUIDProvider = () => string;

export class LocalRepository implements BookmarkRepository {
  constructor(
    private storageProvider: StorageProvider = storage,
    private dateProvider: DateProvider = () => new Date(),
    private uuidProvider: UUIDProvider = () => crypto.randomUUID(),
  ) {}
  /**
   * 로컬스토리지에서 BookmarkRow 목록을 가져오는 내부 메서드
   */
  private getRows(): BookmarkRow[] {
    return this.storageProvider.get<BookmarkRow[]>(GUEST_KEY) ?? [];
  }

  /**
   * @description 북마크를 저장합니다.
   * 비회원인 경우 guestId 사용하며, 5개 제한 로직이 포함됩니다.
   */
  async save<T extends CreateBookmarkRequest>(request: T): Promise<Bookmark> {
    const guestId = getGuestId();
    const currentRows = this.getRows();

    if (currentRows.length >= 5) {
      throw new Error("무료 체험 한도(5개)를 초과했습니다. 로그인이 필요합니다.");
    }

    const now = this.dateProvider().toISOString();

    const newRow: BookmarkRow = {
      id: this.uuidProvider(),
      url: request.url,
      userMemo: request.userMemo,
      aiStatus: "crawling",
      guestId: guestId,
      createdAt: now,
      status: "unread",
      title: "",
      summary: "",
      tags: [],
      updatedAt: now,
    };

    this.storageProvider.set(GUEST_KEY, [newRow, ...currentRows]);

    // BookmarkRow → Bookmark 변환 후 반환
    return toBookmark(newRow);
  }

  /**
   * @description 필터 조건에 맞는 북마크 목록을 조회합니다.
   */
  async findAll(filter?: BookmarkFilter): Promise<Bookmark[]> {
    const rows = this.getRows();

    // BookmarkRow[] → Bookmark[] 변환
    return rows.map(toBookmark);
  }

  /**
   * @description 특정 북마크의 상세 정보를 조회합니다.
   */
  async findById(id: string): Promise<Bookmark | null> {
    const rows = this.getRows();
    const row = rows.find((item) => item.id === id);
    return row ? toBookmark(row) : null;
  }

  /**
   * @description 북마크를 삭제합니다.
   */
  async delete(id: string): Promise<void> {
    const rows = this.getRows();
    this.storageProvider.set(
      GUEST_KEY,
      rows.filter((item) => item.id !== id)
    );
  }

  /**
   * @description 북마크 전체를 삭제합니다.
   */
  async removeAll(): Promise<void> {
    this.storageProvider.set(GUEST_KEY, []);
  }

  /**
   * @description 현재 북마크 개수를 조회합니다. (5개 제한 체크용)
   */
  async count(): Promise<number> {
    return this.getRows().length;
  }

  /**
   * @description 북마크 정보를 업데이트합니다.
   */
  async update(id: string, data: UpdateBookmarkData): Promise<void> {
    const rows = this.getRows();
    const index = rows.findIndex((item) => item.id === id);

    if (index === -1) {
      throw new Error(`ID가 ${id}인 북마크를 찾을 수 없습니다.`);
    }

    const updatedRows = rows.map((row) =>
      row.id === id
        ? { ...row, ...data, updatedAt: this.dateProvider().toISOString() }
        : row
    );

    this.storageProvider.set(GUEST_KEY, updatedRows);
  }
}
