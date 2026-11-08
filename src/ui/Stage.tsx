import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { formatById } from '../formats';
import { layoutById } from '../layouts';
import { buildScene, renderScene, type RenderItem } from '../render/renderer';
import { setOverride, store, useApp } from '../state';
import { Slider, Toggle } from './fields';
import { useRenderTick } from './useRenderTick';

export function Stage() {
  const doc = useApp((s) => s.doc);
  const formatId = useApp((s) => s.formatId);
  const selectedId = useApp((s) => s.selectedId);
  const format = formatById(formatId);
  const layout = layoutById(doc.layoutId);
  const tick = useRenderTick();

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState({ w: 800, h: 450 });

  useLayoutEffect(() => {
    const el = wrapRef.current!;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fit the format into the available area.
  const ar = format.width / format.height;
  let dw = box.w;
  let dh = dw / ar;
  if (dh > box.h) {
    dh = box.h;
    dw = dh * ar;
  }
  dw = Math.max(50, Math.floor(dw));
  dh = Math.max(50, Math.floor(dh));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = Math.min(format.width, Math.round(dw * dpr));
  const ch = Math.round(cw / ar);
  const k = dw / cw; // canvas px -> css px

  const items = useMemo(() => buildScene(doc, layout, format, cw, ch), [doc, layout, format, cw, ch, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const c = canvasRef.current!;
    const ctx = c.getContext('2d')!;
    renderScene(ctx, items);
  }, [items]);

  // ---------- dragging ----------
  const drag = useRef<{ id: string; x: number; y: number; dx: number; dy: number; moved: boolean } | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const hit = (e: React.PointerEvent): RenderItem | undefined => {
    const r = canvasRef.current!.getBoundingClientRect();
    const x = (e.clientX - r.left) / k;
    const y = (e.clientY - r.top) / k;
    // Prefer small/foreground items: check top-most first, skip big decorative layers unless nothing else.
    const hits = [...items].reverse().filter((i) => i.movable && i.bounds && x >= i.bounds.x && x <= i.bounds.x + i.bounds.w && y >= i.bounds.y && y <= i.bounds.y + i.bounds.h);
    return hits.find((i) => i.type !== 'skyline' && i.type !== 'wave') ?? hits[0];
  };

  const onDown = (e: React.PointerEvent) => {
    const it = hit(e);
    store.set({ selectedId: it?.id ?? null });
    if (!it) return;
    const ov = doc.overrides[formatId]?.[it.id];
    drag.current = { id: it.id, x: e.clientX, y: e.clientY, dx: ov?.dx ?? 0, dy: ov?.dy ?? 0, moved: false };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) {
      setHover(hit(e)?.id ?? null);
      return;
    }
    const mx = e.clientX - d.x;
    const my = e.clientY - d.y;
    if (!d.moved && Math.hypot(mx, my) < 3) return;
    d.moved = true;
    setOverride(formatId, d.id, { dx: d.dx + mx / dw, dy: d.dy + my / dh }, `drag:${formatId}:${d.id}`);
  };
  const onUp = () => {
    drag.current = null;
  };

  const sel = items.find((i) => i.id === selectedId);
  const hov = hover && hover !== selectedId ? items.find((i) => i.id === hover) : undefined;
  const overflow = items.filter((i) => i.overflow);

  return (
    <div className="stage">
      <div className="stage-head">
        <div>
          <strong>{format.name}</strong>
          <span className="muted">
            {' '}
            · {format.width}×{format.height}
          </span>
        </div>
        {overflow.length > 0 && (
          <div className="warn" role="status">
            ⚠ {overflow.map((o) => o.label).join(', ')} {overflow.length > 1 ? "don't" : "doesn't"} fit at the minimum size. Shorten the text or
            scale it down here.
          </div>
        )}
      </div>
      <div className="stage-canvas-wrap" ref={wrapRef}>
        <div className="stage-canvas" style={{ width: dw, height: dh }}>
          <canvas
            ref={canvasRef}
            width={cw}
            height={ch}
            style={{ width: dw, height: dh, cursor: hover ? 'move' : 'default' }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={() => setHover(null)}
          />
          {hov?.bounds && <Outline r={hov.bounds} k={k} cls="hover" />}
          {sel?.bounds && <Outline r={sel.bounds} k={k} cls={sel.overflow ? 'selected overflow' : 'selected'} label={sel.label} />}
        </div>
      </div>
      <SelectionTools />
    </div>
  );
}

function Outline({ r, k, cls, label }: { r: { x: number; y: number; w: number; h: number }; k: number; cls: string; label?: string }) {
  return (
    <div className={'outline ' + cls} style={{ left: r.x * k, top: r.y * k, width: r.w * k, height: r.h * k }}>
      {label && <span className="outline-label">{label}</span>}
    </div>
  );
}

/** Per-format adjustments for the selected component. */
function SelectionTools() {
  const selectedId = useApp((s) => s.selectedId);
  const formatId = useApp((s) => s.formatId);
  const ov = useApp((s) => (s.selectedId ? s.doc.overrides[s.formatId]?.[s.selectedId] : undefined));
  const layoutId = useApp((s) => s.doc.layoutId);
  const spec = layoutById(layoutId).components.find((c) => c.id === selectedId);
  if (!spec || spec.type === 'background') {
    return <div className="tools muted small">Click an element on the canvas to move or resize it for this format only.</div>;
  }
  const format = formatById(formatId);
  const hasOv = !!ov && (ov.dx || ov.dy || (ov.scale && ov.scale !== 1) || ov.hidden);
  return (
    <div className="tools">
      <strong>{spec.label}</strong>
      <span className="muted small">in {format.name}:</span>
      {spec.type !== 'panel' && (
        <div className="tool-slider">
          <Slider
            label="Scale"
            value={ov?.scale ?? 1}
            min={0.4}
            max={2}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => setOverride(formatId, spec.id, { scale: v }, `scale:${formatId}:${spec.id}`)}
          />
        </div>
      )}
      <Toggle label="Hide here" checked={!!ov?.hidden} onChange={(v) => setOverride(formatId, spec.id, { hidden: v })} />
      <button className="btn small ghost" disabled={!hasOv} onClick={() => setOverride(formatId, spec.id, null)}>
        Reset
      </button>
      <span className="muted small">Drag on the canvas to move.</span>
    </div>
  );
}
