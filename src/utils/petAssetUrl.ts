import { TURTLE_API_BASE } from '@/api/api';
import type { PetDisplay } from '@/types/pet';

export type PetAssetKind = 'spine' | 'raster';

export interface PetDisplayAssetPair {
  pngUrl?: string;
  spineUrl?: string;
}

export interface SpineLayoutBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ParsedSpineAssetPaths {
  pathPrefix: string;
  skeletonFile: string;
  atlasFile: string;
}

/** 解析为可请求的绝对地址 */
export function resolvePetAssetUrl(url: string | undefined, base = TURTLE_API_BASE): string {
  const trimmed = url?.trim();
  if (!trimmed) {
    return '';
  }

  if (/^(https?:)?\/\//.test(trimmed) || trimmed.startsWith('data:')) {
    return trimmed;
  }

  if (!base) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  return `${base}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

/** 根据链接后缀判断资源类型：`.json` / `.skel` 视为骨骼，其余按位图处理 */
export function getPetAssetKind(url: string | undefined): PetAssetKind | null {
  const trimmed = url?.trim();
  if (!trimmed) {
    return null;
  }

  const path = trimmed.split('?')[0]?.split('#')[0]?.toLowerCase() ?? '';
  if (path.endsWith('.json') || path.endsWith('.skel')) {
    return 'spine';
  }

  if (/\.(png|jpe?g|webp|gif|svg|avif|bmp)$/i.test(path) || trimmed.startsWith('data:image')) {
    return 'raster';
  }

  return 'raster';
}

/** 取 display 中第一个有效链接用于列表预览 */
export function getPetDisplayPreviewUrl(display?: PetDisplay): string | undefined {
  for (const url of [display?.icon, display?.thumbnail]) {
    const trimmed = url?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return undefined;
}

/** 按后缀写入对应 display 字段：.json/.skel → icon，其它 → thumbnail */
export function applyUrlToDisplay(url: string): Partial<PetDisplay> {
  const trimmed = url.trim();
  if (!trimmed) {
    return {};
  }

  if (getPetAssetKind(trimmed) === 'spine') {
    return { icon: trimmed };
  }

  return { thumbnail: trimmed };
}

/** @deprecated 列表/预览请用 getPetDisplayPreviewUrl + PetDisplayAssetPreview */
export function splitPetDisplayAssets(display?: PetDisplay): PetDisplayAssetPair {
  const pickByKind = (kind: PetAssetKind, urls: (string | undefined)[]) => {
    for (const url of urls) {
      const trimmed = url?.trim();
      if (trimmed && getPetAssetKind(trimmed) === kind) {
        return trimmed;
      }
    }
    return undefined;
  };

  return {
    pngUrl: pickByKind('raster', [display?.thumbnail, display?.cover, display?.icon]),
    spineUrl: pickByKind('spine', [display?.icon, display?.cover, display?.thumbnail]),
  };
}

/** Spine JSON 与同名 `.atlas` 通常在同一目录 */
export function parseSpineAssetPaths(fullUrl: string): ParsedSpineAssetPaths {
  const parsed = new URL(fullUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  const pathname = parsed.pathname;
  const slashIndex = pathname.lastIndexOf('/');
  const dirPath = slashIndex >= 0 ? pathname.slice(0, slashIndex + 1) : '/';
  const fileName = slashIndex >= 0 ? pathname.slice(slashIndex + 1) : pathname;
  const atlasFile = fileName.replace(/\.json(\?.*)?$/i, '.atlas');

  return {
    pathPrefix: `${parsed.origin}${dirPath}`,
    skeletonFile: fileName,
    atlasFile,
  };
}
