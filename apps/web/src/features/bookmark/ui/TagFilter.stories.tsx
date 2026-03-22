import type { Meta, StoryObj } from "@storybook/nextjs";
import { fn } from "@storybook/test";
import { TagFilter } from "./TagFilter";

const meta: Meta<typeof TagFilter> = {
  title: "Features/TagFilter",
  component: TagFilter,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    onRemove: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    tags: ["React"],
  },
};

export const MultipleTags: Story = {
  args: {
    tags: ["React", "Next.js", "TypeScript", "Zustand"],
  },
};
