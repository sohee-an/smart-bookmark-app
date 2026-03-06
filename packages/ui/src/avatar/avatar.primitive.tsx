import { useAvatar } from "./use-avatar";

interface AvatarPrimitiveProps {
  src?: string | null;
  username?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const AvatarPrimitive = ({ src, username, className, style }: AvatarPrimitiveProps) => {
  const { imgSrc, handleError, alt } = useAvatar({ src, username });

  return (
    <div className={className} style={style}>
      <img src={imgSrc} alt={alt} onError={handleError} />
    </div>
  );
};
