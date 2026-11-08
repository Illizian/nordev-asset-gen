// Core data model for layouts (templates defined in code) and documents (what the user edits).

export type AspectClass = 'banner' | 'landscape' | 'square' | 'portrait' | 'tall';

export interface Format {
  id: string;
  name: string;
  group: string;
  width: number;
  height: number;
}

/** A rectangle in fractions of the canvas (0..1). */
export type Box = [x: number, y: number, w: number, h: number];
export type HAlign = 'left' | 'center' | 'right';
export type VAlign = 'top' | 'middle' | 'bottom';

/** Where a component sits for one aspect class. Sizes are % of the canvas short side. */
export interface Placement {
  box: Box;
  align?: HAlign;
  valign?: VAlign;
  /** Text: preferred font size, % of canvas short side. Auto-fit shrinks it to `minSize`. */
  size?: number;
  minSize?: number;
  /** Text: max number of lines before shrinking further. */
  maxLines?: number;
  /** Stack under another component: the box top moves to just below its rendered bounds. */
  below?: string;
  /** Gap used with `below`, % of canvas short side. */
  gap?: number;
  hidden?: boolean;
}

// ---------- Component props ----------

export interface BackgroundProps {
  image?: string; // asset id
  focusX: number; // 0..1
  focusY: number; // 0..1
  zoom: number; // 1 = cover
  blur: number; // px at 1000px short side
  tint: string;
  tintStrength: number; // 0..1, multiply layer opacity
  darken: number; // 0..1
  grayscale: boolean;
}

export interface SkylineProps {
  color: string;
  opacity: number;
}

export interface WaveProps {
  height: number; // multiplier on the layout's wave height
  flip: boolean;
}

export interface PanelProps {
  color: string;
  opacity: number;
  blur: number; // extra blur behind the panel
  radius: number; // % of short side
  padding: number; // % of short side
}

export type LogoVariant = 'nordevcon' | 'nordev';
export interface LogoProps {
  variant: LogoVariant;
  main: string;
  accent: string;
}

export interface PrependProps {
  suffix: string;
  main: string;
  accent: string;
}

export interface TextProps {
  text: string;
  font: FontFamily;
  weight: number;
  color: string;
  opacity: number;
  shadow: boolean;
  uppercase: boolean;
  lineHeight: number;
}

export type SpeakerShape = 'cutout' | 'rect' | 'circle';
export interface Speaker {
  id: string;
  name: string;
  image?: string; // original asset id
  cutout?: string; // bg-removed asset id
  useCutout: boolean;
  zoom: number;
  offsetX: number; // -1..1
  offsetY: number; // -1..1
  grayscale: boolean;
}
export interface SpeakersProps {
  speakers: Speaker[];
  shape: SpeakerShape;
  border: boolean;
  borderColor: string;
  borderWidth: number; // % of short side
  overlap: number; // 0..0.5 fraction of each slot
  inFrontOfWave: boolean;
}

export interface BadgeProps {
  text: string;
  background: string;
  color: string;
  borderColor: string;
}

export interface GraphicProps {
  image?: string;
  opacity: number;
  blend: 'normal' | 'multiply' | 'screen' | 'overlay';
}

export type FontFamily = 'Nunito' | 'Roboto' | 'Roboto Condensed';

export interface ComponentPropsMap {
  background: BackgroundProps;
  skyline: SkylineProps;
  wave: WaveProps;
  panel: PanelProps;
  logo: LogoProps;
  prepend: PrependProps;
  text: TextProps;
  speakers: SpeakersProps;
  badge: BadgeProps;
  graphic: GraphicProps;
}
export type ComponentType = keyof ComponentPropsMap;

/** A component slot in a layout. Order in the layout = paint order (first is bottom). */
export interface ComponentSpec<T extends ComponentType = ComponentType> {
  id: string;
  type: T;
  label: string;
  /** Can the user switch it off? */
  optional?: boolean;
  /** Starts enabled? (only relevant when optional) */
  enabled?: boolean;
  defaults: ComponentPropsMap[T];
  /** Panel only: component ids whose rendered bounds the panel wraps. */
  wraps?: string[];
  /** Text only: placeholder hint in the editor. */
  hint?: string;
  multiline?: boolean;
}

export interface LayoutDef {
  id: string;
  name: string;
  description: string;
  brand: 'nordevcon' | 'nordev';
  components: ComponentSpec[];
  placements: Partial<Record<AspectClass, Record<string, Placement>>>;
}

// ---------- Document ----------

export interface ComponentState {
  enabled: boolean;
  props: ComponentPropsMap[ComponentType];
}

/** Per-format manual adjustments, layered on top of the layout placement. */
export interface Override {
  dx?: number; // fraction of canvas width
  dy?: number; // fraction of canvas height
  scale?: number;
  hidden?: boolean;
}

export interface Doc {
  version: 1;
  layoutId: string;
  components: Record<string, ComponentState>;
  overrides: Record<string, Record<string, Override>>; // formatId -> componentId -> override
  exportFormats: string[];
  /** Image data, keyed by asset id. Stored as data URLs so documents are self-contained. */
  assets: Record<string, string>;
}
