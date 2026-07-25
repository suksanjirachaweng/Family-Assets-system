const norm = (s: string) =>
  String(s).split('·').map((x) => x.trim()).filter(Boolean).sort().join('·');

/** Fixed hue per individual family owner — chosen to stay visually distinct
 *  from each other (spread across the hue wheel, not just light/dark
 *  variants of the same color). */
const OWNER_BASE: Record<string, string> = {
  'ชัย': '#E0641F',
  'วิวัฒน์': '#2563EB',
  'ธีรดา': '#0E9488',
  'ครอบครัว': '#CA8A04',
  'กวิน': '#DB2777',
  'สุขสันต์': '#7C3AED',
  'สุวิชช์': '#16A34A',
  'วิภาดา': '#DC2626',
  'สุภาดา': '#0891B2',
};

const hexToRgb = (hex: string) => hex.replace('#', '').match(/../g)!.map((h) => parseInt(h, 16));
const rgbToHex = (rgb: number[]) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

const comboCache: Record<string, string> = {};

/**
 * Stable color for an owner (or owner combination). Known individuals map to
 * a fixed hue; any joint-owner combo not explicitly listed is derived by
 * averaging its members' colors, so every combination gets its own distinct,
 * related color instead of falling back to one flat gray.
 */
export const ownerColor = (o: string): string => {
  if (OWNER_BASE[o]) return OWNER_BASE[o];
  const key = norm(o);
  if (OWNER_BASE[key]) return OWNER_BASE[key];
  if (comboCache[key]) return comboCache[key];
  const members = key.split('·').filter(Boolean);
  if (!members.length) return '#64748B';
  const rgbs = members.map((m) => hexToRgb(OWNER_BASE[m] || '#64748B'));
  const avg = [0, 1, 2].map((i) => rgbs.reduce((s, c) => s + c[i], 0) / rgbs.length);
  return (comboCache[key] = rgbToHex(avg));
};

/** Linear-interpolate a hex color toward a target hex by t (0..1). */
export const mixHex = (hex: string, target: string, t: number) => {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
