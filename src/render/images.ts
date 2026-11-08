// Image cache shared by the renderer. Images load asynchronously; listeners are
// notified so previews can redraw once pixels are available.

type Listener = () => void;
const listeners = new Set<Listener>();
const cache = new Map<string, HTMLImageElement | 'loading' | 'error'>();
const pending = new Set<Promise<void>>();

/** Resolves once every image that is currently loading has settled. */
export async function settleLoads(): Promise<void> {
  while (pending.size) await Promise.all([...pending]);
}

export function onImageLoaded(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((l) => l());
}

/** Returns the image if loaded, otherwise kicks off a load and returns undefined. */
export function getImage(src: string | undefined): HTMLImageElement | undefined {
  if (!src) return undefined;
  const hit = cache.get(src);
  if (hit instanceof HTMLImageElement) return hit;
  if (hit) return undefined;
  cache.set(src, 'loading');
  const img = new Image();
  img.decoding = 'async';
  const done = new Promise<void>((resolve) => {
    img.onload = () => {
      cache.set(src, img);
      resolve();
      notify();
    };
    img.onerror = () => {
      cache.set(src, 'error');
      resolve();
    };
  });
  pending.add(done);
  done.then(() => pending.delete(done));
  img.src = src;
  return undefined;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  const hit = cache.get(src);
  if (hit instanceof HTMLImageElement) return Promise.resolve(hit);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      cache.set(src, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
}

export function svgDataUrl(svg: string): string {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/** Wait until every image referenced by `srcs` is decoded (used before export). */
export async function preload(srcs: (string | undefined)[]): Promise<void> {
  await Promise.all(srcs.filter(Boolean).map((s) => loadImage(s!).catch(() => undefined)));
}

// ---------- canvas helpers ----------

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

let filterSupport: boolean | undefined;
/** Safari (before 18) lacks ctx.filter; we fall back to manual implementations. */
export function supportsCanvasFilter(): boolean {
  if (filterSupport === undefined) {
    const ctx = makeCanvas(1, 1).getContext('2d')!;
    ctx.filter = 'blur(2px)';
    filterSupport = ctx.filter === 'blur(2px)';
  }
  return filterSupport;
}

/** Small LRU for expensive derived canvases (blurred backgrounds, borders...). */
export class CanvasLRU {
  private map = new Map<string, HTMLCanvasElement>();
  constructor(private max = 12) {}
  get(key: string, make: () => HTMLCanvasElement): HTMLCanvasElement {
    const hit = this.map.get(key);
    if (hit) {
      this.map.delete(key);
      this.map.set(key, hit);
      return hit;
    }
    const c = make();
    this.map.set(key, c);
    if (this.map.size > this.max) this.map.delete(this.map.keys().next().value!);
    return c;
  }
}

/** Gaussian-ish blur of a canvas, returns a new canvas of the same size. */
export function blurCanvas(src: HTMLCanvasElement, radius: number): HTMLCanvasElement {
  if (radius < 0.5) return src;
  const out = makeCanvas(src.width, src.height);
  const ctx = out.getContext('2d')!;
  if (supportsCanvasFilter()) {
    ctx.filter = `blur(${radius}px)`;
    ctx.drawImage(src, 0, 0);
    return out;
  }
  // Fallback: progressive downscale then upscale with smoothing.
  const factor = Math.max(1, radius / 2);
  const small = makeCanvas(src.width / factor, src.height / factor);
  const sctx = small.getContext('2d')!;
  sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(src, 0, 0, small.width, small.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, 0, 0, out.width, out.height);
  return out;
}

export function grayscaleCanvas(src: CanvasImageSource & { width: number; height: number }): HTMLCanvasElement {
  const out = makeCanvas(src.width, src.height);
  const ctx = out.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0);
  const data = ctx.getImageData(0, 0, out.width, out.height);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    const y = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
    d[i] = d[i + 1] = d[i + 2] = y;
  }
  ctx.putImageData(data, 0, 0);
  return out;
}

/** Trim fully transparent margins from an image (used after background removal). */
export function trimTransparent(img: HTMLImageElement | HTMLCanvasElement): HTMLCanvasElement {
  const w = img.width;
  const h = img.height;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 12) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return c;
  const out = makeCanvas(x1 - x0 + 1, y1 - y0 + 1);
  out.getContext('2d')!.drawImage(c, -x0, -y0);
  return out;
}
