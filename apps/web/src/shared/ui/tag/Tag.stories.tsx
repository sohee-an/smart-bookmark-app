import type { Meta, StoryObj } from "@storybook/nextjs";
import { fn } from "@storybook/test";
import { TagGroup } from "./Tag";

const meta: Meta<typeof TagGroup> = {
  title: "Shared/TagGroup",
  component: TagGroup,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    onTagClick: fn(),
    onMoreClick: fn(),
    onTagRemove: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    tags: ["React", "TypeScript", "Next.js"],
    showLabel: true,
  },
};

export const Clickable: Story = {
  args: {
    tags: ["React", "TypeScript", "Next.js"],
    showLabel: false,
  },
};

export const WithRemove: Story = {
  args: {
    tags: ["React", "TypeScript", "Next.js"],
    editable: true,
    showLabel: true,
    tagInput: "",
  },
};

export const MaxVisibleWithMore: Story = {
  args: {
    tags: ["React", "TypeScript", "Next.js", "Zustand", "Tailwind"],
    maxVisible: 2,
    showLabel: false,
  },
};
