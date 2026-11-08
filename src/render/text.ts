import type { TextProps } from '../model';

export interface Run {
  text: string;
  bold: boolean;
}
interface LaidRun extends Run {
  width: number;
}
export interface Line {
  runs: LaidRun[];
  width: number;
}
export interface TextLayout {
  lines: Line[];
  fontSize: number;
  lineHeight: number;
  width: number;
  height: number;
  overflow: boolean;
}

/** Parses **bold** markers into runs. */
export function parseRuns(text: string): Run[] {
  const runs: Run[] = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  for (const p of parts) {
    if (!p) continue;
    if (p.startsWith('**') && p.endsWith('**')) runs.push({ text: p.slice(2, -2), bold: true });
    else runs.push({ text: p, bold: false });
  }
  return runs;
}

export function fontString(p: Pick<TextProps, 'font' | 'weight'>, size: number, bold = false): string {
  const w = bold ? Math.max(700, p.weight) : p.weight;
  return `${w} ${size}px "${p.font}"`;
}

/** Word-wraps runs into lines no wider than maxWidth. Honours explicit newlines. */
function wrap(ctx: CanvasRenderingContext2D, props: TextProps, runs: Run[], size: number, maxWidth: number): Line[] {
  // Tokenise into words that remember their run style; '\n' forces a break.
  type Tok = { text: string; bold: boolean; br?: boolean };
  const toks: Tok[] = [];
  for (const r of runs) {
    const pieces = r.text.split(/(\n|\s+)/);
    for (const piece of pieces) {
      if (!piece) continue;
      if (piece === '\n') toks.push({ text: '', bold: r.bold, br: true });
      else if (/^\s+$/.test(piece)) toks.push({ text: ' ', bold: r.bold });
      else toks.push({ text: piece, bold: r.bold });
    }
  }
  const measure = (t: string, bold: boolean) => {
    ctx.font = fontString(props, size, bold);
    return ctx.measureText(t).width;
  };

  const lines: Line[] = [];
  let cur: LaidRun[] = [];
  let curW = 0;
  const push = () => {
    // drop trailing spaces
    while (cur.length && cur[cur.length - 1].text === ' ') {
      curW -= cur[cur.length - 1].width;
      cur.pop();
    }
    lines.push({ runs: mergeRuns(cur), width: curW });
    cur = [];
    curW = 0;
  };
  for (const t of toks) {
    if (t.br) {
      push();
      continue;
    }
    if (t.text === ' ' && cur.length === 0) continue;
    const w = measure(t.text, t.bold);
    if (t.text !== ' ' && curW + w > maxWidth && cur.length) push();
    cur.push({ text: t.text, bold: t.bold, width: w });
    curW += w;
  }
  push();
  return lines;
}

function mergeRuns(runs: LaidRun[]): LaidRun[] {
  const out: LaidRun[] = [];
  for (const r of runs) {
    const last = out[out.length - 1];
    if (last && last.bold === r.bold) {
      last.text += r.text;
      last.width += r.width;
    } else out.push({ ...r });
  }
  return out;
}

/**
 * Lays out text inside a box, shrinking from `size` toward `minSize` until it
 * fits within the box (and `maxLines`).
 */
export function layoutText(
  ctx: CanvasRenderingContext2D,
  props: TextProps,
  box: { w: number; h: number },
  size: number,
  minSize: number,
  maxLines = Infinity,
): TextLayout {
  const raw = props.uppercase ? props.text.toUpperCase() : props.text;
  const runs = parseRuns(raw);
  let s = size;
  let best: TextLayout | undefined;
  for (let i = 0; i < 60; i++) {
    const lines = wrap(ctx, props, runs, s, box.w);
    const lh = s * props.lineHeight;
    const width = Math.max(0, ...lines.map((l) => l.width));
    const height = lines.length * lh;
    const fits = height <= box.h + 0.5 && width <= box.w + 0.5 && lines.length <= maxLines;
    best = { lines, fontSize: s, lineHeight: lh, width, height, overflow: !fits };
    if (fits || s <= minSize) break;
    s = Math.max(minSize, s * 0.95);
  }
  return best!;
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  props: TextProps,
  layout: TextLayout,
  x: number,
  y: number,
  w: number,
  align: 'left' | 'center' | 'right',
) {
  ctx.save();
  ctx.globalAlpha = props.opacity;
  ctx.fillStyle = props.color;
  ctx.textBaseline = 'alphabetic';
  if (props.shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = layout.fontSize * 0.12;
    ctx.shadowOffsetY = layout.fontSize * 0.04;
  }
  // Baseline sits ~80% down the line box for these fonts.
  const baselineOffset = layout.lineHeight / 2 + layout.fontSize * 0.35;
  layout.lines.forEach((line, i) => {
    let lx = x;
    if (align === 'center') lx = x + (w - line.width) / 2;
    if (align === 'right') lx = x + w - line.width;
    const ly = y + i * layout.lineHeight + baselineOffset;
    for (const r of line.runs) {
      ctx.font = fontString(props, layout.fontSize, r.bold);
      ctx.fillText(r.text, lx, ly);
      lx += r.width;
    }
  });
  ctx.restore();
}
