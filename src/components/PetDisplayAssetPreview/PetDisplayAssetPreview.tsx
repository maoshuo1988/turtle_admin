import { Typography } from 'antd';
import { getPetAssetKind } from '@/utils/petAssetUrl';
import PetRasterPreview from './PetRasterPreview';
import SpineCanvasPreview from './SpineCanvasPreview';

interface PetDisplayAssetPreviewProps {
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
}

export default function PetDisplayAssetPreview({
  src,
  alt = '资源预览',
  width = 64,
  height = 64,
}: PetDisplayAssetPreviewProps) {
  const trimmed = src?.trim();
  if (!trimmed) {
    return <Typography.Text type="secondary">—</Typography.Text>;
  }

  if (getPetAssetKind(trimmed) === 'spine') {
    return <SpineCanvasPreview src={trimmed} alt={alt} width={width} height={height} />;
  }

  return <PetRasterPreview src={trimmed} alt={alt} width={width} height={height} />;
}
