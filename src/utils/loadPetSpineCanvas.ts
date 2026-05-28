import {
  parseSpineAssetPaths,
  resolvePetAssetUrl,
  type SpineLayoutBounds,
} from '@/utils/petAssetUrl';

type SpineCanvasModule = typeof import('@esotericsoftware/spine-canvas');

export interface SpineCanvasRuntime {
  skeleton: InstanceType<SpineCanvasModule['Skeleton']>;
  state: InstanceType<SpineCanvasModule['AnimationState']>;
  renderer: InstanceType<SpineCanvasModule['SkeletonRenderer']>;
  Physics: SpineCanvasModule['Physics'];
  layoutBounds: SpineLayoutBounds;
  disposed: boolean;
  dispose: () => void;
}

let spineModulePromise: Promise<SpineCanvasModule> | null = null;

function loadSpineModule(): Promise<SpineCanvasModule> {
  if (!spineModulePromise) {
    spineModulePromise = import('@esotericsoftware/spine-canvas');
  }
  return spineModulePromise;
}

/** Spine AssetManager.dispose 在 atlas/texture 交叉释放时会抛错，预览场景做安全清理 */
export function disposeSpineCanvasRuntime(runtime: SpineCanvasRuntime | null | undefined) {
  runtime?.dispose();
}

function resolveLayoutBounds(
  skeleton: InstanceType<SpineCanvasModule['Skeleton']>,
): SpineLayoutBounds {
  const { x, y, width, height } = skeleton.data;
  if (width > 0 && height > 0) {
    return { x, y, width, height };
  }

  skeleton.setupPose();
  const rect = skeleton.getBoundsRect();
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  };
}

export async function loadSpineCanvasRuntime(
  skeletonJsonUrl: string,
  canvas: HTMLCanvasElement,
): Promise<SpineCanvasRuntime> {
  const spine = await loadSpineModule();
  const {
    AnimationState,
    AnimationStateData,
    AssetManager,
    AtlasAttachmentLoader,
    Physics,
    Skeleton,
    SkeletonJson,
    SkeletonRenderer,
  } = spine;

  const fullUrl = resolvePetAssetUrl(skeletonJsonUrl);
  if (!fullUrl) {
    throw new Error('骨骼 JSON 地址为空');
  }

  const { pathPrefix, skeletonFile, atlasFile } = parseSpineAssetPaths(fullUrl);
  const assetManager = new AssetManager(pathPrefix);
  assetManager.loadText(skeletonFile);
  assetManager.loadTextureAtlas(atlasFile);
  await assetManager.loadAll();

  if (assetManager.hasErrors()) {
    const errors = Object.values(assetManager.getErrors());
    throw new Error(errors.join('；') || '骨骼资源加载失败');
  }

  const atlas = assetManager.require(atlasFile) as InstanceType<SpineCanvasModule['TextureAtlas']>;
  const attachmentLoader = new AtlasAttachmentLoader(atlas);
  const skeletonJson = new SkeletonJson(attachmentLoader);
  const skeletonData = skeletonJson.readSkeletonData(assetManager.require(skeletonFile));

  const skeleton = new Skeleton(skeletonData);
  skeleton.setupPose();

  const state = new AnimationState(new AnimationStateData(skeleton.data));
  const idleAnimation = skeleton.data.animations.find((item) => item.name === 'idle');
  const firstAnimation = idleAnimation ?? skeleton.data.animations[0];
  if (firstAnimation) {
    state.setAnimation(0, firstAnimation.name, true);
  }

  state.apply(skeleton);
  skeleton.updateWorldTransform(Physics.update);

  const layoutBounds = resolveLayoutBounds(skeleton);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D 不可用');
  }

  const renderer = new SkeletonRenderer(ctx);
  // wugui 等资源大量使用 MeshAttachment，必须开启三角面渲染
  renderer.triangleRendering = true;

  const runtime: SpineCanvasRuntime = {
    skeleton,
    state,
    renderer,
    Physics,
    layoutBounds,
    disposed: false,
    dispose() {
      if (this.disposed) {
        return;
      }
      this.disposed = true;
      try {
        this.state.clearTracks();
      } catch {
        // ignore
      }
      try {
        assetManager.dispose();
      } catch {
        // spine-canvas 卸载时 atlas/texture 可能已被移除，忽略即可
      }
    },
  };

  return runtime;
}

export function drawSpineCanvasFrame(
  runtime: SpineCanvasRuntime,
  canvas: HTMLCanvasElement,
  delta: number,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }

  const { skeleton, state, renderer, Physics, layoutBounds } = runtime;
  if (runtime.disposed) {
    return;
  }
  state.update(delta);
  state.apply(skeleton);
  skeleton.updateWorldTransform(Physics.update);

  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  if (!layoutBounds.width || !layoutBounds.height) {
    return;
  }

  const padding = 0.08;
  const scale =
    Math.min(width / layoutBounds.width, height / layoutBounds.height) * (1 - padding * 2);

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(scale, -scale);
  ctx.translate(
    -layoutBounds.x - layoutBounds.width / 2,
    -layoutBounds.y - layoutBounds.height / 2,
  );
  renderer.draw(skeleton);
  ctx.restore();
}
