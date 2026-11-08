import { useState } from 'react';
import { FORMATS } from '../formats';
import { exportFormats } from '../io';
import { updateDoc, useApp } from '../state';

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const doc = useApp((s) => s.doc);
  const selected = new Set(doc.exportFormats);
  const [type, setType] = useState<'image/png' | 'image/jpeg'>('image/png');
  const [progress, setProgress] = useState<string | null>(null);

  const toggle = (id: string) =>
    updateDoc((d) => ({
      ...d,
      exportFormats: selected.has(id) ? d.exportFormats.filter((x) => x !== id) : [...d.exportFormats, id],
    }));

  const groups = [...new Set(FORMATS.map((f) => f.group))];

  const run = async () => {
    setProgress('Rendering…');
    try {
      const ids = FORMATS.filter((f) => selected.has(f.id)).map((f) => f.id);
      await exportFormats(doc, ids, type, (d, t) => setProgress(`Rendering ${d}/${t}…`));
      onClose();
    } catch (e) {
      alert('Export failed: ' + (e as Error).message);
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="export-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="export-title">Download</h2>
        <div className="export-groups">
          {groups.map((g) => (
            <fieldset key={g}>
              <legend>{g}</legend>
              {FORMATS.filter((f) => f.group === g).map((f) => (
                <label key={f.id} className="check">
                  <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggle(f.id)} />
                  <span>{f.name}</span>
                  <span className="muted small">
                    {f.width}×{f.height}
                  </span>
                </label>
              ))}
            </fieldset>
          ))}
        </div>
        <div className="row">
          <label className="check">
            <input type="radio" name="type" checked={type === 'image/png'} onChange={() => setType('image/png')} /> PNG
          </label>
          <label className="check">
            <input type="radio" name="type" checked={type === 'image/jpeg'} onChange={() => setType('image/jpeg')} /> JPG (smaller)
          </label>
        </div>
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={!selected.size || !!progress} onClick={run}>
            {progress ?? (selected.size > 1 ? `Download ${selected.size} files (.zip)` : 'Download')}
          </button>
        </div>
      </div>
    </div>
  );
}
