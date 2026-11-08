import { useSyncExternalStore } from 'react';
import { DEFAULT_FORMAT } from './formats';
import { newDoc } from './layouts';
import type { ComponentType, ComponentPropsMap, Doc, Override } from './model';

export interface AppState {
  doc: Doc;
  /** Unsaved changes since last save/open. */
  dirty: boolean;
  formatId: string;
  selectedId: string | null;
  past: Doc[];
  future: Doc[];
}

let state: AppState = {
  doc: newDoc(),
  dirty: false,
  formatId: DEFAULT_FORMAT,
  selectedId: null,
  past: [],
  future: [],
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const store = {
  get: () => state,
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  set(patch: Partial<AppState>) {
    state = { ...state, ...patch };
    emit();
  },
};

export function useApp<T>(sel: (s: AppState) => T): T {
  return useSyncExternalStore(store.subscribe, () => sel(state));
}

// ---------- history ----------

let lastKey: string | undefined;
let lastAt = 0;

/**
 * Apply a change to the document. Changes sharing a `coalesce` key within a
 * short window (e.g. typing, dragging a slider) collapse into one undo step.
 */
export function updateDoc(fn: (d: Doc) => Doc, coalesce?: string) {
  const now = performance.now();
  const merge = coalesce && coalesce === lastKey && now - lastAt < 800;
  lastKey = coalesce;
  lastAt = now;
  const next = fn(state.doc);
  if (next === state.doc) return;
  state = {
    ...state,
    doc: next,
    dirty: true,
    past: merge ? state.past : [...state.past.slice(-80), state.doc],
    future: [],
  };
  emit();
}

export function undo() {
  const prev = state.past[state.past.length - 1];
  if (!prev) return;
  lastKey = undefined;
  state = { ...state, doc: prev, past: state.past.slice(0, -1), future: [state.doc, ...state.future], dirty: true };
  emit();
}

export function redo() {
  const [next, ...rest] = state.future;
  if (!next) return;
  lastKey = undefined;
  state = { ...state, doc: next, past: [...state.past, state.doc], future: rest, dirty: true };
  emit();
}

export function replaceDoc(doc: Doc, dirty = false) {
  lastKey = undefined;
  state = { ...state, doc, dirty, past: [], future: [], selectedId: null };
  emit();
}

// ---------- convenience mutators ----------

export function setProps<T extends ComponentType>(id: string, patch: Partial<ComponentPropsMap[T]>, coalesce = true) {
  updateDoc(
    (d) => ({
      ...d,
      components: { ...d.components, [id]: { ...d.components[id], props: { ...d.components[id].props, ...patch } } },
    }),
    coalesce ? `props:${id}:${Object.keys(patch).join(',')}` : undefined,
  );
}

export function setEnabled(id: string, enabled: boolean) {
  updateDoc((d) => ({ ...d, components: { ...d.components, [id]: { ...d.components[id], enabled } } }));
}

export function setOverride(formatId: string, id: string, patch: Partial<Override> | null, coalesce?: string) {
  updateDoc((d) => {
    const forFormat = { ...(d.overrides[formatId] ?? {}) };
    if (patch === null) delete forFormat[id];
    else forFormat[id] = { ...forFormat[id], ...patch };
    return { ...d, overrides: { ...d.overrides, [formatId]: forFormat } };
  }, coalesce);
}

export function addAsset(dataUrl: string): { id: string; apply: (d: Doc) => Doc } {
  const id = 'a' + Math.random().toString(36).slice(2, 10);
  return { id, apply: (d) => ({ ...d, assets: { ...d.assets, [id]: dataUrl } }) };
}

/** Remove assets no longer referenced by any component (keeps saved files small). */
export function pruneAssets(d: Doc): Doc {
  const json = JSON.stringify(d.components);
  const assets = Object.fromEntries(Object.entries(d.assets).filter(([id]) => json.includes(`"${id}"`)));
  return { ...d, assets };
}
