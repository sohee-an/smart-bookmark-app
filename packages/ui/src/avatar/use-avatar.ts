import { useState, useEffect } from "react";

interface UseAvatarProps {
  src?: string | null;
  username?: string;
}

export const useAvatar = ({ src, username = "guest" }: UseAvatarProps) => {
  const fallbackUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(username)}`;

  const [imgSrc, setImgSrc] = useState<string>(src || fallbackUrl);

  useEffect(() => {
    setImgSrc(src || fallbackUrl);
  }, [src, fallbackUrl]);

  const handleError = () => {
    if (imgSrc !== fallbackUrl) {
      setImgSrc(fallbackUrl);
    }
  };

  return {
    imgSrc,
    handleError,
    alt: `${username}'s avatar`,
  };
};
