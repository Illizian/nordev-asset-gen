import { useEffect, useRef } from 'react';
import { LAYOUTS, layoutById, switchLayout } from '../layouts';
import type { ComponentSpec } from '../model';
import { setEnabled, store, updateDoc, useApp } from '../state';
import { ComponentEditor } from './editors';

export function Sidebar() {
  const layoutId = useApp((s) => s.doc.layoutId);
  const layout = layoutById(layoutId);
  // Show the editable things in a sensible order: content first, decoration last.
  const order = ['text', 'prepend', 'speakers', 'badge', 'logo', 'graphic', 'background', 'panel', 'skyline', 'wave'];
  const specs = [...layout.components].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));

  return (
    <aside className="sidebar">
      <section className="side-section">
        <h2 className="side-title">Layout</h2>
        <div className="layout-grid">
          {LAYOUTS.map((l) => (
            <button
              key={l.id}
              className={'layout-card' + (l.id === layoutId ? ' active' : '')}
              onClick={() => l.id !== layoutId && updateDoc((d) => switchLayout(d, l.id))}
              title={l.description}
            >
              <span className={'layout-brand ' + l.brand}>{l.brand === 'nordevcon' ? 'nor(DEV):con' : 'nor.DEV'}</span>
              <span className="layout-name">{l.name.split('—')[1]?.trim() ?? l.name}</span>
            </button>
          ))}
        </div>
        <p className="hint">{layout.description}</p>
      </section>
      <section className="side-section">
        <h2 className="side-title">Components</h2>
        {specs.map((spec) => (
          <ComponentCard key={spec.id} spec={spec} />
        ))}
      </section>
    </aside>
  );
}

function ComponentCard({ spec }: { spec: ComponentSpec }) {
  const enabled = useApp((s) => s.doc.components[spec.id]?.enabled ?? false);
  const selected = useApp((s) => s.selectedId === spec.id);
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (selected && ref.current) {
      ref.current.open = true;
      ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selected]);

  return (
    <details
      ref={ref}
      className={'card' + (selected ? ' selected' : '') + (enabled ? '' : ' disabled')}
      open={spec.type === 'text' && spec.id !== 'details' && enabled}
    >
      <summary
        onClick={(e) => {
          // keep native toggle, but also select it on the canvas
          store.set({ selectedId: spec.id });
          void e;
        }}
      >
        <span className="card-title">{spec.label}</span>
        {spec.optional && (
          <span
            className="card-toggle"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <label className="toggle mini" title={enabled ? 'Hide' : 'Show'}>
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(spec.id, e.target.checked)} />
              <span className="toggle-track" aria-hidden />
            </label>
          </span>
        )}
      </summary>
      <div className="card-body">{enabled ? <ComponentEditor spec={spec} /> : <p className="muted small">Switched off.</p>}</div>
    </details>
  );
}
