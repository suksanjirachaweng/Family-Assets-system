import { useEffect, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { fmt } from '@/lib/format';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { OverviewView } from '@/views/OverviewView';
import { AssetsView } from '@/views/AssetsView';
import { DetailView } from '@/views/DetailView';
import { CalendarView } from '@/views/CalendarView';
import { HistoryView } from '@/views/HistoryView';
import { MoveView } from '@/views/MoveView';
import { FlowView } from '@/views/FlowView';
import { LineSettingsView } from '@/views/LineSettingsView';
import { AssetFormModal } from '@/components/form/AssetFormModal';
import { PrintHeader } from '@/components/layout/PrintHeader';

export default function App() {
  const view = useAppStore((s) => s.view);
  const theme = useAppStore((s) => s.theme);
  const showForm = useAppStore((s) => s.showForm);
  const assets = useAppStore((s) => s.assets);
  const loadData = useAppStore((s) => s.loadData);
  const loading = useAppStore((s) => s.loading);
  const dataSource = useAppStore((s) => s.dataSource);

  useEffect(() => { loadData(); }, [loadData]);

  const total = useMemo(() => assets.reduce((s, a) => s + a.amount, 0), [assets]);
  const totalFmt = fmt(total);

  // First load only: hide the local mock data behind a loading dialog while
  // the real data is being fetched, instead of flashing mock numbers first.
  const stillLoadingFirstData = loading && dataSource === 'mock';

  return (
    <div
      className="fa-root"
      data-theme={theme}
      style={{
        minHeight: '100vh',
        background: 'var(--bg,#F4EFE6)',
        color: 'var(--text,#2C2A23)',
        fontFamily: "'IBM Plex Sans Thai',sans-serif",
        fontSize: 15,
        lineHeight: 1.5,
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {stillLoadingFirstData ? (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface,#FBF8F1)', border: '1px solid var(--border,#E8E0CF)', borderRadius: 16, padding: '32px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, boxShadow: '0 8px 30px rgba(20,16,8,0.12)' }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '3px solid var(--border2,#E2D9C8)', borderTopColor: 'var(--accent,#5E7350)',
                animation: 'fa-spin 0.8s linear infinite',
              }}
            />
            <div style={{ fontSize: 14, color: 'var(--muted2,#6B6356)' }}>กำลังโหลดข้อมูล...</div>
          </div>
        </div>
      ) : (
        <>
          <Header totalFmt={totalFmt} />

          <main style={{ maxWidth: 1240, margin: '0 auto', padding: '28px 24px 64px' }}>
            <PrintHeader totalFmt={totalFmt} />
            {view === 'overview' && <OverviewView />}
            {view === 'assets' && <AssetsView />}
            {view === 'detail' && <DetailView />}
            {view === 'calendar' && <CalendarView />}
            {view === 'history' && <HistoryView />}
            {view === 'move' && <MoveView />}
            {view === 'flow' && <FlowView />}
            {view === 'line' && <LineSettingsView />}
          </main>

          {showForm && <AssetFormModal />}

          <Footer />
        </>
      )}
    </div>
  );
}
