import React from "react";
import { AvatarPrimitive } from "@smart-bookmark/ui/avatar";

interface AvatarProps {
  src?: string | null;
  username?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

/**
 * @description 완성된 UI 형태의 Avatar 컴포넌트
 * 스타일링과 레이아웃(Size)만 결정합니다.
 */
export const Avatar = ({ src, username, size = "md", className = "" }: AvatarProps) => {
  return (
    <AvatarPrimitive
      src={src}
      username={username}
      // 뼈대에 입힐 스타일(Class) 전달
      className={`relative inline-block overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800 ${sizeClasses[size]} ${className}`}
      // 내부 img 태그에 적용될 스타일 (필요 시)
      style={{ display: "flex" }}
    >
      {/* 참고: AvatarPrimitive 내부에서 img에 
          h-full w-full object-cover 같은 클래스를 
          직접 주고 있다면 아래 스타일은 생략 가능합니다. 
      */}
    </AvatarPrimitive>
  );
};
