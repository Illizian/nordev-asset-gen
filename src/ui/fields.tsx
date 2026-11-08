import { useRef, type ReactNode } from 'react';
import { COLORS } from '../brand';

export function Field({ label, children, inline }: { label: string; children: ReactNode; inline?: boolean }) {
  return (
    <label className={inline ? 'field field-inline' : 'field'}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

export function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const { label, value, min, max, step = 0.01, format, onChange } = props;
  return (
    <label className="field slider">
      <span className="field-label">
        {label}
        <span className="field-value">{format ? format(value) : value}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden />
      <span>{label}</span>
    </label>
  );
}

export function Select<T extends string | number>(props: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <Field label={props.label}>
      <select
        value={String(props.value)}
        onChange={(e) => {
          const opt = props.options.find((o) => String(o.value) === e.target.value);
          if (opt) props.onChange(opt.value);
        }}
      >
        {props.options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

/** Brand-palette-only colour picker (plus transparent where allowed). */
export function ColorField(props: { label: string; value: string; onChange: (v: string) => void; allowTransparent?: boolean }) {
  return (
    <div className="field">
      <span className="field-label">{props.label}</span>
      <div className="swatches" role="radiogroup" aria-label={props.label}>
        {props.allowTransparent && (
          <button
            type="button"
            className={'swatch swatch-none' + (props.value === 'transparent' ? ' active' : '')}
            title="None"
            aria-label="None"
            onClick={() => props.onChange('transparent')}
          />
        )}
        {COLORS.map((c) => (
          <button
            type="button"
            key={c.hex}
            className={'swatch' + (props.value.toUpperCase() === c.hex ? ' active' : '')}
            style={{ background: c.hex }}
            title={`${c.name} ${c.hex}`}
            aria-label={c.name}
            onClick={() => props.onChange(c.hex)}
          />
        ))}
      </div>
    </div>
  );
}

export function ImagePicker(props: {
  label: string;
  src?: string;
  onFile: (f: File) => void;
  onClear?: () => void;
  compact?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="field">
      {props.label && <span className="field-label">{props.label}</span>}
      <div
        className={'image-picker' + (props.compact ? ' compact' : '')}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f?.type.startsWith('image/')) props.onFile(f);
        }}
      >
        {props.src ? <img src={props.src} alt="" /> : <span className="muted">Drop an image or</span>}
        <div className="row">
          <button type="button" className="btn small" onClick={() => ref.current?.click()}>
            {props.src ? 'Replace' : 'Choose…'}
          </button>
          {props.src && props.onClear && (
            <button type="button" className="btn small ghost" onClick={props.onClear}>
              Remove
            </button>
          )}
        </div>
        <input
          ref={ref}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) props.onFile(f);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
