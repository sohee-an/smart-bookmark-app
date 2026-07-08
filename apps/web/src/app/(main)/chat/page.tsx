import type { Metadata } from "next";
import { ChatContent } from "@/features/chat/ui/ChatContent";
import { getAuthState } from "@/shared/api/supabase/getAuthState";

export const metadata: Metadata = {
  title: "북마크 대화",
  description: "저장한 북마크에게 질문하고 근거와 함께 답을 받으세요.",
};

export default async function ChatPage() {
  const { isGuest } = await getAuthState();
  return <ChatContent isGuest={isGuest} />;
}
