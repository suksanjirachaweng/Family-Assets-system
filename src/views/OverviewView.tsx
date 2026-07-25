import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { TYPES } from '@/data/types';
import { netInterest, assetsWithDue, ownerKey, TYPE_ORDER } from '@/lib/assets';
import { fmt, fmtM, GOLD_PRICE_PER_BAHT } from '@/lib/format';
import { ownerColor } from '@/lib/colors';
import { ScreenTitle, Card } from '@/components/common/ScreenTitle';
import { BankBadge } from '@/components/common/BankBadge';

const statCardStyle: React.CSSProperties = {
  background: 'var(--surface,#FBF8F1)',
  border: '1px solid var(--border,#E8E0CF)',
  borderRadius: 16,
  padding: '18px 20px',
};
const statLabel: React.CSSProperties = { fontSize: 12, color: 'var(--muted,#9A917F)', marginBottom: 6 };
const statBig: React.CSSProperties = { fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 27, color: 'var(--ink,#3C4A33)' };
const statSub: React.CSSProperties = { fontSize: 12, color: 'var(--muted,#8A8270)', marginTop: 4 };

export function OverviewView() {
  const openAsset = useAppStore((s) => s.openAsset);
  const setView = useAppStore((s) => s.setView);
  const expandedType = useAppStore((s) => s.expandedType);
  const setExpanded = useAppStore((s) => s.set);

  const assets = useAppStore((s) => s.assets);
  const total = useMemo(() => assets.reduce((s, a) => s + a.amount, 0), [assets]);

  const typeSummary = useMemo(
    () =>
      TYPE_ORDER.map((k) => {
        const items = assets.filter((a) => a.type === k);
        const tot = items.reduce((s, a) => s + a.amount, 0);
        const pct = total > 0 ? (tot / total) * 100 : 0;
        return { key: k, label: TYPES[k].label, color: TYPES[k].color, total: tot, pct, count: items.length, items };
      }).filter((s) => s.total > 0),
    [assets, total],
  );

  const ownerSummary = useMemo(() => {
    const buckets: Record<string, number> = {};
    assets.forEach((a) => {
      const key = ownerKey(a.owners);
      buckets[key] = (buckets[key] || 0) + a.amount;
    });
    const max = Math.max(...Object.values(buckets));
    return Object.keys(buckets)
      .sort((x, y) => buckets[y] - buckets[x])
      .map((name) => ({ name, total: buckets[name], pct: (buckets[name] / max) * 100 }));
  }, [assets]);

  const withDue = useMemo(() => assetsWithDue(assets), [assets]);
  const upcoming = withDue.slice(0, 4);
  const dueSoon = withDue.filter((x) => x.days <= 90 && x.days >= 0);

  const totalGoldBaht = useMemo(
    () => assets.filter((a) => a.type === 'gold').reduce((s, a) => s + (a.goldBaht ?? 0), 0),
    [assets],
  );

  const yearIncome = assets.filter((a) => (a.rate ?? 0) > 0 && a.type !== 'gold').reduce((s, a) => s + netInterest(a), 0);

  let plCost = 0, plValue = 0;
  assets.forEach((a) => {
    if (a.type === 'fund') { plCost += (a.units ?? 0) * (a.navBuy ?? 0); plValue += a.amount; }
    else if (a.type === 'stock') { plCost += (a.shares ?? 0) * (a.priceBuy ?? 0); plValue += a.amount; }
  });
  const plGain = plValue - plCost;
  const plUp = plGain >= 0;

  const doPrint = () => { try { window.print(); } catch { /* noop */ } };

  const daysColor = (days: number) => (days <= 30 ? '#C0472E' : days <= 90 ? '#B26B4E' : '#5E7350');

  return (
    <section>
      <ScreenTitle
        title="ภาพรวมพอร์ต"
        en="Portfolio Overview"
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--muted,#8A8270)' }}>{assets.length} รายการ · {ownerSummary.length} เจ้าของ</div>
            <button
              onClick={doPrint}
              className="fa-noprint"
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: 'var(--surface,#FBF8F1)', border: '1px solid var(--border2,#E2D9C8)',
                borderRadius: 10, padding: '9px 15px', fontFamily: "'IBM Plex Sans Thai'",
                fontSize: 13.5, fontWeight: 600, color: 'var(--accent-ink,#5E7350)', cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 15 }}>⎙</span> พิมพ์ / บันทึก PDF
            </button>
          </div>
        }
      />

      {/* stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14, marginBottom: 22 }}>
        <div style={statCardStyle}>
          <div style={statLabel}>มูลค่ารวมทั้งหมด</div>
          <div style={statBig}>{fmt(total)}</div>
          <div style={{ fontSize: 12, color: 'var(--accent-ink,#5E7350)', marginTop: 4 }}>{fmtM(total)}</div>
        </div>
        <div style={statCardStyle}>
          <div style={statLabel}>ดอกเบี้ย/ปันผลต่อปี (สุทธิหลังหักภาษี)</div>
          <div style={statBig}>{fmt(yearIncome)}</div>
          <div style={statSub}>≈ {fmt(yearIncome / 12)} / เดือน</div>
        </div>
        <div style={statCardStyle}>
          <div style={statLabel}>ใกล้ครบกำหนด (90 วัน)</div>
          <div style={{ ...statBig, color: '#B26B4E' }}>
            {dueSoon.length} <span style={{ fontSize: 15, fontFamily: "'IBM Plex Sans Thai'", color: 'var(--muted,#8A8270)' }}>รายการ</span>
          </div>
          <div style={statSub}>{fmt(dueSoon.reduce((s, x) => s + x.a.amount, 0))}</div>
        </div>
        <div style={statCardStyle}>
          <div style={statLabel}>ทองคำสะสม</div>
          <div style={{ ...statBig, color: '#B98E2B' }}>
            {totalGoldBaht} <span style={{ fontSize: 15, fontFamily: "'IBM Plex Sans Thai'", color: 'var(--muted,#8A8270)' }}>บาททอง</span>
          </div>
          <div style={statSub}>{fmt(totalGoldBaht * GOLD_PRICE_PER_BAHT)}</div>
        </div>
        <div style={statCardStyle}>
          <div style={statLabel}>กำไร/ขาดทุนรวม (หุ้น+กองทุน · ยังไม่รับรู้)</div>
          <div style={{ ...statBig, color: plUp ? '#1F8A4C' : '#C0392B' }}>
            {(plUp ? '+' : '') + fmt(plGain)}{' '}
            <span style={{ fontSize: 14, fontFamily: "'IBM Plex Sans Thai'" }}>
              {(plUp ? '▲ +' : '▼ ') + (plCost > 0 ? Math.abs((plGain / plCost) * 100).toFixed(2) : '0.00') + '%'}
            </span>
          </div>
          <div style={statSub}>ทุน {fmt(plCost)} → ตลาด {fmt(plValue)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 18 }}>
        {/* allocation */}
        <Card>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>สัดส่วนตามประเภท</div>
          <EnSub text="Allocation by type" />
          <div style={{ display: 'flex', height: 20, borderRadius: 10, overflow: 'hidden', margin: '10px 0 18px', background: 'var(--inset,#EDE6D6)' }}>
            {typeSummary.map((seg) => (
              <div key={seg.key} style={{ flex: `0 0 ${seg.pct}%`, background: seg.color }} />
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {typeSummary.map((seg) => {
              const expanded = expandedType === seg.key;
              return (
                <div key={seg.key} style={{ borderRadius: 10 }}>
                  <div
                    onClick={() => setExpanded('expandedType', expanded ? null : seg.key)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '3px 0' }}
                  >
                    <span style={{ width: 16, color: 'var(--muted,#A89F8C)', fontSize: 11, textAlign: 'center' }}>{expanded ? '▾' : '▸'}</span>
                    <span style={{ width: 11, height: 11, borderRadius: '50%', background: seg.color, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 14 }}>
                      {seg.label} <span style={{ color: 'var(--muted,#A89F8C)', fontSize: 12 }}>({seg.count})</span>
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--muted,#8A8270)', width: 48, textAlign: 'right' }}>{seg.pct.toFixed(1)}%</span>
                    <span style={{ fontWeight: 600, fontSize: 14, width: 120, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(seg.total)}</span>
                  </div>
                  {expanded && (
                    <div style={{ margin: '4px 0 8px 26px', paddingLeft: 14, borderLeft: `2px solid ${seg.color}`, display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {seg.items.map((a) => (
                        <div key={a.id} onClick={() => openAsset(a.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', borderRadius: 8, cursor: 'pointer' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                              <BankBadge text={a.name} size={15} />
                              <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{a.name}</div>
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--muted,#A89F8C)' }}>{a.owners.join(' · ')}</div>
                          </div>
                          <span style={{ fontSize: 13, color: 'var(--text,#5B5444)', fontVariantNumeric: 'tabular-nums' }}>{fmt(a.amount)}</span>
                          <span style={{ color: '#C2B79E', fontSize: 13 }}>›</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* by owner */}
        <Card>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>แยกตามเจ้าของ</div>
          <EnSub text="By account holder" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15, marginTop: 8 }}>
            {ownerSummary.map((o) => (
              <div key={o.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 5 }}>
                  <span style={{ fontWeight: 600 }}>{o.name}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--ink,#3C4A33)', fontWeight: 600 }}>{fmt(o.total)}</span>
                </div>
                <div style={{ height: 9, borderRadius: 5, background: 'var(--inset,#EDE6D6)', overflow: 'hidden' }}>
                  <div style={{ width: `${o.pct}%`, height: '100%', background: ownerColor(o.name.replace(/ · /g, '·')), borderRadius: 5 }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* upcoming */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>ครบกำหนดเร็วๆ นี้</div>
              <EnSub text="Upcoming maturities" />
            </div>
            <button onClick={() => setView('calendar')} style={{ background: 'none', border: 'none', color: 'var(--accent-ink,#5E7350)', fontFamily: "'IBM Plex Sans Thai'", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              ปฏิทิน →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {upcoming.map(({ a, days }) => (
              <div key={a.id} onClick={() => openAsset(a.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 6px', borderRadius: 9, cursor: 'pointer', borderBottom: '1px solid var(--border,#EFE8D9)' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <BankBadge text={a.name} size={16} />
                    <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{a.name}</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted,#9A917F)' }}>{a.typeLabel} · {a.owners.join(' · ')}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(a.amount)}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: daysColor(days) }}>
                    {days < 0 ? 'ครบแล้ว' : 'อีก ' + days + ' วัน'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}

function EnSub({ text }: { text: string }) {
  const showEnglish = useAppStore((s) => s.showEnglish);
  if (!showEnglish) return null;
  return (
    <div style={{ fontFamily: "'Lora',serif", fontStyle: 'italic', color: 'var(--muted,#A39A87)', fontSize: 13, marginBottom: 14 }}>
      {text}
    </div>
  );
}
