import { useState } from 'react';
import { FONTS } from '../brand';
import { fileToDataUrl, removeBackground } from '../bgremove';
import type {
  BackgroundProps,
  BadgeProps,
  ComponentSpec,
  FontFamily,
  GraphicProps,
  LogoProps,
  PanelProps,
  PrependProps,
  SkylineProps,
  Speaker,
  SpeakersProps,
  TextProps,
  WaveProps,
} from '../model';
import { addAsset, setProps, updateDoc, useApp } from '../state';
import { ColorField, Field, ImagePicker, Select, Slider, Toggle } from './fields';

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Upload a file as a doc asset and set it on a prop in one undo step. */
async function uploadInto(file: File, apply: (assetId: string) => (d: import('../model').Doc) => import('../model').Doc) {
  const url = await fileToDataUrl(file);
  const a = addAsset(url);
  updateDoc((d) => apply(a.id)(a.apply(d)));
}

function setPropFn<T>(id: string, patch: Partial<T>) {
  return (d: import('../model').Doc) => ({
    ...d,
    components: { ...d.components, [id]: { ...d.components[id], props: { ...d.components[id].props, ...patch } } },
  });
}

export function ComponentEditor({ spec }: { spec: ComponentSpec }) {
  const props = useApp((s) => s.doc.components[spec.id]?.props);
  const assets = useApp((s) => s.doc.assets);
  if (!props) return null;
  const set = <T,>(patch: Partial<T>) => setProps(spec.id, patch as never);

  switch (spec.type) {
    case 'background': {
      const p = props as BackgroundProps;
      return (
        <>
          <ImagePicker
            label="Photo"
            src={p.image && assets[p.image]}
            onFile={(f) => uploadInto(f, (id) => setPropFn<BackgroundProps>(spec.id, { image: id }))}
            onClear={() => set<BackgroundProps>({ image: undefined })}
          />
          {p.image && (
            <div className="grid2">
              <Slider label="Focus X" value={p.focusX} min={0} max={1} format={pct} onChange={(v) => set({ focusX: v })} />
              <Slider label="Focus Y" value={p.focusY} min={0} max={1} format={pct} onChange={(v) => set({ focusY: v })} />
              <Slider label="Zoom" value={p.zoom} min={1} max={3} format={(v) => v.toFixed(2) + '×'} onChange={(v) => set({ zoom: v })} />
              <Slider label="Blur" value={p.blur} min={0} max={60} step={1} onChange={(v) => set({ blur: v })} />
            </div>
          )}
          <ColorField label="Multiply tint" value={p.tint} onChange={(v) => set({ tint: v })} />
          <div className="grid2">
            <Slider label="Tint strength" value={p.tintStrength} min={0} max={1} format={pct} onChange={(v) => set({ tintStrength: v })} />
            <Slider label="Darken" value={p.darken} min={0} max={0.8} format={pct} onChange={(v) => set({ darken: v })} />
          </div>
          <Toggle label="Black & white photo" checked={p.grayscale} onChange={(v) => set({ grayscale: v })} />
        </>
      );
    }
    case 'skyline': {
      const p = props as SkylineProps;
      return (
        <>
          <ColorField label="Colour" value={p.color} onChange={(v) => set({ color: v })} />
          <Slider label="Opacity" value={p.opacity} min={0.1} max={1} format={pct} onChange={(v) => set({ opacity: v })} />
        </>
      );
    }
    case 'wave': {
      const p = props as WaveProps;
      return (
        <>
          <Slider label="Height" value={p.height} min={0.5} max={1.6} format={pct} onChange={(v) => set({ height: v })} />
          <Toggle label="Flip horizontally" checked={p.flip} onChange={(v) => set({ flip: v })} />
        </>
      );
    }
    case 'panel': {
      const p = props as PanelProps;
      return (
        <>
          <ColorField label="Colour" value={p.color} onChange={(v) => set({ color: v })} />
          <div className="grid2">
            <Slider label="Opacity" value={p.opacity} min={0} max={1} format={pct} onChange={(v) => set({ opacity: v })} />
            <Slider label="Frost (blur)" value={p.blur} min={0} max={40} step={1} onChange={(v) => set({ blur: v })} />
            <Slider label="Corner radius" value={p.radius} min={0} max={8} step={0.1} onChange={(v) => set({ radius: v })} />
            <Slider label="Padding" value={p.padding} min={1} max={8} step={0.1} onChange={(v) => set({ padding: v })} />
          </div>
        </>
      );
    }
    case 'logo': {
      const p = props as LogoProps;
      return (
        <>
          <Select
            label="Variant"
            value={p.variant}
            options={[
              { value: 'nordevcon', label: 'nor(DEV):con' },
              { value: 'nordev', label: 'nor(DEV):' },
            ]}
            onChange={(v) => set({ variant: v })}
          />
          <ColorField label="Main" value={p.main} onChange={(v) => set({ main: v })} />
          <ColorField label="DEV accent" value={p.accent} onChange={(v) => set({ accent: v })} />
        </>
      );
    }
    case 'prepend': {
      const p = props as PrependProps;
      return (
        <>
          <Field label="After the slash">
            <input value={p.suffix} onChange={(e) => set({ suffix: e.target.value })} placeholder="meetup" />
          </Field>
          <ColorField label="Main" value={p.main} onChange={(v) => set({ main: v })} />
          <ColorField label="DEV accent" value={p.accent} onChange={(v) => set({ accent: v })} />
        </>
      );
    }
    case 'text':
      return <TextEditor spec={spec} p={props as TextProps} />;
    case 'speakers':
      return <SpeakersEditor id={spec.id} p={props as SpeakersProps} />;
    case 'badge': {
      const p = props as BadgeProps;
      return (
        <>
          <Field label="Text">
            <input value={p.text} onChange={(e) => set({ text: e.target.value })} />
          </Field>
          <ColorField label="Background" value={p.background} onChange={(v) => set({ background: v })} />
          <ColorField label="Text colour" value={p.color} onChange={(v) => set({ color: v })} />
          <ColorField label="Border" value={p.borderColor} allowTransparent onChange={(v) => set({ borderColor: v })} />
        </>
      );
    }
    case 'graphic': {
      const p = props as GraphicProps;
      return (
        <>
          <ImagePicker
            label="Image (SVG/PNG)"
            src={p.image && assets[p.image]}
            onFile={(f) => uploadInto(f, (id) => setPropFn<GraphicProps>(spec.id, { image: id }))}
            onClear={() => set<GraphicProps>({ image: undefined })}
          />
          <Slider label="Opacity" value={p.opacity} min={0.1} max={1} format={pct} onChange={(v) => set({ opacity: v })} />
          <Select
            label="Blend"
            value={p.blend}
            options={[
              { value: 'normal', label: 'Normal' },
              { value: 'multiply', label: 'Multiply' },
              { value: 'screen', label: 'Screen' },
              { value: 'overlay', label: 'Overlay' },
            ]}
            onChange={(v) => set({ blend: v })}
          />
        </>
      );
    }
  }
}

function TextEditor({ spec, p }: { spec: ComponentSpec; p: TextProps }) {
  const set = (patch: Partial<TextProps>) => setProps(spec.id, patch);
  const weights = FONTS.find((f) => f.family === p.font)?.weights ?? [400, 700];
  return (
    <>
      <Field label="Text">
        <textarea
          rows={spec.multiline ? 3 : 1}
          value={p.text}
          placeholder={spec.hint}
          onChange={(e) => set({ text: e.target.value })}
        />
      </Field>
      <p className="hint">Wrap words in **double asterisks** for bold. New lines are kept.</p>
      <div className="grid2">
        <Select
          label="Font"
          value={p.font}
          options={FONTS.map((f) => ({ value: f.family, label: f.family }))}
          onChange={(v: FontFamily) => {
            const ws = FONTS.find((f) => f.family === v)!.weights;
            set({ font: v, weight: ws.reduce((a, b) => (Math.abs(b - p.weight) < Math.abs(a - p.weight) ? b : a)) });
          }}
        />
        <Select label="Weight" value={p.weight} options={weights.map((w) => ({ value: w, label: String(w) }))} onChange={(v) => set({ weight: v })} />
      </div>
      <ColorField label="Colour" value={p.color} onChange={(v) => set({ color: v })} />
      <div className="grid2">
        <Slider label="Opacity" value={p.opacity} min={0.3} max={1} format={pct} onChange={(v) => set({ opacity: v })} />
        <Slider label="Line height" value={p.lineHeight} min={0.9} max={1.6} format={(v) => v.toFixed(2)} onChange={(v) => set({ lineHeight: v })} />
      </div>
      <div className="row wrap">
        <Toggle label="Shadow" checked={p.shadow} onChange={(v) => set({ shadow: v })} />
        <Toggle label="UPPERCASE" checked={p.uppercase} onChange={(v) => set({ uppercase: v })} />
      </div>
    </>
  );
}

// ---------------------------------------------------------------- speakers

function SpeakersEditor({ id, p }: { id: string; p: SpeakersProps }) {
  const set = (patch: Partial<SpeakersProps>) => setProps(id, patch);
  const assets = useApp((s) => s.doc.assets);
  const [busy, setBusy] = useState<Record<string, string>>({});

  const updateSpeaker = (sid: string, patch: Partial<Speaker>, coalesce?: string) =>
    updateDoc(
      (d) => {
        const sp = d.components[id].props as SpeakersProps;
        return setPropFn<SpeakersProps>(id, { speakers: sp.speakers.map((s) => (s.id === sid ? { ...s, ...patch } : s)) })(d);
      },
      coalesce ? `speaker:${sid}:${coalesce}` : undefined,
    );

  const cutout = async (s: Speaker, src: string) => {
    setBusy((b) => ({ ...b, [s.id]: 'Loading model…' }));
    try {
      const out = await removeBackground(src, (pctDone, label) => setBusy((b) => ({ ...b, [s.id]: `${label} ${pctDone}%` })));
      const a = addAsset(out);
      updateDoc((d) => {
        const sp = d.components[id].props as SpeakersProps;
        return setPropFn<SpeakersProps>(id, {
          speakers: sp.speakers.map((x) => (x.id === s.id ? { ...x, cutout: a.id, useCutout: true } : x)),
        })(a.apply(d));
      });
    } catch (e) {
      console.error(e);
      alert('Background removal failed: ' + (e as Error).message);
    } finally {
      setBusy((b) => {
        const n = { ...b };
        delete n[s.id];
        return n;
      });
    }
  };

  const addSpeaker = async (file: File) => {
    const url = await fileToDataUrl(file);
    const a = addAsset(url);
    const sp: Speaker = {
      id: 's' + Math.random().toString(36).slice(2, 8),
      name: file.name.replace(/\.[^.]+$/, ''),
      image: a.id,
      useCutout: false,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      grayscale: false,
    };
    updateDoc((d) => {
      const cur = d.components[id].props as SpeakersProps;
      return setPropFn<SpeakersProps>(id, { speakers: [...cur.speakers, sp] })(a.apply(d));
    });
    // Cut-out is the common case for speaker photos: start it straight away.
    if (p.shape === 'cutout') cutout(sp, url);
  };

  const move = (i: number, dir: -1 | 1) => {
    const arr = [...p.speakers];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    set({ speakers: arr });
  };

  return (
    <>
      <Select
        label="Style"
        value={p.shape}
        options={[
          { value: 'cutout', label: 'Cut-out (background removed)' },
          { value: 'rect', label: 'Rounded photo' },
          { value: 'circle', label: 'Circle' },
        ]}
        onChange={(v) => set({ shape: v })}
      />
      <div className="row wrap">
        <Toggle label="Border" checked={p.border} onChange={(v) => set({ border: v })} />
        <Toggle label="In front of wave" checked={p.inFrontOfWave} onChange={(v) => set({ inFrontOfWave: v })} />
      </div>
      {p.border && (
        <>
          <ColorField label="Border colour" value={p.borderColor} onChange={(v) => set({ borderColor: v })} />
          <Slider label="Border width" value={p.borderWidth} min={0.2} max={2.5} step={0.05} onChange={(v) => set({ borderWidth: v })} />
        </>
      )}
      {p.speakers.length > 1 && (
        <Slider label="Overlap" value={p.overlap} min={0} max={0.5} format={pct} onChange={(v) => set({ overlap: v })} />
      )}

      <ul className="speaker-list">
        {p.speakers.map((s, i) => {
          const src = s.image && assets[s.image];
          const shown = s.useCutout && s.cutout ? assets[s.cutout] : src;
          return (
            <li key={s.id} className="speaker">
              <div className="speaker-head">
                <div className="thumb checker">{shown && <img src={shown} alt="" />}</div>
                <input
                  className="speaker-name"
                  value={s.name}
                  aria-label="Speaker label"
                  onChange={(e) => updateSpeaker(s.id, { name: e.target.value }, 'name')}
                />
                <div className="row tight">
                  <button className="icon-btn" title="Move left" onClick={() => move(i, -1)} disabled={i === 0}>
                    ←
                  </button>
                  <button className="icon-btn" title="Move right" onClick={() => move(i, 1)} disabled={i === p.speakers.length - 1}>
                    →
                  </button>
                  <button
                    className="icon-btn danger"
                    title="Remove speaker"
                    onClick={() => set({ speakers: p.speakers.filter((x) => x.id !== s.id) })}
                  >
                    ×
                  </button>
                </div>
              </div>
              {p.shape === 'cutout' && (
                <div className="row wrap">
                  {busy[s.id] ? (
                    <span className="muted small">{busy[s.id]}</span>
                  ) : s.cutout ? (
                    <>
                      <Toggle label="Background removed" checked={s.useCutout} onChange={(v) => updateSpeaker(s.id, { useCutout: v })} />
                      <button className="btn small ghost" onClick={() => src && cutout(s, src)}>
                        Redo
                      </button>
                    </>
                  ) : (
                    <button className="btn small" onClick={() => src && cutout(s, src)}>
                      Remove background
                    </button>
                  )}
                </div>
              )}
              <div className="grid2">
                <Slider label="Size" value={s.zoom} min={0.4} max={2} format={pct} onChange={(v) => updateSpeaker(s.id, { zoom: v }, 'zoom')} />
                <Slider label="Nudge X" value={s.offsetX} min={-1} max={1} format={pct} onChange={(v) => updateSpeaker(s.id, { offsetX: v }, 'ox')} />
                <Slider label="Nudge Y" value={s.offsetY} min={-1} max={1} format={pct} onChange={(v) => updateSpeaker(s.id, { offsetY: v }, 'oy')} />
                <Toggle label="B&W" checked={s.grayscale} onChange={(v) => updateSpeaker(s.id, { grayscale: v })} />
              </div>
            </li>
          );
        })}
      </ul>
      <ImagePicker label="" compact onFile={addSpeaker} />
      <p className="hint">Add a speaker photo. In cut-out style the background is removed automatically, in your browser.</p>
    </>
  );
}
