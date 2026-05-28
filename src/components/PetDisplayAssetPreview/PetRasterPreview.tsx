import { Empty, Image } from 'antd';
import type { CSSProperties } from 'react';
import { resolvePetAssetUrl } from '@/utils/petAssetUrl';

interface PetRasterPreviewProps {
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
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

export default function PetRasterPreview({
  src,
  alt = 'PNG 预览',
  width = 64,
  height = 64,
}: PetRasterPreviewProps) {
  const imageUrl = resolvePetAssetUrl(src);

  if (!imageUrl) {
    return (
      <div style={frameStyle(width, height)}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false} />
      </div>
    );
  }

  return (
    <div style={frameStyle(width, height)}>
      <Image
        src={imageUrl}
        alt={alt}
        preview={{ src: imageUrl }}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
        }}
      />
    </div>
  );
}
