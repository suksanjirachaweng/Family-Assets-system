import type { ReactNode } from 'react';
import { useAppStore } from '@/store/useAppStore';

/** Page heading with optional italic English subtitle (gated by showEnglish). */
export function ScreenTitle({ title, en, right }: { title: string; en?: string; right?: ReactNode }) {
  const showEnglish = useAppStore((s) => s.showEnglish);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 18,
        flexWrap: 'wrap',
      }}
    >
      <div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>{title}</h1>
        {en && showEnglish && (
          <div style={{ fontFamily: "'Lora',serif", fontStyle: 'italic', color: 'var(--muted,#A39A87)', fontSize: 14 }}>
            {en}
          </div>
        )}
      </div>
      {right}
    </div>
  );
}

/** Standard card surface used across the app. */
export function Card({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: 'var(--surface,#FBF8F1)',
        border: '1px solid var(--border,#E8E0CF)',
        borderRadius: 16,
        padding: 22,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
