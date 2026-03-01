import React from 'react';

interface AvatarProps {
  src?: string | null;
  username?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * @description 사용자의 프로필 이미지를 렌더링합니다. 
 * 이미지가 없으면 DiceBear API를 사용하여 고유하고 귀여운 아바타를 생성합니다.
 */
export const Avatar = ({ src, username = 'guest', size = 'md', className = '' }: AvatarProps) => {
  // 사이즈별 크기 정의
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  // DiceBear Adventurer 스타일 사용 (닉네임을 시드로 사용)
  const defaultAvatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(username)}`;

  return (
    <div className={`relative inline-block overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800 ${sizeClasses[size]} ${className}`}>
      <img
        src={src || defaultAvatar}
        alt={`${username}'s avatar`}
        className="h-full w-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src = defaultAvatar;
        }}
      />
    </div>
  );
};
