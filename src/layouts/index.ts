import type { ComponentState, Doc, LayoutDef } from '../model';
import { FORMATS } from '../formats';
import { conferenceTalk } from './conference-talk';
import { conferenceQuote } from './conference-quote';
import { meetupEvent } from './meetup-event';

/**
 * All layouts available in the editor. To add one: create a file alongside these,
 * export a LayoutDef, and add it here.
 */
export const LAYOUTS: LayoutDef[] = [meetupEvent, conferenceTalk, conferenceQuote];

export const layoutById = (id: string) => LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];

export function defaultComponents(layout: LayoutDef): Record<string, ComponentState> {
  return Object.fromEntries(
    layout.components.map((c) => [c.id, { enabled: c.optional ? c.enabled !== false : true, props: structuredClone(c.defaults) }]),
  );
}

export function newDoc(layoutId = LAYOUTS[0].id): Doc {
  const layout = layoutById(layoutId);
  return {
    version: 1,
    layoutId: layout.id,
    components: defaultComponents(layout),
    overrides: {},
    exportFormats: FORMATS.map((f) => f.id),
    assets: {},
  };
}

/**
 * Switch layout while keeping what the user typed/uploaded: components with the
 * same id and type carry their props across.
 */
export function switchLayout(doc: Doc, layoutId: string): Doc {
  const from = layoutById(doc.layoutId);
  const to = layoutById(layoutId);
  const comps = defaultComponents(to);
  for (const spec of to.components) {
    const prev = doc.components[spec.id];
    const prevSpec = from.components.find((c) => c.id === spec.id);
    if (prev && prevSpec?.type === spec.type) {
      // Keep content, but adopt the new layout's styling defaults for colours etc. on brand switch.
      if (spec.type === 'background' || spec.type === 'speakers') {
        comps[spec.id] = { ...comps[spec.id], props: { ...comps[spec.id].props, ...pickContent(prev.props) } };
      } else if (spec.type === 'text') {
        comps[spec.id] = { ...comps[spec.id], props: { ...comps[spec.id].props, text: (prev.props as { text: string }).text } };
      } else {
        comps[spec.id] = structuredClone(prev);
      }
    }
  }
  return { ...doc, layoutId: to.id, components: comps, overrides: {} };
}

function pickContent(props: object): object {
  const p = props as Record<string, unknown>;
  const keep: Record<string, unknown> = {};
  for (const k of ['image', 'focusX', 'focusY', 'zoom', 'speakers', 'shape', 'border', 'borderColor']) if (k in p) keep[k] = p[k];
  return keep;
}
