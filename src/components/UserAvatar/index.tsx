import { Avatar, type AvatarProps } from 'antd';
import { useMemo } from 'react';
import { resolveUserAvatarSrc } from '@/utils/userAvatar';

export interface UserAvatarProps extends Omit<AvatarProps, 'src'> {
  userId?: string | number | null;
  avatar?: string | null;
}

export default function UserAvatar({
  userId,
  avatar,
  alt,
  size = 32,
  ...rest
}: UserAvatarProps) {
  const pixelSize = typeof size === 'number' ? size : 128;

  const src = useMemo(
    () => resolveUserAvatarSrc({ userId, avatar, size: pixelSize }),
    [userId, avatar, pixelSize],
  );

  return <Avatar src={src} alt={alt} size={size} {...rest} />;
}
