export type CollectionRole = "owner" | "editor" | "viewer";

export interface CollectionMember {
  id: string;
  userId: string;
  email: string;
  role: CollectionRole;
  joinedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  role: CollectionRole;
  bookmarkCount: number;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionDetail extends Collection {
  members: CollectionMember[];
}
