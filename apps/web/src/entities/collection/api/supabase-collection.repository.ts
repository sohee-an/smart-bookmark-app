import { supabase } from "@/shared/api/supabase/client";
import type {
  CollectionRepository,
  CreateCollectionInput,
  UpdateCollectionInput,
} from "./collection.repository";
import type {
  Collection,
  CollectionDetail,
  CollectionMember,
  CollectionRole,
} from "../model/types";
import type { Bookmark } from "@/entities/bookmark/model/types";
import { toBookmark } from "@/entities/bookmark/lib/bookmark.mapper";

type CollectionMemberRow = {
  role: string;
  collections: {
    id: string;
    name: string;
    description: string | null;
    owner_id: string;
    created_at: string;
    updated_at: string;
    collection_members: Array<{ count: number }>;
    collection_bookmarks: Array<{ count: number }>;
  } | null;
};

type MemberRow = {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  users: { email: string } | null;
};

type CollectionBookmarkRow = {
  bookmarks: {
    id: string;
    url: string;
    title: string | null;
    summary: string | null;
    thumbnail_url: string | null;
    ai_status: string | null;
    status: string;
    user_id: string;
    user_memo: string | null;
    created_at: string;
    updated_at: string | null;
    bookmark_tags: Array<{ tags: { id: string; name: string } | null }>;
  } | null;
};

export class SupabaseCollectionRepository implements CollectionRepository {
  constructor(private userId: string) {}

  async findAll(): Promise<Collection[]> {
    const { data, error } = await supabase
      .from("collection_members")
      .select(
        `
        role,
        collections (
          id, name, description, owner_id, created_at, updated_at,
          collection_members (count),
          collection_bookmarks (count)
        )
      `
      )
      .eq("user_id", this.userId);

    if (error) throw new Error(`컬렉션 목록 조회 실패: ${error.message}`);

    return ((data ?? []) as unknown as CollectionMemberRow[])
      .filter((row) => row.collections)
      .map((row) => ({
        id: row.collections!.id,
        name: row.collections!.name,
        description: row.collections!.description,
        ownerId: row.collections!.owner_id,
        role: row.role as CollectionRole,
        memberCount: row.collections!.collection_members[0]?.count ?? 0,
        bookmarkCount: row.collections!.collection_bookmarks[0]?.count ?? 0,
        createdAt: row.collections!.created_at,
        updatedAt: row.collections!.updated_at,
      }));
  }

  async findById(id: string): Promise<CollectionDetail | null> {
    const { data: colData, error: colError } = await supabase
      .from("collections")
      .select("*")
      .eq("id", id)
      .single();

    if (colError) return null;

    const { data: memberData } = await supabase
      .from("collection_members")
      .select("id, user_id, role, joined_at, users:user_id(email)")
      .eq("collection_id", id);

    const { data: myMember } = await supabase
      .from("collection_members")
      .select("role")
      .eq("collection_id", id)
      .eq("user_id", this.userId)
      .single();

    const members: CollectionMember[] = ((memberData ?? []) as unknown as MemberRow[]).map((m) => ({
      id: m.id,
      userId: m.user_id,
      email: m.users?.email ?? "",
      role: m.role as CollectionRole,
      joinedAt: m.joined_at,
    }));

    const { data: bookmarkCountData } = await supabase
      .from("collection_bookmarks")
      .select("id", { count: "exact", head: true })
      .eq("collection_id", id);

    return {
      id: colData.id,
      name: colData.name,
      description: colData.description,
      ownerId: colData.owner_id,
      role: (myMember?.role ?? "viewer") as CollectionRole,
      memberCount: members.length,
      bookmarkCount: (bookmarkCountData as unknown[])?.length ?? 0,
      createdAt: colData.created_at,
      updatedAt: colData.updated_at,
      members,
    };
  }

  async create(input: CreateCollectionInput): Promise<Collection> {
    const { data, error } = await supabase
      .from("collections")
      .insert({ name: input.name, description: input.description ?? null, owner_id: this.userId })
      .select()
      .single();

    if (error) throw new Error(`컬렉션 생성 실패: ${error.message}`);

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      ownerId: data.owner_id,
      role: "owner",
      memberCount: 1,
      bookmarkCount: 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async update(id: string, input: UpdateCollectionInput): Promise<void> {
    const { error } = await supabase
      .from("collections")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("owner_id", this.userId);

    if (error) throw new Error(`컬렉션 수정 실패: ${error.message}`);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("collections")
      .delete()
      .eq("id", id)
      .eq("owner_id", this.userId);

    if (error) throw new Error(`컬렉션 삭제 실패: ${error.message}`);
  }

  async getBookmarks(collectionId: string): Promise<Bookmark[]> {
    const { data, error } = await supabase
      .from("collection_bookmarks")
      .select(
        `
        bookmark_id,
        bookmarks (
          id, url, title, summary, thumbnail_url, ai_status, status,
          user_id, user_memo, created_at, updated_at,
          bookmark_tags (tags (id, name))
        )
      `
      )
      .eq("collection_id", collectionId)
      .order("added_at", { ascending: false });

    if (error) throw new Error(`북마크 조회 실패: ${error.message}`);

    return ((data ?? []) as unknown as CollectionBookmarkRow[])
      .filter((row) => row.bookmarks)
      .map((row) => {
        const b = row.bookmarks!;
        const tags = (b.bookmark_tags ?? [])
          .map((bt) => bt.tags?.name)
          .filter((t): t is string => Boolean(t));
        return toBookmark({
          id: b.id,
          url: b.url,
          title: b.title ?? "",
          summary: b.summary ?? "",
          content: undefined,
          userMemo: b.user_memo ?? undefined,
          thumbnailUrl: b.thumbnail_url ?? undefined,
          aiStatus: (b.ai_status ?? "processing") as
            | "crawling"
            | "processing"
            | "completed"
            | "failed",
          tags,
          status: b.status as "unread" | "read",
          createdAt: b.created_at,
          updatedAt: b.updated_at ?? b.created_at,
          userId: b.user_id,
          guestId: undefined,
        });
      });
  }

  async addBookmark(collectionId: string, bookmarkId: string): Promise<void> {
    const { error } = await supabase
      .from("collection_bookmarks")
      .insert({ collection_id: collectionId, bookmark_id: bookmarkId, added_by: this.userId });

    if (error) throw new Error(`북마크 추가 실패: ${error.message}`);
  }

  async removeBookmark(collectionId: string, bookmarkId: string): Promise<void> {
    const { error } = await supabase
      .from("collection_bookmarks")
      .delete()
      .eq("collection_id", collectionId)
      .eq("bookmark_id", bookmarkId);

    if (error) throw new Error(`북마크 제거 실패: ${error.message}`);
  }

  async getMembers(collectionId: string): Promise<CollectionMember[]> {
    const { data, error } = await supabase
      .from("collection_members")
      .select("id, user_id, role, joined_at, users:user_id(email)")
      .eq("collection_id", collectionId);

    if (error) throw new Error(`멤버 조회 실패: ${error.message}`);

    return ((data ?? []) as unknown as MemberRow[]).map((m) => ({
      id: m.id,
      userId: m.user_id,
      email: m.users?.email ?? "",
      role: m.role as CollectionRole,
      joinedAt: m.joined_at,
    }));
  }

  async inviteMember(collectionId: string, email: string, role: CollectionRole): Promise<void> {
    const res = await fetch("/api/collections/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collectionId, email, role }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message ?? "초대 실패");
  }

  async updateMemberRole(
    collectionId: string,
    userId: string,
    role: CollectionRole
  ): Promise<void> {
    const { error } = await supabase
      .from("collection_members")
      .update({ role })
      .eq("collection_id", collectionId)
      .eq("user_id", userId);

    if (error) throw new Error(`권한 변경 실패: ${error.message}`);
  }

  async removeMember(collectionId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("collection_members")
      .delete()
      .eq("collection_id", collectionId)
      .eq("user_id", userId);

    if (error) throw new Error(`멤버 제거 실패: ${error.message}`);
  }
}
