import { useAppStore, type ThemeKey } from '@/store/useAppStore';
import { NavTabs } from './NavTabs';

const THEME_BTNS: { key: ThemeKey; glyph: string; label: string }[] = [
  { key: 'earth', glyph: '🌿', label: 'ดิน/เขียว' },
  { key: 'dark', glyph: '🌙', label: 'มืด' },
  { key: 'navy', glyph: '⚓', label: 'กรมท่า/ทอง' },
  { key: 'teal', glyph: '🌊', label: 'เทา/เขียวน้ำทะเล' },
];

export function Header({ totalFmt }: { totalFmt: string }) {
  const theme = useAppStore((s) => s.theme);
  const showEnglish = useAppStore((s) => s.showEnglish);
  const set = useAppStore((s) => s.set);

  return (
    <header
      className="fa-noprint"
      style={{
        background: 'var(--surface,#FBF8F1)',
        borderBottom: '1px solid var(--border2,#E2D9C8)',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: 'var(--accent,#5E7350)',
              color: 'var(--on-accent,#FBF8F1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            บ
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.01em' }}>สินทรัพย์ครอบครัว</div>
            <div
              style={{
                fontFamily: "'Lora',serif",
                fontStyle: 'italic',
                fontSize: 12,
                color: 'var(--muted,#9A917F)',
                letterSpacing: '0.02em',
              }}
            >
              Family Asset Registry
            </div>
          </div>
        </div>

        <div className="fa-header-stats" style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--muted,#9A917F)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              มูลค่ารวมสุทธิ
            </div>
            <div
              className="fa-tot"
              style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 22, color: 'var(--ink,#3C4A33)' }}
            >
              {totalFmt}
            </div>
          </div>
          <div className="fa-hide-sm" style={{ width: 1, height: 34, background: 'var(--border2,#E2D9C8)' }} />
          <div className="fa-hide-sm" style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--muted,#9A917F)' }}>ข้อมูล ณ</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>26 มิ.ย. 2569</div>
          </div>

          <button
            onClick={() => set('showEnglish', !showEnglish)}
            title="สลับภาษา EN/ไทย"
            className="fa-noprint"
            style={{
              border: '1px solid var(--border2,#E2D9C8)',
              background: showEnglish ? 'var(--accent,#5E7350)' : 'var(--inset,#F1EDE2)',
              color: showEnglish ? 'var(--on-accent,#FBF8F1)' : 'var(--muted2,#6B6356)',
              borderRadius: 9,
              padding: '6px 11px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            EN
          </button>

          <div
            className="fa-noprint"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'var(--inset,#F1EDE2)',
              border: '1px solid var(--border2,#E2D9C8)',
              borderRadius: 11,
              padding: 4,
            }}
          >
            {THEME_BTNS.map((t) => {
              const active = theme === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => set('theme', t.key)}
                  title={t.label}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 15,
                    lineHeight: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: active ? 'var(--accent,#5E7350)' : 'transparent',
                    filter: active ? 'none' : 'grayscale(0.6) opacity(0.65)',
                    boxShadow: active ? '0 1px 4px rgba(0,0,0,0.18)' : 'none',
                  }}
                >
                  {t.glyph}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <NavTabs />
    </header>
  );
}
