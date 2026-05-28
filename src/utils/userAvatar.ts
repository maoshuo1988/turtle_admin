import { createAvatar } from '@dicebear/core';
import { pixelArt } from '@dicebear/collection';
import { isAvatarImage } from '@/utils/auth';

const avatarCache = new Map<string, string>();

export function getUserAvatarSeed(seedValue: string | number | undefined | null) {
  if (seedValue === undefined || seedValue === null || seedValue === '') {
    return 'anonymous';
  }

  return String(seedValue);
}

export function createUserAvatarDataUri(seedValue: string | number | undefined | null, size = 128) {
  const seed = getUserAvatarSeed(seedValue);
  const cacheKey = `${seed}:${size}`;
  const cached = avatarCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const dataUri = createAvatar(pixelArt, {
    seed,
    size,
  }).toDataUri();

  avatarCache.set(cacheKey, dataUri);
  return dataUri;
}

export function resolveUserAvatarSrc(options: {
  userId?: string | number | null;
  idEncode?: string | number | null;
  avatar?: string | null;
  size?: number;
}) {
  const { userId, idEncode, avatar, size = 128 } = options;

  if (avatar && isAvatarImage(avatar)) {
    return avatar;
  }

  return createUserAvatarDataUri(idEncode || userId, size);
}
