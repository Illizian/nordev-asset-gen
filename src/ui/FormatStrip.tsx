import { useEffect, useRef, useState } from 'react';
import { FORMATS } from '../formats';
import { layoutById } from '../layouts';
import type { Doc, Format } from '../model';
import { buildScene, renderScene } from '../render/renderer';
import { store, useApp } from '../state';
import { useRenderTick } from './useRenderTick';

const THUMB_H = 92;

export function FormatStrip() {
  const doc = useApp((s) => s.doc);
  const formatId = useApp((s) => s.formatId);
  const tick = useRenderTick();
  // Debounce thumbnail redraws while typing/dragging.
  const [snap, setSnap] = useState(doc);
  useEffect(() => {
    const t = setTimeout(() => setSnap(doc), 180);
    return () => clearTimeout(t);
  }, [doc]);

  return (
    <nav className="strip" aria-label="Formats">
      {FORMATS.map((f) => (
        <Thumb key={f.id} f={f} doc={snap} tick={tick} active={f.id === formatId} />
      ))}
    </nav>
  );
}

function Thumb({ f, doc, tick, active }: { f: Format; doc: Doc; tick: number; active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [overflow, setOverflow] = useState(false);
  const w = Math.round((THUMB_H * f.width) / f.height);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = Math.round(w * dpr);
  const ch = Math.round(THUMB_H * dpr);
  const edited = Object.values(doc.overrides[f.id] ?? {}).some((o) => o.dx || o.dy || (o.scale && o.scale !== 1) || o.hidden);

  useEffect(() => {
    const items = buildScene(doc, layoutById(doc.layoutId), f, cw, ch);
    renderScene(ref.current!.getContext('2d')!, items);
    setOverflow(items.some((i) => i.overflow));
  }, [doc, f, cw, ch, tick]);

  return (
    <button className={'thumb-btn' + (active ? ' active' : '')} onClick={() => store.set({ formatId: f.id })} title={`${f.name} ${f.width}×${f.height}`}>
      <canvas ref={ref} width={cw} height={ch} style={{ width: w, height: THUMB_H }} />
      <span className="thumb-label">
        {f.name}
        {edited && <span className="dot" title="Adjusted for this format" />}
        {overflow && <span className="dot warn-dot" title="Text doesn't fit" />}
      </span>
      <span className="thumb-size">
        {f.width}×{f.height}
      </span>
    </button>
  );
}
