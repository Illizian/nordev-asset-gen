// Reusable component specs so layouts stay short and consistent.
import { C } from '../brand';
import type {
  BackgroundProps,
  BadgeProps,
  ComponentSpec,
  GraphicProps,
  LogoProps,
  PanelProps,
  Placement,
  PrependProps,
  SkylineProps,
  SpeakersProps,
  TextProps,
  WaveProps,
} from '../model';

type Spec<T extends ComponentSpec['type']> = Omit<ComponentSpec<T>, 'type' | 'defaults'> & {
  defaults?: Partial<ComponentSpec<T>['defaults']>;
};

export const background = (o: Spec<'background'> = { id: 'background', label: 'Background' }): ComponentSpec<'background'> => ({
  ...o,
  type: 'background',
  defaults: {
    focusX: 0.5,
    focusY: 0.5,
    zoom: 1,
    blur: 0,
    tint: C.Purple,
    tintStrength: 0.85,
    darken: 0.15,
    grayscale: false,
    ...o.defaults,
  } as BackgroundProps,
});

export const skyline = (o: Partial<Spec<'skyline'>> = {}): ComponentSpec<'skyline'> => ({
  id: 'skyline',
  label: 'Skyline',
  optional: true,
  enabled: true,
  ...o,
  type: 'skyline',
  defaults: { color: C.White, opacity: 0.5, ...o.defaults } as SkylineProps,
});

export const wave = (o: Partial<Spec<'wave'>> = {}): ComponentSpec<'wave'> => ({
  id: 'wave',
  label: 'Wave',
  optional: true,
  enabled: true,
  ...o,
  type: 'wave',
  defaults: { height: 1, flip: false, ...o.defaults } as WaveProps,
});

export const panel = (o: Spec<'panel'> & { wraps: string[] }): ComponentSpec<'panel'> => ({
  optional: true,
  enabled: true,
  ...o,
  type: 'panel',
  defaults: { color: C.Plum, opacity: 0.45, blur: 12, radius: 3, padding: 4, ...o.defaults } as PanelProps,
});

export const logo = (o: Partial<Spec<'logo'>> = {}): ComponentSpec<'logo'> => ({
  id: 'logo',
  label: 'Logo',
  optional: true,
  enabled: true,
  ...o,
  type: 'logo',
  defaults: { variant: 'nordevcon', main: C.White, accent: C.NorRed, ...o.defaults } as LogoProps,
});

export const prepend = (o: Partial<Spec<'prepend'>> = {}): ComponentSpec<'prepend'> => ({
  id: 'prepend',
  label: 'nor.DEV / lockup',
  optional: true,
  enabled: true,
  ...o,
  type: 'prepend',
  defaults: { suffix: 'meetup', main: C.White, accent: C.Coral, ...o.defaults } as PrependProps,
});

export const text = (o: Spec<'text'>): ComponentSpec<'text'> => ({
  ...o,
  type: 'text',
  defaults: {
    text: '',
    font: 'Roboto Condensed',
    weight: 700,
    color: C.White,
    opacity: 1,
    shadow: false,
    uppercase: false,
    lineHeight: 1.15,
    ...o.defaults,
  } as TextProps,
});

export const speakers = (o: Partial<Spec<'speakers'>> = {}): ComponentSpec<'speakers'> => ({
  id: 'speakers',
  label: 'Speakers',
  optional: true,
  enabled: true,
  ...o,
  type: 'speakers',
  defaults: {
    speakers: [],
    shape: 'cutout',
    border: false,
    borderColor: C.White,
    borderWidth: 0.8,
    overlap: 0.1,
    inFrontOfWave: false,
    ...o.defaults,
  } as SpeakersProps,
});

export const badge = (o: Partial<Spec<'badge'>> = {}): ComponentSpec<'badge'> => ({
  id: 'badge',
  label: 'Badge',
  optional: true,
  enabled: false,
  ...o,
  type: 'badge',
  defaults: { text: 'Panel', background: C.Rose, color: C.White, borderColor: C.Aubergine, ...o.defaults } as BadgeProps,
});

export const graphic = (o: Partial<Spec<'graphic'>> = {}): ComponentSpec<'graphic'> => ({
  id: 'graphic',
  label: 'Graphic / tech logo',
  optional: true,
  enabled: false,
  ...o,
  type: 'graphic',
  defaults: { opacity: 0.8, blend: 'normal', ...o.defaults } as GraphicProps,
});

/** Placement shorthand. */
export const at = (box: Placement['box'], extra: Omit<Placement, 'box'> = {}): Placement => ({ box, ...extra });
