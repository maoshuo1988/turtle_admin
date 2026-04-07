import { createAccessMap } from '@/core/access/permissions';
import type { AppInitialState } from '@/types/runtime';

export default function access(initialState: AppInitialState | undefined) {
  return createAccessMap(initialState?.currentUser);
}
