import { C } from '../brand';
import type { LayoutDef } from '../model';
import { at, background, logo, skyline, speakers, text, wave } from './parts';

/** nor(DEV):con pull-quote card. */
export const conferenceQuote: LayoutDef = {
  id: 'ndc-quote',
  name: 'nor(DEV):con — Quote',
  description: 'A big coral pull-quote over the conference background, with optional attribution.',
  brand: 'nordevcon',
  components: [
    background(),
    skyline(),
    speakers({ enabled: false, defaults: { inFrontOfWave: true } }),
    wave(),
    logo(),
    text({
      id: 'quote',
      label: 'Quote',
      multiline: true,
      defaults: { text: '“Imposter syndrome is a natural part of growth”', color: C.Coral, shadow: true, lineHeight: 1.12 },
    }),
    text({
      id: 'attribution',
      label: 'Attribution',
      optional: true,
      enabled: false,
      defaults: { text: '— Speaker Name', weight: 400, color: C.White, opacity: 0.9, shadow: true },
    }),
  ],
  placements: {
    landscape: {
      skyline: at([0, 0.18, 1, 0.68]),
      speakers: at([0.02, 0.3, 0.4, 0.6], { align: 'left' }),
      wave: at([0, 0.79, 1, 0.21]),
      logo: at([0.026, 0.06, 0.32, 0.09], { valign: 'top' }),
      quote: at([0.4, 0.1, 0.56, 0.45], { align: 'right', size: 13, minSize: 5 }),
      attribution: at([0.4, 0.55, 0.56, 0.12], { align: 'right', size: 5, minSize: 3, below: 'quote', gap: 2 }),
    },
    banner: {
      skyline: at([0.3, 0.05, 0.7, 0.85]),
      speakers: at([0.7, 0.1, 0.28, 0.9], { align: 'right' }),
      wave: at([0, 0.8, 1, 0.2]),
      logo: at([0.025, 0.09, 0.22, 0.2], { valign: 'top' }),
      quote: at([0.3, 0.08, 0.66, 0.62], { align: 'right', size: 18, minSize: 8 }),
      attribution: at([0.3, 0.6, 0.66, 0.15], { align: 'right', size: 8, minSize: 5, below: 'quote', gap: 1 }),
    },
    square: {
      skyline: at([0, 0.2, 1, 0.68]),
      speakers: at([0.04, 0.55, 0.5, 0.38], { align: 'left' }),
      wave: at([0, 0.86, 1, 0.14]),
      logo: at([0.05, 0.05, 0.5, 0.07], { valign: 'top' }),
      quote: at([0.06, 0.18, 0.88, 0.45], { align: 'right', size: 12, minSize: 5 }),
      attribution: at([0.06, 0.6, 0.88, 0.1], { align: 'right', size: 5, minSize: 3, below: 'quote', gap: 2 }),
    },
    portrait: {
      skyline: at([0, 0.25, 1, 0.65]),
      speakers: at([0.04, 0.6, 0.5, 0.33], { align: 'left' }),
      wave: at([0, 0.88, 1, 0.12]),
      logo: at([0.05, 0.045, 0.55, 0.06], { valign: 'top' }),
      quote: at([0.06, 0.18, 0.88, 0.45], { align: 'right', size: 13, minSize: 5 }),
      attribution: at([0.06, 0.6, 0.88, 0.1], { align: 'right', size: 5.5, minSize: 3, below: 'quote', gap: 2 }),
    },
    tall: {
      skyline: at([0, 0.3, 1, 0.6]),
      speakers: at([0.2, 0.6, 0.6, 0.3], { align: 'center' }),
      wave: at([0, 0.9, 1, 0.1]),
      logo: at([0.08, 0.1, 0.84, 0.06], { align: 'center', valign: 'top' }),
      quote: at([0.08, 0.22, 0.84, 0.35], { align: 'center', size: 14, minSize: 6 }),
      attribution: at([0.08, 0.55, 0.84, 0.08], { align: 'center', size: 6, minSize: 3, below: 'quote', gap: 2 }),
    },
  },
};
