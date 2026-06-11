import { Empty, Image, Spin, Typography } from 'antd';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { resolvePetAssetUrl } from '@/utils/petAssetUrl';

interface PetRasterPreviewProps {
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
}

interface LoadedImageInfo {
  naturalWidth: number;
  naturalHeight: number;
}

interface ImageLoadState {
  url: string;
  loading: boolean;
  error: string | null;
  imageInfo: LoadedImageInfo | null;
}

interface SpriteInfo {
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
}

const frameStyle = (width: number, height: number): CSSProperties => ({
  width,
  height,
  borderRadius: 8,
  border: '1px solid #eaecf0',
  background: '#fafafa',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  flexShrink: 0,
});

function getConfiguredFrameCount(url: string) {
  const match = url.match(/[?#&]frames=(\d+)/i);
  const frameCount = match ? Number(match[1]) : 0;

  if (!Number.isInteger(frameCount) || frameCount < 2 || frameCount > 80) {
    return null;
  }

  return frameCount;
}

function getSpriteInfo(info: LoadedImageInfo | null, url: string): SpriteInfo | null {
  if (!info?.naturalWidth || !info.naturalHeight) {
    return null;
  }

  const configuredFrameCount = getConfiguredFrameCount(url);
  if (configuredFrameCount) {
    return {
      frameCount: configuredFrameCount,
      frameWidth: info.naturalWidth / configuredFrameCount,
      frameHeight: info.naturalHeight,
    };
  }

  const ratio = info.naturalWidth / info.naturalHeight;
  if (ratio < 2.4) {
    return null;
  }

  const frameCount = Math.round(ratio);
  const ratioDelta = Math.abs(ratio - frameCount);
  if (frameCount < 3 || frameCount > 80) {
    return null;
  }

  if (ratioDelta > 0.03) {
    return null;
  }

  return {
    frameCount,
    frameWidth: info.naturalWidth / frameCount,
    frameHeight: info.naturalHeight,
  };
}

function useImageInfo(imageUrl: string) {
  const [loadState, setLoadState] = useState<ImageLoadState>({
    url: '',
    loading: false,
    error: null,
    imageInfo: null,
  });

  useEffect(() => {
    if (!imageUrl) {
      return;
    }

    let cancelled = false;
    const image = new window.Image();

    image.onload = () => {
      if (cancelled) {
        return;
      }
      setLoadState({
        url: imageUrl,
        loading: false,
        error: null,
        imageInfo: {
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
        },
      });
    };
    image.onerror = () => {
      if (cancelled) {
        return;
      }
      setLoadState({
        url: imageUrl,
        loading: false,
        error: '图片加载失败',
        imageInfo: null,
      });
    };
    image.src = imageUrl;

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  if (!imageUrl) {
    return { loading: false, error: null, imageInfo: null };
  }

  if (loadState.url !== imageUrl) {
    return { loading: true, error: null, imageInfo: null };
  }

  return {
    loading: loadState.loading,
    error: loadState.error,
    imageInfo: loadState.imageInfo,
  };
}

function useVisibility<T extends HTMLElement>() {
  const elementRef = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setVisible(entries.some((entry) => entry.isIntersecting));
      },
      { rootMargin: '80px' },
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return { elementRef, visible };
}

function SpriteImagePreview({
  imageUrl,
  alt,
  width,
  height,
  sprite,
}: {
  imageUrl: string;
  alt: string;
  width: number;
  height: number;
  sprite: SpriteInfo;
}) {
  const { elementRef, visible } = useVisibility<HTMLDivElement>();
  const [frameIndex, setFrameIndex] = useState(0);
  const rafRef = useRef<number>();
  const lastFrameRef = useRef(0);

  useEffect(() => {
    if (!visible) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
      }
      return;
    }

    const frameDuration = 1000 / 12;
    const tick = (now: number) => {
      if (!lastFrameRef.current) {
        lastFrameRef.current = now;
      }

      if (now - lastFrameRef.current >= frameDuration) {
        lastFrameRef.current = now;
        setFrameIndex((current) => (current + 1) % sprite.frameCount);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    lastFrameRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
      }
    };
  }, [visible, sprite.frameCount]);

  const displayHeight = height;
  const displayWidth = Math.min(
    width,
    Math.round((displayHeight * sprite.frameWidth) / sprite.frameHeight),
  );
  const backgroundSizeX = `${sprite.frameCount * 100}% 100%`;
  const backgroundPositionX =
    sprite.frameCount > 1 ? `${(frameIndex / (sprite.frameCount - 1)) * 100}%` : '0%';

  return (
    <div
      ref={elementRef}
      role="img"
      aria-label={alt}
      title={imageUrl}
      style={{
        width: displayWidth,
        height: displayHeight,
        maxWidth: '100%',
        maxHeight: '100%',
        backgroundImage: `url("${imageUrl}")`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: backgroundSizeX,
        backgroundPosition: `${backgroundPositionX} center`,
        imageRendering: 'auto',
      }}
    />
  );
}

export default function PetRasterPreview({
  src,
  alt = 'PNG 预览',
  width = 64,
  height = 64,
}: PetRasterPreviewProps) {
  const imageUrl = resolvePetAssetUrl(src);
  const { loading, error, imageInfo } = useImageInfo(imageUrl);
  const spriteInfo = useMemo(() => getSpriteInfo(imageInfo, imageUrl), [imageInfo, imageUrl]);

  if (!imageUrl) {
    return (
      <div style={frameStyle(width, height)}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false} />
      </div>
    );
  }

  return (
    <div title={imageUrl} style={{ ...frameStyle(width, height), position: 'relative' }}>
      {spriteInfo ? (
        <SpriteImagePreview
          key={`${imageUrl}:${spriteInfo.frameCount}`}
          imageUrl={imageUrl}
          alt={alt}
          width={width}
          height={height}
          sprite={spriteInfo}
        />
      ) : (
        <Image
          src={imageUrl}
          alt={alt}
          preview={{ src: imageUrl }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      )}
      {loading ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.72)',
          }}
        >
          <Spin size="small" />
        </div>
      ) : null}
      {error ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 4,
            background: 'rgba(255,255,255,0.92)',
          }}
        >
          <Typography.Text
            type="danger"
            style={{ fontSize: 11, textAlign: 'center', lineHeight: 1.3 }}
          >
            {error}
          </Typography.Text>
        </div>
      ) : null}
    </div>
  );
}
