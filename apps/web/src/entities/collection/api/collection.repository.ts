import type {
  Collection,
  CollectionDetail,
  CollectionMember,
  CollectionRole,
} from "../model/types";
import type { Bookmark } from "@/entities/bookmark/model/types";

export interface CreateCollectionInput {
  name: string;
  description?: string;
}

export interface UpdateCollectionInput {
  name?: string;
  description?: string;
}

export interface CollectionRepository {
  findAll(): Promise<Collection[]>;
  findById(id: string): Promise<CollectionDetail | null>;
  create(input: CreateCollectionInput): Promise<Collection>;
  update(id: string, input: UpdateCollectionInput): Promise<void>;
  delete(id: string): Promise<void>;

  getBookmarks(collectionId: string): Promise<Bookmark[]>;
  addBookmark(collectionId: string, bookmarkId: string): Promise<void>;
  removeBookmark(collectionId: string, bookmarkId: string): Promise<void>;

  getMembers(collectionId: string): Promise<CollectionMember[]>;
  inviteMember(collectionId: string, email: string, role: CollectionRole): Promise<void>;
  updateMemberRole(collectionId: string, userId: string, role: CollectionRole): Promise<void>;
  removeMember(collectionId: string, userId: string): Promise<void>;
}
