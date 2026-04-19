import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";

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

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ success: false, message: "로그인이 필요합니다." }, { status: 401 });

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
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });

  const collections = ((data ?? []) as unknown as CollectionMemberRow[])
    .filter((row) => row.collections)
    .map((row) => ({
      id: row.collections!.id,
      name: row.collections!.name,
      description: row.collections!.description,
      ownerId: row.collections!.owner_id,
      role: row.role,
      memberCount: row.collections!.collection_members[0]?.count ?? 0,
      bookmarkCount: row.collections!.collection_bookmarks[0]?.count ?? 0,
      createdAt: row.collections!.created_at,
      updatedAt: row.collections!.updated_at,
    }));

  return NextResponse.json({ success: true, data: collections });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ success: false, message: "로그인이 필요합니다." }, { status: 401 });

  const { name, description } = await request.json();
  if (!name?.trim())
    return NextResponse.json({ success: false, message: "이름이 필요합니다." }, { status: 400 });

  const { data, error } = await supabase
    .from("collections")
    .insert({ name: name.trim(), description: description ?? null, owner_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    data: {
      id: data.id,
      name: data.name,
      description: data.description,
      ownerId: data.owner_id,
      role: "owner",
      memberCount: 1,
      bookmarkCount: 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  });
}
