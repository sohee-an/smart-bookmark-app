import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ success: false, message: "로그인이 필요합니다." }, { status: 401 });

  const { collectionId, email, role } = await request.json();

  if (!collectionId || !email || !role) {
    return NextResponse.json(
      { success: false, message: "필수 값이 누락되었습니다." },
      { status: 400 }
    );
  }

  const { data: col } = await supabase
    .from("collections")
    .select("owner_id, name")
    .eq("id", collectionId)
    .single();

  if (col?.owner_id !== user.id) {
    return NextResponse.json({ success: false, message: "초대 권한이 없습니다." }, { status: 403 });
  }

  // 이미 가입된 유저인지 확인 (service role 필요)
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: existingUsers } = await adminSupabase
    .from("auth.users")
    .select("id, email")
    .eq("email", email)
    .limit(1);

  const existingUser = existingUsers?.[0];

  if (existingUser) {
    // 이미 가입된 유저 → 바로 멤버 추가
    const { error } = await supabase
      .from("collection_members")
      .upsert({ collection_id: collectionId, user_id: existingUser.id, role, invited_by: user.id });

    if (error)
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  } else {
    // 미가입 유저 → Supabase Auth 초대 이메일 발송
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/collections/${collectionId}`;
    const { error } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectUrl,
      data: { invited_to_collection: collectionId, role },
    });

    if (error)
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
