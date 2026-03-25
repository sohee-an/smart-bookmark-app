import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ success: false, message: "로그인이 필요합니다." }, { status: 401 });

  const { userId, role } = await request.json();

  const { data: col } = await supabase.from("collections").select("owner_id").eq("id", id).single();

  if (col?.owner_id !== user.id) {
    return NextResponse.json({ success: false, message: "권한이 없습니다." }, { status: 403 });
  }

  const { error } = await supabase
    .from("collection_members")
    .update({ role })
    .eq("collection_id", id)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ success: false, message: "로그인이 필요합니다." }, { status: 401 });

  const { userId } = await request.json();
  const targetId = userId ?? user.id;

  const { data: col } = await supabase.from("collections").select("owner_id").eq("id", id).single();

  const isSelf = targetId === user.id;
  const isOwner = col?.owner_id === user.id;

  if (!isSelf && !isOwner) {
    return NextResponse.json({ success: false, message: "권한이 없습니다." }, { status: 403 });
  }

  const { error } = await supabase
    .from("collection_members")
    .delete()
    .eq("collection_id", id)
    .eq("user_id", targetId);

  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
