import { detectBank } from '@/lib/banks';

/** Small colored circular monogram shown next to any text that names a known bank.
 *  Renders nothing if no bank is detected, so it's safe to drop in anywhere. */
export function BankBadge({ text, size = 20 }: { text: string | undefined | null; size?: number }) {
  const info = detectBank(text);
  if (!info) return null;
  return (
    <span
      title={info.name}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        width: size, height: size, borderRadius: '50%', background: info.color,
        color: '#fff', fontSize: size * 0.42, fontWeight: 700, lineHeight: 1,
        fontFamily: "'IBM Plex Sans Thai',sans-serif", letterSpacing: '-0.02em',
      }}
    >
      {info.abbr.slice(0, 3)}
    </span>
  );
}
