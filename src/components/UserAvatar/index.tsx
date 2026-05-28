import { Avatar, type AvatarProps } from 'antd';
import { useMemo } from 'react';
import { resolveUserAvatarSrc } from '@/utils/userAvatar';

export interface UserAvatarProps extends Omit<AvatarProps, 'src'> {
  userId?: string | number | null;
  idEncode?: string | number | null;
  avatar?: string | null;
}

export default function UserAvatar({
  userId,
  idEncode,
  avatar,
  alt,
  size = 32,
  ...rest
}: UserAvatarProps) {
  const pixelSize = typeof size === 'number' ? size : 128;

  const src = useMemo(
    () => resolveUserAvatarSrc({ userId, idEncode, avatar, size: pixelSize }),
    [userId, idEncode, avatar, pixelSize],
  );

  return <Avatar src={src} alt={alt} size={size} {...rest} />;
}
