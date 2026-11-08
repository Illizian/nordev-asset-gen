import type { AspectClass, Format } from './model';

export const FORMATS: Format[] = [
  { id: 'meetup', name: 'Meetup event', group: 'Meetup', width: 2400, height: 1350 },
  { id: 'hd', name: 'Slides / YouTube (1080p)', group: 'General', width: 1920, height: 1080 },
  { id: 'linkedin-post', name: 'LinkedIn post', group: 'LinkedIn', width: 1200, height: 627 },
  { id: 'linkedin-square', name: 'LinkedIn square', group: 'LinkedIn', width: 1350, height: 1350 },
  { id: 'linkedin-event', name: 'LinkedIn event banner', group: 'LinkedIn', width: 1776, height: 444 },
  { id: 'instagram-square', name: 'Instagram square', group: 'Instagram', width: 1080, height: 1080 },
  { id: 'instagram-portrait', name: 'Instagram portrait (4:5)', group: 'Instagram', width: 1080, height: 1350 },
  { id: 'instagram-story', name: 'Instagram story', group: 'Instagram', width: 1080, height: 1920 },
  { id: 'discord-event', name: 'Discord event cover', group: 'Discord', width: 1600, height: 640 },
];

export const DEFAULT_FORMAT = 'meetup';

export function aspectClass(f: { width: number; height: number }): AspectClass {
  const r = f.width / f.height;
  if (r >= 2.2) return 'banner';
  if (r >= 1.3) return 'landscape';
  if (r >= 0.9) return 'square';
  if (r >= 0.7) return 'portrait';
  return 'tall';
}

/** Fallback order when a layout has no placement for a class. */
export const CLASS_FALLBACK: Record<AspectClass, AspectClass[]> = {
  banner: ['banner', 'landscape', 'square', 'portrait', 'tall'],
  landscape: ['landscape', 'banner', 'square', 'portrait', 'tall'],
  square: ['square', 'portrait', 'landscape', 'tall', 'banner'],
  portrait: ['portrait', 'square', 'tall', 'landscape', 'banner'],
  tall: ['tall', 'portrait', 'square', 'landscape', 'banner'],
};

export const formatById = (id: string) => FORMATS.find((f) => f.id === id) ?? FORMATS[0];
