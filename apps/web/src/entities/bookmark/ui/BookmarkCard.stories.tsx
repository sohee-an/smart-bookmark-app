import type { Meta, StoryObj } from "@storybook/nextjs";
import { fn } from "@storybook/test";
import { BookmarkCard } from "./BookmarkCard";
import type { Bookmark } from "../model/types";

const baseBookmark: Bookmark = {
  id: "1",
  url: "https://react.dev/learn",
  title: "React 공식 문서 — 시작하기",
  summary:
    "React는 사용자 인터페이스를 구축하기 위한 JavaScript 라이브러리입니다. UI를 독립적인 컴포넌트로 분리하여 상태를 관리합니다.",
  thumbnailUrl: "https://react.dev/images/og-learn.png",
  aiStatus: "completed",
  status: "unread",
  tags: ["React", "JavaScript", "Frontend"],
  userId: "user1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const meta: Meta<typeof BookmarkCard> = {
  title: "Entities/BookmarkCard",
  component: BookmarkCard,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
  args: {
    onClick: fn(),
    onTagClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Completed: Story = {
  args: {
    bookmark: baseBookmark,
  },
};

export const Crawling: Story = {
  args: {
    bookmark: {
      ...baseBookmark,
      title: "",
      summary: undefined,
      thumbnailUrl: undefined,
      aiStatus: "crawling",
    },
  },
};

export const Processing: Story = {
  args: {
    bookmark: {
      ...baseBookmark,
      aiStatus: "processing",
    },
  },
};

export const Failed: Story = {
  args: {
    bookmark: {
      ...baseBookmark,
      aiStatus: "failed",
      summary: undefined,
    },
  },
};

export const Unread: Story = {
  args: {
    bookmark: {
      ...baseBookmark,
      status: "unread",
    },
  },
};
