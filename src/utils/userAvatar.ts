import { createAvatar } from '@dicebear/core';
import { lorelei } from '@dicebear/collection';
import { isAvatarImage } from '@/utils/auth';

const avatarCache = new Map<string, string>();

export function getUserAvatarSeed(userId: string | number | undefined | null) {
  if (userId === undefined || userId === null || userId === '') {
    return 'anonymous';
  }

  return String(userId);
}

export function createUserAvatarDataUri(userId: string | number | undefined | null, size = 128) {
  const seed = getUserAvatarSeed(userId);
  const cacheKey = `${seed}:${size}`;
  const cached = avatarCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const dataUri = createAvatar(lorelei, {
    seed,
    size,
  }).toDataUri();

  avatarCache.set(cacheKey, dataUri);
  return dataUri;
}

export function resolveUserAvatarSrc(options: {
  userId?: string | number | null;
  avatar?: string | null;
  size?: number;
}) {
  const { userId, avatar, size = 128 } = options;

  if (avatar && isAvatarImage(avatar)) {
    return avatar;
  }

  return createUserAvatarDataUri(userId, size);
}
