"use client";

import { useState } from "react";
import { X, UserPlus, Crown, Pencil, Eye, Trash2 } from "lucide-react";
import type {
  CollectionDetail,
  CollectionMember,
  CollectionRole,
} from "@/entities/collection/model/types";
import { useInviteMember, useUpdateMemberRole, useRemoveMember } from "../model/queries";

interface Props {
  collection: CollectionDetail;
  currentUserId: string;
  onClose: () => void;
}

const ROLE_OPTIONS: {
  value: CollectionRole;
  label: string;
  desc: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "editor",
    label: "편집자",
    desc: "북마크 추가·제거·편집 가능",
    icon: <Pencil size={14} />,
  },
  { value: "viewer", label: "뷰어", desc: "북마크 조회만 가능", icon: <Eye size={14} /> },
];

const ROLE_ICON: Record<CollectionRole, React.ReactNode> = {
  owner: <Crown size={14} className="text-amber-500" />,
  editor: <Pencil size={14} className="text-blue-500" />,
  viewer: <Eye size={14} className="text-zinc-400" />,
};

export const InviteMemberModal = ({ collection, currentUserId, onClose }: Props) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CollectionRole>("viewer");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const { mutateAsync: invite, isPending: isInviting } = useInviteMember();
  const { mutateAsync: updateRole } = useUpdateMemberRole();
  const { mutateAsync: removeMember } = useRemoveMember();

  const isOwner = collection.role === "owner";

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInviteError(null);
    try {
      await invite({ collectionId: collection.id, email: email.trim(), role });
      setEmail("");
      setInviteSuccess(true);
      setTimeout(() => setInviteSuccess(false), 3000);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "초대 실패");
    }
  };

  const handleRoleChange = async (member: CollectionMember, newRole: CollectionRole) => {
    await updateRole({ collectionId: collection.id, userId: member.userId, role: newRole });
  };

  const handleRemove = async (member: CollectionMember) => {
    await removeMember({ collectionId: collection.id, userId: member.userId });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-zinc-500" />
            <span className="font-bold text-zinc-900 dark:text-zinc-100">멤버 관리</span>
            <span className="text-sm text-zinc-400">— {collection.name}</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
          {/* 초대 폼 (owner만) */}
          {isOwner && (
            <div className="mb-6">
              <label className="mb-2 block text-xs font-bold tracking-widest text-zinc-400 uppercase">
                이메일로 초대
              </label>
              <form onSubmit={handleInvite} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as CollectionRole)}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={isInviting || !email.trim()}
                  className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  {isInviting ? "..." : "초대"}
                </button>
              </form>

              {inviteSuccess && (
                <p className="mt-2 text-sm font-medium text-green-600">
                  초대 완료! 이메일을 확인해 주세요.
                </p>
              )}
              {inviteError && <p className="mt-2 text-sm text-red-500">{inviteError}</p>}

              <div className="mt-3 space-y-1.5">
                {ROLE_OPTIONS.map((r) => (
                  <div key={r.value} className="flex items-center gap-2 text-xs text-zinc-400">
                    {r.icon}
                    <span className="font-medium text-zinc-600 dark:text-zinc-300">{r.label}</span>
                    <span>— {r.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 멤버 목록 */}
          <div>
            <label className="mb-2 block text-xs font-bold tracking-widest text-zinc-400 uppercase">
              현재 멤버 ({collection.members.length}명)
            </label>
            <ul className="space-y-2">
              {collection.members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center gap-3 rounded-xl p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                    {member.email[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {member.email}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-zinc-400">
                      {ROLE_ICON[member.role]}
                      {member.role === "owner"
                        ? "소유자"
                        : member.role === "editor"
                          ? "편집자"
                          : "뷰어"}
                    </div>
                  </div>

                  {isOwner && member.role !== "owner" && (
                    <div className="flex items-center gap-1">
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member, e.target.value as CollectionRole)}
                        className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleRemove(member)}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}

                  {!isOwner && member.userId === currentUserId && (
                    <button
                      onClick={() => handleRemove(member)}
                      className="rounded-lg px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      나가기
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
