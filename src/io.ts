import JSZip from 'jszip';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { FORMATS, formatById } from './formats';
import { layoutById } from './layouts';
import type { Doc } from './model';
import { buildScene, renderScene } from './render/renderer';
import { makeCanvas, preload, settleLoads } from './render/images';
import { pruneAssets } from './state';

const FILE_EXT = '.nordev.json';

export function slug(s: string) {
  return (
    s
      .replace(/\*\*/g, '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 50) || 'nordev'
  );
}

export function docTitle(doc: Doc): string {
  for (const id of ['title', 'quote']) {
    const t = (doc.components[id]?.props as { text?: string } | undefined)?.text;
    if (t?.trim()) return t;
  }
  return 'nordev-asset';
}

function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// ---------- rendering ----------

export async function renderFormat(doc: Doc, formatId: string, type: 'image/png' | 'image/jpeg'): Promise<Blob> {
  const layout = layoutById(doc.layoutId);
  const format = formatById(formatId);
  await document.fonts.ready;
  await preload(Object.values(doc.assets));
  // First pass kicks off any SVG/brand image loads; wait for them, then render for real.
  buildScene(doc, layout, format, format.width, format.height);
  await settleLoads();
  const canvas = makeCanvas(format.width, format.height);
  const ctx = canvas.getContext('2d')!;
  renderScene(ctx, buildScene(doc, layout, format, format.width, format.height));
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Render failed'))), type, 0.93),
  );
}

export async function exportFormats(
  doc: Doc,
  formatIds: string[],
  type: 'image/png' | 'image/jpeg',
  onProgress?: (done: number, total: number) => void,
) {
  const ext = type === 'image/png' ? 'png' : 'jpg';
  const base = slug(docTitle(doc));
  if (formatIds.length === 1) {
    const f = formatById(formatIds[0]);
    download(await renderFormat(doc, f.id, type), `${base}_${f.id}_${f.width}x${f.height}.${ext}`);
    return;
  }
  const zip = new JSZip();
  let done = 0;
  for (const id of formatIds) {
    const f = formatById(id);
    zip.file(`${base}_${f.id}_${f.width}x${f.height}.${ext}`, await renderFormat(doc, id, type));
    onProgress?.(++done, formatIds.length);
  }
  download(await zip.generateAsync({ type: 'blob' }), `${base}.zip`);
}

// ---------- project files ----------

export function saveProject(doc: Doc) {
  const clean = pruneAssets(doc);
  const blob = new Blob([JSON.stringify(clean)], { type: 'application/json' });
  download(blob, `${slug(docTitle(doc))}${FILE_EXT}`);
}

export function openProjectFile(): Promise<Doc | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try {
        resolve(parseDoc(await file.text()));
      } catch (e) {
        reject(e);
      }
    };
    input.click();
  });
}

export function parseDoc(json: string): Doc {
  const d = JSON.parse(json) as Doc;
  if (d.version !== 1 || !d.layoutId || !d.components) throw new Error('Not a nor(DEV) asset project file');
  const layout = layoutById(d.layoutId);
  // Fill in components added to the layout since the file was saved.
  for (const spec of layout.components) {
    if (!d.components[spec.id]) d.components[spec.id] = { enabled: spec.optional ? spec.enabled !== false : true, props: structuredClone(spec.defaults) };
    else d.components[spec.id].props = { ...structuredClone(spec.defaults), ...d.components[spec.id].props };
  }
  d.overrides ??= {};
  d.assets ??= {};
  d.exportFormats ??= FORMATS.map((f) => f.id);
  return d;
}

// ---------- autosave (IndexedDB, survives refresh/crash) ----------

const AUTOSAVE_KEY = 'nordev-autosave';

export async function autosave(doc: Doc) {
  try {
    await idbSet(AUTOSAVE_KEY, { savedAt: Date.now(), doc: pruneAssets(doc) });
  } catch {
    /* storage unavailable: ignore */
  }
}

export async function loadAutosave(): Promise<{ savedAt: number; doc: Doc } | undefined> {
  try {
    const v = await idbGet(AUTOSAVE_KEY);
    if (!v) return undefined;
    return { savedAt: v.savedAt, doc: parseDoc(JSON.stringify(v.doc)) };
  } catch {
    return undefined;
  }
}
