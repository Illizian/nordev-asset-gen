import logoNordevcon from './assets/logo-nordevcon.svg?raw';
import logoNordev from './assets/logo-nordev.svg?raw';
import prependNordev from './assets/prepend-nordev.svg?raw';
import city from './assets/city.svg?raw';
import wave from './assets/wave.svg?raw';
import type { FontFamily, LogoVariant } from './model';

export interface BrandColor {
  name: string;
  hex: string;
}

/** Brand palette (Brand.pdf) plus the wave colours. */
export const COLORS: BrandColor[] = [
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Black', hex: '#000000' },
  { name: 'Nor Red', hex: '#BF1C2E' },
  { name: 'Plum', hex: '#422D54' },
  { name: 'Purple', hex: '#8258A7' },
  { name: 'Orchid', hex: '#BD57A8' },
  { name: 'Raspberry', hex: '#C6386A' },
  { name: 'Navy', hex: '#153A73' },
  { name: 'Mint', hex: '#68D391' },
  { name: 'Sky', hex: '#4299E1' },
  { name: 'Crimson', hex: '#C53030' },
  { name: 'Coral', hex: '#FA7268' },
  { name: 'Rose', hex: '#AC4B74' },
  { name: 'Aubergine', hex: '#53345D' },
  { name: 'Ink', hex: '#0F172A' },
];

export const C = Object.fromEntries(COLORS.map((c) => [c.name.replace(/\s/g, ''), c.hex])) as Record<
  'White' | 'Black' | 'NorRed' | 'Plum' | 'Purple' | 'Orchid' | 'Raspberry' | 'Navy' | 'Mint' | 'Sky' | 'Crimson' | 'Coral' | 'Rose' | 'Aubergine' | 'Ink',
  string
>;

export const FONTS: { family: FontFamily; weights: number[] }[] = [
  { family: 'Nunito', weights: [400, 700, 800, 900] },
  { family: 'Roboto', weights: [300, 400, 500, 700] },
  { family: 'Roboto Condensed', weights: [300, 400, 700] },
];

export const SVG = {
  logo: { nordevcon: logoNordevcon, nordev: logoNordev } as Record<LogoVariant, string>,
  prepend: prependNordev,
  city,
  wave,
};

export function colorize(svg: string, tokens: Record<string, string>): string {
  return svg.replace(/\{\{(\w+)\}\}/g, (_, k) => tokens[k] ?? '#FFFFFF');
}

export function svgAspect(svg: string): number {
  const m = svg.match(/viewBox="([\d.\s-]+)"/);
  if (!m) return 1;
  const [, , w, h] = m[1].trim().split(/\s+/).map(Number);
  return w / h;
}
