// In-browser background removal (ONNX model served from /bg-removal, see scripts/fetch-bg-model.mjs).
import { loadImage, trimTransparent } from './render/images';

export async function removeBackground(dataUrl: string, onProgress?: (pct: number, label: string) => void): Promise<string> {
  const { removeBackground: run } = await import('@imgly/background-removal');
  const blob = await (await fetch(dataUrl)).blob();
  const out = await run(blob, {
    publicPath: new URL('/bg-removal/', window.location.href).href,
    model: 'isnet_fp16',
    output: { format: 'image/png', quality: 1 },
    progress: (key: string, current: number, total: number) => {
      const label = key.includes('fetch') ? 'Downloading model' : 'Removing background';
      onProgress?.(total ? Math.round((current / total) * 100) : 0, label);
    },
  });
  const url = URL.createObjectURL(out);
  try {
    const img = await loadImage(url);
    // Crop to the subject so sizing/anchoring in layouts is predictable.
    return trimTransparent(img).toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Read a File into a data URL, downscaling very large photos to keep documents light. */
export async function fileToDataUrl(file: File, maxSide = 3000): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const s = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * s);
    c.height = Math.round(img.naturalHeight * s);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    const isPng = file.type === 'image/png' || file.type === 'image/svg+xml' || file.type === 'image/webp';
    return isPng ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.92);
  } finally {
    URL.revokeObjectURL(url);
  }
}
