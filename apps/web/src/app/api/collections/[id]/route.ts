import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ success: false, message: "로그인이 필요합니다." }, { status: 401 });

  const { data: col, error } = await supabase.from("collections").select("*").eq("id", id).single();

  if (error)
    return NextResponse.json(
      { success: false, message: "컬렉션을 찾을 수 없습니다." },
      { status: 404 }
    );

  const { data: myMember } = await supabase
    .from("collection_members")
    .select("role")
    .eq("collection_id", id)
    .eq("user_id", user.id)
    .single();

  if (!myMember)
    return NextResponse.json({ success: false, message: "접근 권한이 없습니다." }, { status: 403 });

  const { data: members } = await supabase
    .from("collection_members")
    .select("id, user_id, role, joined_at, users:user_id(email)")
    .eq("collection_id", id);

  const { count: bookmarkCount } = await supabase
    .from("collection_bookmarks")
    .select("id", { count: "exact", head: true })
    .eq("collection_id", id);

  return NextResponse.json({
    success: true,
    data: {
      id: col.id,
      name: col.name,
      description: col.description,
      ownerId: col.owner_id,
      role: myMember.role,
      memberCount: members?.length ?? 0,
      bookmarkCount: bookmarkCount ?? 0,
      createdAt: col.created_at,
      updatedAt: col.updated_at,
      members: (members ?? []).map((m: unknown) => ({
        id: m.id,
        userId: m.user_id,
        email: m.users?.email ?? "",
        role: m.role,
        joinedAt: m.joined_at,
      })),
    },
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ success: false, message: "로그인이 필요합니다." }, { status: 401 });

  const body = await request.json();
  const { error } = await supabase
    .from("collections")
    .update({
      name: body.name,
      description: body.description,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ success: false, message: "로그인이 필요합니다." }, { status: 401 });

  const { error } = await supabase
    .from("collections")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
