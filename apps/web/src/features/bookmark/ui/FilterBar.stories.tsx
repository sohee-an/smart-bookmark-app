import type { Meta, StoryObj } from "@storybook/nextjs";
import { fn } from "@storybook/test";
import { FilterBar } from "./FilterBar";

const meta: Meta<typeof FilterBar> = {
  title: "Features/FilterBar",
  component: FilterBar,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    onTagClick: fn(),
    onTagRemove: fn(),
    allTags: ["React", "Next.js", "TypeScript", "Zustand", "Tailwind", "CSS"],
    recentTags: ["React", "Next.js"],
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const NoSelection: Story = {
  args: {
    selectedTags: [],
  },
};

export const WithSelection: Story = {
  args: {
    selectedTags: ["React", "Next.js"],
  },
};

export const AllTags: Story = {
  args: {
    selectedTags: [],
    recentTags: [],
  },
};
