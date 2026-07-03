import { useMemo } from 'react';
import { useAppStore, type HistRange } from '@/store/useAppStore';
import { TYPES } from '@/data/types';
import { ownerKey, TYPE_ORDER } from '@/lib/assets';
import { fmt, fmtShort, thMon } from '@/lib/format';
import { ownerColor, mixHex } from '@/lib/colors';
import { ScreenTitle } from '@/components/common/ScreenTitle';

interface Series { label: string; color: string; total: number }
const CH = 188;

const histRnd = (i: number, s: number) => {
  const v = Math.sin((i + 1.3) * s) * 1000;
  return v - Math.floor(v);
};

const RANGE_CFG: Record<HistRange, { n: number; step: number }> = {
  '1Y': { n: 12, step: 1 },
  '3Y': { n: 12, step: 3 },
  '5Y': { n: 10, step: 6 },
  'ALL': { n: 8, step: 12 },
};

function periodLabel(monthsAgo: number, step: number) {
  const d = new Date(2026, 5, 1);
  d.setMonth(d.getMonth() - monthsAgo);
  const yy = (d.getFullYear() + 543) % 100;
  if (step === 1) return thMon()[d.getMonth()] + ' ' + yy;
  if (step === 3) return 'Q' + (Math.floor(d.getMonth() / 3) + 1) + '/' + yy;
  if (step === 6) return (d.getMonth() < 6 ? 'H1' : 'H2') + '/' + yy;
  return 'ปี ' + (d.getFullYear() + 543);
}

const growthAt = (monthsAgo: number, seed: number) => {
  const yrs = monthsAgo / 12;
  const base = Math.pow(1 / 1.105, yrs);
  const noise = (histRnd(monthsAgo + 1, seed) - 0.5) * 0.045;
  return Math.max(0.1, base + noise);
};

export function HistoryView() {
  const histRange = useAppStore((s) => s.histRange);
  const set = useAppStore((s) => s.set);
  const assets = useAppStore((s) => s.assets);
  const total = useMemo(() => assets.reduce((s, a) => s + a.amount, 0), [assets]);

  const typeSeries: Series[] = useMemo(
    () =>
      TYPE_ORDER.map((k) => ({ label: TYPES[k].label, color: TYPES[k].color, total: assets.filter((a) => a.type === k).reduce((s, a) => s + a.amount, 0) }))
        .filter((s) => s.total > 0),
    [assets],
  );

  const ownerSeries: Series[] = useMemo(() => {
    const buckets: Record<string, number> = {};
    assets.forEach((a) => { const key = ownerKey(a.owners); buckets[key] = (buckets[key] || 0) + a.amount; });
    return Object.keys(buckets)
      .sort((x, y) => buckets[y] - buckets[x])
      .map((name) => ({ label: name, color: ownerColor(name.replace(/ · /g, '·')), total: buckets[name] }));
  }, [assets]);

  const cfg = RANGE_CFG[histRange];
  const periods = useMemo(() => {
    const p: { monthsAgo: number; label: string }[] = [];
    for (let i = cfg.n - 1; i >= 0; i--) {
      const monthsAgo = i * cfg.step;
      p.push({ monthsAgo, label: periodLabel(monthsAgo, cfg.step) });
    }
    return p;
  }, [cfg]);

  const buildHist = (series: Series[]) => {
    const cols = periods.map((p) => {
      const segs = series.map((s, si) => ({ label: s.label, color: s.color, value: s.total * growthAt(p.monthsAgo, 3.1 + si * 1.7) }));
      return { label: p.label, segs, total: segs.reduce((acc, s) => acc + s.value, 0) };
    });
    const maxTotal = Math.max(...cols.map((c) => c.total));
    return { series, cols, maxTotal };
  };

  const histByType = buildHist(typeSeries);
  const histByOwner = buildHist(ownerSeries);

  const oldestF = growthAt(periods[0].monthsAgo, 3.1);
  const growthPct = '+' + (((1 - oldestF) / oldestF) * 100).toFixed(1) + '%';

  const rangeBtn = (k: HistRange) => {
    const active = histRange === k;
    return (
      <button
        key={k}
        onClick={() => set('histRange', k)}
        style={{ padding: '6px 13px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Sans Thai',sans-serif", fontSize: 13, fontWeight: 700, background: active ? '#5E7350' : 'transparent', color: active ? '#FBF8F1' : '#6B6356' }}
      >
        {k}
      </button>
    );
  };

  return (
    <section>
      <ScreenTitle
        title="ประวัติพอร์ต"
        en="Portfolio history"
        right={
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--muted,#9A917F)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>มูลค่ารวมปัจจุบัน</div>
            <div style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 22, color: 'var(--ink,#3C4A33)' }}>
              {fmt(total)} <span style={{ fontSize: 13, fontFamily: "'IBM Plex Sans Thai'", color: 'var(--accent-ink,#3C7A4A)' }}>{growthPct}</span>
            </div>
          </div>
        }
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <div style={{ display: 'flex', background: 'var(--surface,#FBF8F1)', border: '1px solid var(--border2,#E2D9C8)', borderRadius: 10, padding: 3 }}>
          {(['1Y', '3Y', '5Y', 'ALL'] as HistRange[]).map(rangeBtn)}
        </div>
      </div>

      <ChartCard title="แยกตามประเภท" hist={histByType} />
      <div style={{ height: 18 }} />
      <ChartCard title="แยกตามเจ้าของ" hist={histByOwner} />
    </section>
  );
}

function ChartCard({ title, hist }: { title: string; hist: { series: Series[]; cols: { label: string; segs: { color: string; value: number }[]; total: number }[]; maxTotal: number } }) {
  const { series, cols, maxTotal } = hist;
  return (
    <div style={{ background: 'var(--surface,#FBF8F1)', border: '1px solid var(--border,#E8E0CF)', borderRadius: 16, padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 4 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {series.map((l) => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--muted2,#6B6356)' }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: mixHex(l.color, '#FFFFFF', 0.58), border: '1.5px solid ' + mixHex(l.color, '#000000', 0.12), display: 'inline-block', flexShrink: 0 }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: CH, fontSize: 11, color: 'var(--muted,#A89F8C)', textAlign: 'right', paddingBottom: 22, flexShrink: 0 }}>
          <span>{fmtShort(maxTotal)}</span><span>{fmtShort(maxTotal / 2)}</span><span>฿0</span>
        </div>
        <div className="fa-scroll" style={{ flex: 1, display: 'flex', gap: 7, alignItems: 'flex-end', overflowX: 'auto', minWidth: 0 }}>
          {cols.map((c, i) => (
            <div key={i} style={{ flex: 1, minWidth: 34, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 10, color: 'var(--ink,#3C4A33)', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtShort(c.total)}</div>
              <div style={{ display: 'flex', flexDirection: 'column-reverse', height: CH, width: '100%', borderRadius: 5, overflow: 'hidden', background: 'var(--inset,#EFE9DB)' }}>
                {c.segs.filter((s) => s.value > 0).map((s, si) => (
                  <div key={si} style={{ background: mixHex(s.color, '#FFFFFF', 0.58), borderTop: '1.5px solid ' + mixHex(s.color, '#000000', 0.12), height: (s.value / maxTotal) * CH, width: '100%', boxSizing: 'border-box' }} />
                ))}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--muted,#9A917F)', whiteSpace: 'nowrap' }}>{c.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
