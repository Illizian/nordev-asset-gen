import { SVG, colorize, svgAspect, C } from '../brand';
import { CLASS_FALLBACK, aspectClass } from '../formats';
import type {
  BackgroundProps,
  BadgeProps,
  ComponentSpec,
  Doc,
  Format,
  GraphicProps,
  LayoutDef,
  LogoProps,
  Override,
  PanelProps,
  Placement,
  PrependProps,
  SkylineProps,
  Speaker,
  SpeakersProps,
  TextProps,
  WaveProps,
} from '../model';
import { CanvasLRU, blurCanvas, getImage, grayscaleCanvas, makeCanvas, svgDataUrl } from './images';
import { drawText, layoutText } from './text';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RenderItem {
  id: string;
  type: string;
  label: string;
  bounds: Rect | null;
  /** Can the user drag it on the canvas? */
  movable: boolean;
  overflow?: boolean;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

export interface RenderContext {
  doc: Doc;
  layout: LayoutDef;
  W: number;
  H: number;
  /** 1% of the canvas short side, in px. */
  u: number;
  format: Format;
  img: (assetId?: string) => HTMLImageElement | undefined;
}

const bgCache = new CanvasLRU(10);
const derivedCache = new CanvasLRU(40);

// ------------------------------------------------------------------ placement

export function placementsFor(layout: LayoutDef, format: Format): Record<string, Placement> {
  for (const cls of CLASS_FALLBACK[aspectClass(format)]) {
    const p = layout.placements[cls];
    if (p) return p;
  }
  return {};
}

function resolveBox(rc: RenderContext, p: Placement, o: Override | undefined): Rect {
  const [bx, by, bw, bh] = p.box;
  let r: Rect = { x: bx * rc.W, y: by * rc.H, w: bw * rc.W, h: bh * rc.H };
  if (o?.scale && o.scale !== 1) {
    // scale around the anchor implied by alignment so text grows "away" from its edge
    const ax = p.align === 'right' ? 1 : p.align === 'center' ? 0.5 : 0;
    const ay = p.valign === 'bottom' ? 1 : p.valign === 'middle' ? 0.5 : 0;
    const nw = r.w * o.scale;
    const nh = r.h * o.scale;
    r = { x: r.x + (r.w - nw) * ax, y: r.y + (r.h - nh) * ay, w: nw, h: nh };
  }
  if (o?.dx) r.x += o.dx * rc.W;
  if (o?.dy) r.y += o.dy * rc.H;
  return r;
}

function alignIn(box: Rect, w: number, h: number, p: Placement): Rect {
  const x = p.align === 'right' ? box.x + box.w - w : p.align === 'center' ? box.x + (box.w - w) / 2 : box.x;
  const y = p.valign === 'bottom' ? box.y + box.h - h : p.valign === 'middle' ? box.y + (box.h - h) / 2 : box.y;
  return { x, y, w, h };
}

function roundRect(ctx: CanvasRenderingContext2D, r: Rect, radius: number) {
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, Math.min(radius, r.w / 2, r.h / 2));
}

function svgImg(svg: string): HTMLImageElement | undefined {
  return getImage(svgDataUrl(svg));
}

// ------------------------------------------------------------------ background

function coverRect(iw: number, ih: number, W: number, H: number, zoom: number, fx: number, fy: number): Rect {
  const s = Math.max(W / iw, H / ih) * zoom;
  const w = iw * s;
  const h = ih * s;
  return { x: (W - w) * fx, y: (H - h) * fy, w, h };
}

function renderBackground(rc: RenderContext, p: BackgroundProps, extraBlur = 0): HTMLCanvasElement {
  const { W, H } = rc;
  const img = rc.img(p.image);
  const key = [p.image, img ? 1 : 0, W, H, p.focusX, p.focusY, p.zoom, p.blur, p.tint, p.tintStrength, p.darken, p.grayscale, extraBlur].join('|');
  return bgCache.get(key, () => {
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d')!;
    // Base: brand gradient (shows when no photo is set).
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, C.Purple);
    g.addColorStop(1, C.Plum);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (img) {
      let photo = makeCanvas(W, H);
      const pctx = photo.getContext('2d')!;
      const r = coverRect(img.naturalWidth, img.naturalHeight, W, H, p.zoom, p.focusX, p.focusY);
      const radius = ((p.blur + extraBlur) * Math.min(W, H)) / 1000;
      // Over-draw by the blur radius so edges don't fade to transparent.
      const pad = radius * 2;
      pctx.drawImage(img, r.x - pad, r.y - pad, r.w + pad * 2, r.h + pad * 2);
      if (p.grayscale) photo = grayscaleCanvas(photo);
      photo = blurCanvas(photo, radius);
      ctx.drawImage(photo, 0, 0);
    }
    if (p.tintStrength > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = p.tintStrength;
      ctx.fillStyle = p.tint;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    if (p.darken > 0) {
      ctx.fillStyle = `rgba(0,0,0,${p.darken})`;
      ctx.fillRect(0, 0, W, H);
    }
    return c;
  });
}

// ------------------------------------------------------------------ speakers

/** Draws a solid silhouette ring around a transparent cut-out ("sticker" border). */
function stickerBorder(src: CanvasImageSource, w: number, h: number, r: number, color: string, key: string): HTMLCanvasElement {
  return derivedCache.get(`border|${key}|${Math.round(w)}|${Math.round(h)}|${Math.round(r)}|${color}`, () => {
    const c = makeCanvas(w + r * 2, h + r * 2);
    const ctx = c.getContext('2d')!;
    const steps = Math.max(16, Math.min(48, Math.round(r * 2)));
    for (const rr of [r, r * 0.66, r * 0.33]) {
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        ctx.drawImage(src, r + Math.cos(a) * rr, r + Math.sin(a) * rr, w, h);
      }
    }
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, c.width, c.height);
    return c;
  });
}

function speakerSource(rc: RenderContext, s: Speaker, shape: SpeakersProps['shape']) {
  const id = shape === 'cutout' && s.useCutout && s.cutout ? s.cutout : s.image;
  const img = rc.img(id);
  if (!img) return undefined;
  if (!s.grayscale) return { src: img as CanvasImageSource, w: img.naturalWidth, h: img.naturalHeight, key: id! };
  const g = derivedCache.get(`gray|${id}`, () => grayscaleCanvas(img));
  return { src: g as CanvasImageSource, w: g.width, h: g.height, key: `${id}-g` };
}

function layoutSpeakers(rc: RenderContext, p: SpeakersProps, box: Rect, pl: Placement) {
  const items = p.speakers
    .map((s) => ({ s, src: speakerSource(rc, s, p.shape) }))
    .filter((x) => x.src) as { s: Speaker; src: NonNullable<ReturnType<typeof speakerSource>> }[];
  if (!items.length) return { slots: [], bounds: null as Rect | null };
  const h = box.h;
  let widths = items.map(({ s, src }) => {
    if (p.shape === 'cutout') return h * s.zoom * (src.w / src.h);
    if (p.shape === 'circle') return h;
    return h * 0.8;
  });
  const gap = p.shape === 'cutout' ? 0 : rc.u * 1.5;
  const step = (i: number) => widths[i] * (1 - p.overlap);
  let total = widths.reduce((a, w, i) => a + (i < widths.length - 1 ? step(i) + gap : w), 0);
  let scale = 1;
  if (total > box.w) {
    scale = box.w / total;
    widths = widths.map((w) => w * scale);
    total = box.w;
  }
  const start = pl.align === 'left' ? box.x : pl.align === 'right' ? box.x + box.w - total : box.x + (box.w - total) / 2;
  let x = start;
  const slots = items.map(({ s, src }, i) => {
    const w = widths[i];
    const sh = h * scale;
    const slot = { x, y: box.y + box.h - (p.shape === 'cutout' ? sh * s.zoom : sh), w, h: p.shape === 'cutout' ? sh * s.zoom : sh };
    x += step(i) * (i < items.length - 1 ? 1 : 0) + gap;
    return { s, src, slot };
  });
  const bounds = slots.reduce<Rect | null>((acc, { slot }) => union(acc, slot), null);
  return { slots, bounds };
}

function drawSpeakers(ctx: CanvasRenderingContext2D, rc: RenderContext, p: SpeakersProps, box: Rect, pl: Placement) {
  const { slots } = layoutSpeakers(rc, p, box, pl);
  const bw = p.border ? p.borderWidth * rc.u : 0;
  for (const { s, src, slot } of slots) {
    ctx.save();
    if (p.shape === 'cutout') {
      // Cut-outs are scaled to the slot height and nudged by offsets; never cropped.
      const w = slot.w;
      const h = slot.h;
      const x = slot.x + s.offsetX * w;
      const y = slot.y + s.offsetY * h;
      if (bw > 0) {
        const b = stickerBorder(src.src, w, h, bw, p.borderColor, src.key);
        ctx.drawImage(b, x - bw, y - bw);
      }
      ctx.drawImage(src.src, x, y, w, h);
    } else {
      const shape = new Path2D();
      if (p.shape === 'circle') {
        const d = Math.min(slot.w, slot.h);
        shape.arc(slot.x + slot.w / 2, slot.y + slot.h - d / 2, d / 2, 0, Math.PI * 2);
      } else shape.roundRect(slot.x, slot.y, slot.w, slot.h, rc.u * 1.2);
      ctx.save();
      ctx.clip(shape);
      const r = coverRect(src.w, src.h, slot.w, slot.h, s.zoom, 0.5 - s.offsetX / 2, 0.5 - s.offsetY / 2);
      ctx.drawImage(src.src, slot.x + r.x, slot.y + r.y, r.w, r.h);
      ctx.restore();
      if (bw > 0) {
        ctx.lineWidth = bw;
        ctx.strokeStyle = p.borderColor;
        ctx.stroke(shape);
      }
    }
    ctx.restore();
  }
}

// ------------------------------------------------------------------ helpers

function union(a: Rect | null, b: Rect | null): Rect | null {
  if (!a) return b;
  if (!b) return a;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

function containIn(box: Rect, aspect: number, pl: Placement): Rect {
  let w = box.w;
  let h = w / aspect;
  if (h > box.h) {
    h = box.h;
    w = h * aspect;
  }
  return alignIn(box, w, h, pl);
}

// ------------------------------------------------------------------ main

/**
 * Lays out every enabled component for a format and returns drawable items
 * in paint order. Pure function of (doc, layout, size), so the preview and the
 * exported file are rendered by exactly the same code.
 */
export function buildScene(doc: Doc, layout: LayoutDef, format: Format, W: number, H: number): RenderItem[] {
  const rc: RenderContext = {
    doc,
    layout,
    W,
    H,
    u: Math.min(W, H) / 100,
    format,
    img: (id) => (id ? getImage(doc.assets[id]) : undefined),
  };
  const placements = placementsFor(layout, format);
  const overrides = doc.overrides[format.id] ?? {};
  const measure = makeCanvas(1, 1).getContext('2d')!;
  const items: RenderItem[] = [];
  const bgSpec = layout.components.find((c) => c.type === 'background');
  const bgProps = bgSpec ? (doc.components[bgSpec.id]?.props as BackgroundProps) : undefined;

  let speakersFront: RenderItem | undefined;

  for (const spec of layout.components) {
    const st = doc.components[spec.id];
    if (!st || !st.enabled) continue;
    const ov = overrides[spec.id];
    if (ov?.hidden) continue;
    let pl = placements[spec.id];
    // Background and panel size themselves; everything else needs a placement for this aspect class.
    const selfPlaced = spec.type === 'background' || spec.type === 'panel';
    if (pl?.hidden || (!pl && !selfPlaced)) continue;
    if (pl?.below) {
      // Flow under the referenced item: keep the box bottom, move its top.
      const ref = items.find((i) => i.id === pl!.below)?.bounds;
      if (ref) {
        const [x, y, w, h] = pl.box;
        const top = (ref.y + ref.h + (pl.gap ?? 1) * rc.u) / H;
        const bottom = y + h;
        pl = { ...pl, box: [x, top, w, Math.max(0.02, bottom - top)] };
      }
    }
    const item = buildItem(rc, spec, st.props, pl, ov, measure, items, bgProps);
    if (!item) continue;
    if (spec.type === 'speakers' && (st.props as SpeakersProps).inFrontOfWave) {
      speakersFront = item;
      continue;
    }
    items.push(item);
  }
  if (speakersFront) {
    // Insert immediately after the wave (or at the end if no wave).
    const waveIndex = items.findIndex((i) => i.type === 'wave');
    items.splice(waveIndex >= 0 ? waveIndex + 1 : items.length, 0, speakersFront);
  }
  return items;
}

function buildItem(
  rc: RenderContext,
  spec: ComponentSpec,
  props: unknown,
  pl: Placement | undefined,
  ov: Override | undefined,
  measure: CanvasRenderingContext2D,
  previous: RenderItem[],
  bgProps: BackgroundProps | undefined,
): RenderItem | null {
  const { W, H, u } = rc;
  const base = { id: spec.id, type: spec.type, label: spec.label };
  const scale = ov?.scale ?? 1;

  switch (spec.type) {
    case 'background': {
      const p = props as BackgroundProps;
      return { ...base, bounds: null, movable: false, draw: (ctx) => ctx.drawImage(renderBackground(rc, p), 0, 0) };
    }
    case 'skyline': {
      const p = props as SkylineProps;
      const box = resolveBox(rc, pl!, ov);
      const aspect = svgAspect(SVG.city);
      const w = box.w;
      const h = w / aspect;
      const r = { x: box.x, y: box.y + box.h - h, w, h };
      const img = svgImg(colorize(SVG.city, { main: p.color }));
      return {
        ...base,
        bounds: r,
        movable: true,
        draw: (ctx) => {
          if (!img) return;
          ctx.save();
          ctx.globalAlpha = p.opacity;
          ctx.drawImage(img, r.x, r.y, r.w, r.h);
          ctx.restore();
        },
      };
    }
    case 'wave': {
      const p = props as WaveProps;
      const box = resolveBox(rc, pl!, ov);
      const h = box.h * p.height;
      const r = { x: 0, y: box.y + box.h - h, w: W, h: h + 2 };
      const img = svgImg(SVG.wave);
      return {
        ...base,
        bounds: r,
        movable: true,
        draw: (ctx) => {
          if (!img) return;
          ctx.save();
          if (p.flip) {
            ctx.translate(W, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(img, r.x, r.y, r.w, r.h);
          ctx.restore();
        },
      };
    }
    case 'panel': {
      const p = props as PanelProps;
      const wrapped = (spec.wraps ?? [])
        .map((id) => previous.find((i) => i.id === id)?.bounds ?? null)
        .reduce<Rect | null>((a, b) => union(a, b), null);
      if (!wrapped) return null;
      const pad = p.padding * u;
      const r = { x: wrapped.x - pad, y: wrapped.y - pad, w: wrapped.w + pad * 2, h: wrapped.h + pad * 2 };
      const radius = p.radius * u;
      const item: RenderItem = {
        ...base,
        bounds: r,
        movable: false,
        draw: (ctx) => {
          ctx.save();
          roundRect(ctx, r, radius);
          ctx.clip();
          if (bgProps && p.blur > 0) ctx.drawImage(renderBackground(rc, bgProps, p.blur), 0, 0);
          ctx.globalAlpha = p.opacity;
          ctx.fillStyle = p.color;
          ctx.fillRect(r.x, r.y, r.w, r.h);
          ctx.restore();
        },
      };
      // The panel must paint beneath the items it wraps: insert it before the first of them.
      const firstIdx = previous.findIndex((i) => spec.wraps?.includes(i.id));
      if (firstIdx >= 0) {
        previous.splice(firstIdx, 0, item);
        return null;
      }
      return item;
    }
    case 'logo': {
      const p = props as LogoProps;
      const box = resolveBox(rc, pl!, ov);
      const svg = colorize(SVG.logo[p.variant], { main: p.main, accent: p.accent });
      const r = containIn(box, svgAspect(svg), pl!);
      const img = svgImg(svg);
      return { ...base, bounds: r, movable: true, draw: (ctx) => img && ctx.drawImage(img, r.x, r.y, r.w, r.h) };
    }
    case 'prepend': {
      const p = props as PrependProps;
      const box = resolveBox(rc, pl!, ov);
      const svg = colorize(SVG.prepend, { main: p.main, accent: p.accent });
      const aspect = svgAspect(svg);
      let s = (pl!.size ?? 6) * u * scale; // lockup cap height-ish
      const tp: TextProps = { text: p.suffix, font: 'Roboto Condensed', weight: 700, color: p.main, opacity: 1, shadow: false, uppercase: false, lineHeight: 1 };
      const widthFor = (s: number) => {
        measure.font = `700 ${s * 1.22}px "Roboto Condensed"`;
        return s * aspect + s * 0.75 + (p.suffix ? measure.measureText(p.suffix).width : 0);
      };
      if (widthFor(s) > box.w) s *= box.w / widthFor(s);
      const total = widthFor(s);
      const r = alignIn(box, total, s * 1.2, pl!);
      const img = svgImg(svg);
      return {
        ...base,
        bounds: r,
        movable: true,
        draw: (ctx) => {
          const top = r.y + s * 0.1;
          if (img) ctx.drawImage(img, r.x, top, s * aspect, s);
          // slash
          const sx = r.x + s * aspect + s * 0.12;
          ctx.save();
          ctx.strokeStyle = p.main;
          ctx.lineWidth = s * 0.085;
          ctx.lineCap = 'butt';
          ctx.beginPath();
          ctx.moveTo(sx + s * 0.08, top + s * 1.12);
          ctx.lineTo(sx + s * 0.38, top - s * 0.06);
          ctx.stroke();
          ctx.restore();
          if (p.suffix) {
            ctx.save();
            ctx.font = fontFor(tp, s * 1.22);
            ctx.fillStyle = p.main;
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(p.suffix, r.x + s * aspect + s * 0.66, top + s * 0.87);
            ctx.restore();
          }
        },
      };
    }
    case 'text': {
      const p = props as TextProps;
      if (!p.text.trim()) return null;
      const box = resolveBox(rc, pl!, ov);
      const size = (pl!.size ?? 6) * u * scale;
      const min = (pl!.minSize ?? (pl!.size ?? 6) * 0.5) * u * scale;
      const lay = layoutText(measure, p, box, size, min, pl!.maxLines);
      const r = alignIn(box, lay.width, lay.height, pl!);
      return {
        ...base,
        bounds: r,
        movable: true,
        overflow: lay.overflow,
        draw: (ctx) => drawText(ctx, p, lay, r.x, r.y, r.w, pl!.align ?? 'left'),
      };
    }
    case 'speakers': {
      const p = props as SpeakersProps;
      const box = resolveBox(rc, pl!, ov);
      const { bounds } = layoutSpeakers(rc, p, box, pl!);
      return { ...base, bounds: bounds ?? box, movable: true, draw: (ctx) => drawSpeakers(ctx, rc, p, box, pl!) };
    }
    case 'badge': {
      const p = props as BadgeProps;
      if (!p.text.trim()) return null;
      const box = resolveBox(rc, pl!, ov);
      const size = (pl!.size ?? 6) * u * scale;
      measure.font = `700 ${size}px "Roboto Condensed"`;
      const tw = measure.measureText(p.text).width;
      const padX = size * 0.45;
      const padY = size * 0.22;
      const r = alignIn(box, tw + padX * 2, size * 1.1 + padY * 2, pl!);
      return {
        ...base,
        bounds: r,
        movable: true,
        draw: (ctx) => {
          ctx.save();
          roundRect(ctx, r, size * 0.22);
          ctx.fillStyle = p.background;
          ctx.fill();
          if (p.borderColor !== 'transparent') {
            ctx.lineWidth = size * 0.08;
            ctx.strokeStyle = p.borderColor;
            ctx.stroke();
          }
          ctx.fillStyle = p.color;
          ctx.font = `700 ${size}px "Roboto Condensed"`;
          ctx.textBaseline = 'middle';
          ctx.fillText(p.text, r.x + padX, r.y + r.h / 2 + size * 0.04);
          ctx.restore();
        },
      };
    }
    case 'graphic': {
      const p = props as GraphicProps;
      const img = rc.img(p.image);
      const box = resolveBox(rc, pl!, ov);
      if (!img) return null;
      const r = containIn(box, img.naturalWidth / img.naturalHeight, pl!);
      return {
        ...base,
        bounds: r,
        movable: true,
        draw: (ctx) => {
          ctx.save();
          ctx.globalAlpha = p.opacity;
          ctx.globalCompositeOperation = p.blend === 'normal' ? 'source-over' : p.blend;
          ctx.drawImage(img, r.x, r.y, r.w, r.h);
          ctx.restore();
        },
      };
    }
  }
  void H;
  return null;
}

function fontFor(p: TextProps, size: number) {
  return `${p.weight} ${size}px "${p.font}"`;
}

export function renderScene(ctx: CanvasRenderingContext2D, items: RenderItem[]) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  for (const it of items) it.draw(ctx);
}

/** Every image source a document needs (for preloading before export). */
export function docImageSources(doc: Doc): string[] {
  return Object.values(doc.assets);
}
