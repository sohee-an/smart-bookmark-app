import type { Meta, StoryObj } from "@storybook/nextjs";
import { Input } from "./Input";
import { Mail, Lock, User, Search } from "lucide-react";

/**
 * @description 헤드리스(Headless) 패턴으로 설계된 Input 컴포넌트입니다.
 * 로직과 스타일을 분리하여 유연한 조합이 가능합니다.
 */
const meta: Meta<typeof Input> = {
  title: "Shared/Input",
  component: Input,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    inputSize: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "입력창의 크기를 조절합니다.",
    },
    error: {
      control: "text",
      description: "에러 메시지를 표시합니다.",
    },
    hideLabel: {
      control: "boolean",
      description: "라벨을 시각적으로 숨깁니다. (스크린 리더에는 읽힙니다)",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// 기본 입력창
export const Default: Story = {
  args: {
    placeholder: "내용을 입력하세요",
    label: "기본 입력",
    hideLabel: false,
  },
};

// 아이콘이 포함된 입력창
export const WithIcon: Story = {
  args: {
    label: "이메일",
    placeholder: "example@email.com",
    icon: <Mail size={18} />,
    hideLabel: false,
  },
};

// 검색창 스타일
export const SearchInput: Story = {
  args: {
    label: "검색",
    placeholder: "북마크를 검색하세요...",
    icon: <Search size={18} />,
    inputSize: "lg",
    hideLabel: true,
  },
};

// 에러 상태
export const ErrorState: Story = {
  args: {
    label: "비밀번호",
    placeholder: "비밀번호를 입력하세요",
    icon: <Lock size={18} />,
    error: "비밀번호는 8자 이상이어야 합니다.",
    hideLabel: false,
  },
};

// 비활성화 상태
export const Disabled: Story = {
  args: {
    label: "사용자명",
    placeholder: "수정할 수 없습니다",
    icon: <User size={18} />,
    disabled: true,
    hideLabel: false,
  },
};

// 다양한 사이즈 비교
export const Sizes: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-4">
      <Input label="Small" inputSize="sm" placeholder="Small size" />
      <Input label="Medium" inputSize="md" placeholder="Medium size" />
      <Input label="Large" inputSize="lg" placeholder="Large size" />
    </div>
  ),
};
