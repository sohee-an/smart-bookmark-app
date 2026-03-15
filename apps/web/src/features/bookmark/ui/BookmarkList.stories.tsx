import type { Meta, StoryObj } from "@storybook/nextjs";
import { fn } from "@storybook/test";
import { BookmarkList } from "./BookmarkList";
import type { Bookmark } from "@/entities/bookmark/model/types";

const makeBookmark = (id: string, overrides: Partial<Bookmark> = {}): Bookmark => ({
  id,
  url: `https://example.com/article-${id}`,
  title: `북마크 제목 ${id}`,
  summary: "이것은 AI가 자동으로 생성한 요약입니다. 핵심 내용을 간결하게 정리합니다.",
  aiStatus: "completed",
  status: "unread",
  tags: ["React", "TypeScript"],
  userId: "user1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const meta: Meta<typeof BookmarkList> = {
  title: "Features/BookmarkList",
  component: BookmarkList,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  args: {
    onBookmarkClick: fn(),
    onTagClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const WithBookmarks: Story = {
  args: {
    bookmarks: [
      makeBookmark("1"),
      makeBookmark("2"),
      makeBookmark("3", { status: "read" }),
      makeBookmark("4", { aiStatus: "failed", summary: undefined }),
    ],
  },
};

export const Empty: Story = {
  args: {
    bookmarks: [],
  },
};
