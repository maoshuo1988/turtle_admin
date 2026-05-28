import { Spin, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';
import {
  disposeSpineCanvasRuntime,
  drawSpineCanvasFrame,
  loadSpineCanvasRuntime,
  type SpineCanvasRuntime,
} from '@/utils/loadPetSpineCanvas';
import { resolvePetAssetUrl } from '@/utils/petAssetUrl';

interface SpineCanvasPreviewProps {
  src?: string;
  width?: number;
  height?: number;
  alt?: string;
}

interface SpineCanvasPreviewInnerProps {
  src: string;
  width: number;
  height: number;
  alt: string;
}

function SpineCanvasPreviewInner({ src, width, height, alt }: SpineCanvasPreviewInnerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<SpineCanvasRuntime | null>(null);
  const rafRef = useRef<number>();
  const lastFrameRef = useRef<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setVisible(entries.some((entry) => entry.isIntersecting));
      },
      { rootMargin: '80px' },
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let cancelled = false;

    const boot = async () => {
      try {
        disposeSpineCanvasRuntime(runtimeRef.current);
        runtimeRef.current = null;
        const runtime = await loadSpineCanvasRuntime(src, canvas);
        if (cancelled) {
          disposeSpineCanvasRuntime(runtime);
          return;
        }
        runtimeRef.current = runtime;
        lastFrameRef.current = performance.now();
        setLoading(false);
      } catch (loadError) {
        if (!cancelled) {
          setLoading(false);
          setError(loadError instanceof Error ? loadError.message : '骨骼加载失败');
        }
      }
    };

    void boot();

    return () => {
      cancelled = true;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
      }
      disposeSpineCanvasRuntime(runtimeRef.current);
      runtimeRef.current = null;
    };
  }, [src]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !visible || !runtimeRef.current || loading || error) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
      }
      return;
    }

    const tick = (now: number) => {
      const runtime = runtimeRef.current;
      if (!runtime || runtime.disposed) {
        return;
      }
      const delta = Math.min((now - lastFrameRef.current) / 1000, 0.05);
      lastFrameRef.current = now;
      drawSpineCanvasFrame(runtime, canvas, delta);
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
  }, [visible, loading, error, src]);

  const resolved = resolvePetAssetUrl(src);

  return (
    <div
      title={resolved || alt}
      style={{
        width,
        height,
        borderRadius: 8,
        border: '1px solid #eaecf0',
        background: '#fafafa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <canvas ref={canvasRef} width={width} height={height} aria-label={alt} />
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

export default function SpineCanvasPreview({
  src,
  width = 64,
  height = 64,
  alt = '骨骼动画预览',
}: SpineCanvasPreviewProps) {
  const trimmed = src?.trim();
  if (!trimmed) {
    return <Typography.Text type="secondary">—</Typography.Text>;
  }

  return (
    <SpineCanvasPreviewInner
      key={trimmed}
      src={trimmed}
      width={width}
      height={height}
      alt={alt}
    />
  );
}
