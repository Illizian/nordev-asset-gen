import { useEffect, useState } from 'react';
import { newDoc } from '../layouts';
import { autosave, loadAutosave, openProjectFile, saveProject } from '../io';
import type { Doc } from '../model';
import { redo, replaceDoc, store, undo, useApp } from '../state';
import { ExportDialog } from './ExportDialog';
import { FormatStrip } from './FormatStrip';
import { Sidebar } from './Sidebar';
import { Stage } from './Stage';

export function App() {
  const dirty = useApp((s) => s.dirty);
  const canUndo = useApp((s) => s.past.length > 0);
  const canRedo = useApp((s) => s.future.length > 0);
  const doc = useApp((s) => s.doc);
  const [exporting, setExporting] = useState(false);
  const [restore, setRestore] = useState<{ savedAt: number; doc: Doc } | null>(null);

  // Offer to restore the last session (autosaved in IndexedDB).
  useEffect(() => {
    loadAutosave().then((a) => a && setRestore(a));
  }, []);

  // Autosave shortly after changes.
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => autosave(doc), 1000);
    return () => clearTimeout(t);
  }, [doc, dirty]);

  // "Are you sure you want to leave?" when there are unsaved changes.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!store.get().dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const typing = (e.target as HTMLElement).closest('input, textarea, select');
      if (mod && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        save();
      } else if (e.key === 'Escape') {
        store.set({ selectedId: null });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const confirmDiscard = () => !store.get().dirty || confirm('You have unsaved changes. Discard them?');

  const save = () => {
    saveProject(store.get().doc);
    store.set({ dirty: false });
  };
  const open = async () => {
    if (!confirmDiscard()) return;
    try {
      const d = await openProjectFile();
      if (d) replaceDoc(d);
    } catch (e) {
      alert((e as Error).message);
    }
  };
  const reset = () => {
    if (!confirmDiscard()) return;
    replaceDoc(newDoc(store.get().doc.layoutId));
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">D</span>
          <span>
            nor<span className="accent">(DEV)</span> asset builder
          </span>
        </div>
        <div className="row">
          <button className="btn ghost" onClick={undo} disabled={!canUndo} title="Undo (⌘Z)">
            Undo
          </button>
          <button className="btn ghost" onClick={redo} disabled={!canRedo} title="Redo (⇧⌘Z)">
            Redo
          </button>
          <span className="sep" />
          <button className="btn ghost" onClick={reset}>
            New
          </button>
          <button className="btn ghost" onClick={open}>
            Open…
          </button>
          <button className="btn" onClick={save} title="Save project file (⌘S)">
            Save{dirty ? ' •' : ''}
          </button>
          <button className="btn primary" onClick={() => setExporting(true)}>
            Download images
          </button>
        </div>
      </header>
      {restore && (
        <div className="banner">
          <span>
            Restore your unsaved work from {new Date(restore.savedAt).toLocaleString()}?
          </span>
          <button
            className="btn small"
            onClick={() => {
              replaceDoc(restore.doc, true);
              setRestore(null);
            }}
          >
            Restore
          </button>
          <button className="btn small ghost" onClick={() => setRestore(null)}>
            Dismiss
          </button>
        </div>
      )}
      <div className="main">
        <Sidebar />
        <div className="workspace">
          <Stage />
          <FormatStrip />
        </div>
      </div>
      {exporting && <ExportDialog onClose={() => setExporting(false)} />}
    </div>
  );
}
