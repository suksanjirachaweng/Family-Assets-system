const norm = (s: string) =>
  String(s).split('·').map((x) => x.trim()).filter(Boolean).sort().join('·');

const OWNER_MAP: Record<string, string> = {
  'วิวัฒน์': '#2563EB',
  'ชัย': '#E0641F',
  'ธีรดา': '#0E9488',
  'ชัย·ธีรดา': '#7C3AED',
  'ชัย·วิวัฒน์': '#C026D3',
  'ธีรดา·วิวัฒน์': '#0891B2',
  'ครอบครัว': '#CA8A04',
};

const normalizedMap: Record<string, string> = {};
Object.keys(OWNER_MAP).forEach((k) => {
  normalizedMap[norm(k)] = OWNER_MAP[k];
});

/** Stable color for an owner (or owner combination). */
export const ownerColor = (o: string) => normalizedMap[norm(o)] || '#64748B';

/** Linear-interpolate a hex color toward a target hex by t (0..1). */
export const mixHex = (hex: string, target: string, t: number) => {
  const a = hex.replace('#', '').match(/../g)!.map((h) => parseInt(h, 16));
  const b = target.replace('#', '').match(/../g)!.map((h) => parseInt(h, 16));
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
