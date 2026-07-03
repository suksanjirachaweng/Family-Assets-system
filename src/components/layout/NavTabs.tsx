import { useAppStore, type View } from '@/store/useAppStore';

const TABS: { key: View; label: string }[] = [
  { key: 'overview', label: 'ภาพรวม' },
  { key: 'assets', label: 'สินทรัพย์' },
  { key: 'move', label: 'ขาย / ย้ายเงิน' },
  { key: 'flow', label: 'เส้นทางเงิน' },
  { key: 'calendar', label: 'ปฏิทิน' },
  { key: 'history', label: 'ประวัติพอร์ต' },
];

export function NavTabs() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);

  return (
    <div
      className="fa-scroll fa-noprint"
      style={{ maxWidth: 1240, margin: '0 auto', padding: '0 16px', display: 'flex', gap: 4, overflowX: 'auto' }}
    >
      {TABS.map((tab) => {
        const active = view === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            style={{
              padding: '13px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontFamily: "'IBM Plex Sans Thai',sans-serif",
              fontSize: 14,
              whiteSpace: 'nowrap',
              borderBottom: active ? '3px solid var(--accent,#5E7350)' : '3px solid transparent',
              color: active ? 'var(--ink,#3C4A33)' : 'var(--muted,#8A8270)',
              fontWeight: active ? 700 : 500,
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
