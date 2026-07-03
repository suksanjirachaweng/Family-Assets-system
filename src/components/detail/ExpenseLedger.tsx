import type { Asset } from '@/data/types';
import { fmt, dueLabelTH } from '@/lib/format';
import { mixHex } from '@/lib/colors';

const CAT_COLORS: Record<string, string> = {
  'การศึกษา': '#2563EB',
  'ที่อยู่อาศัย': '#9A6B2F',
  'ประกัน': '#7C3AED',
  'สุขภาพ': '#0E9488',
  'ท่องเที่ยว': '#F0792B',
  'ภาษี': '#C026D3',
  'ยานพาหนะ': '#E0641F',
  'อื่นๆ': '#64748B',
};
const catColor = (c: string) => CAT_COLORS[c] || '#64748B';

export function ExpenseLedger({ a }: { a: Asset }) {
  const expenses = a.expenses ?? [];
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const net = a.amount - total;

  const catMap: Record<string, number> = {};
  expenses.forEach((e) => { catMap[e.cat] = (catMap[e.cat] || 0) + e.amount; });
  const cats = Object.keys(catMap).sort((x, y) => catMap[y] - catMap[x]);

  const items = expenses.slice().sort((x, y) => y.date.localeCompare(x.date));

  return (
    <div style={{ marginTop: 22, background: 'var(--surface,#FBF8F1)', border: '1px solid var(--border,#E8E0CF)', borderRadius: 13, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>สมุดบันทึกค่าใช้จ่าย</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted,#9A917F)' }}>{expenses.length} รายการ · รวม {fmt(total)}</div>
        </div>
        <button style={{ background: 'var(--accent,#5E7350)', color: 'var(--on-accent,#FBF8F1)', border: 'none', borderRadius: 10, padding: '9px 16px', fontFamily: "'IBM Plex Sans Thai'", fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
          + บันทึกค่าใช้จ่าย
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 130, background: 'var(--inset,#F1EDE2)', borderRadius: 11, padding: '12px 14px' }}>
          <div style={{ fontSize: 12, color: 'var(--muted,#9A917F)' }}>ยอดเงินในบัญชี</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink,#3C4A33)' }}>{fmt(a.amount)}</div>
        </div>
        <div style={{ flex: 1, minWidth: 130, background: 'var(--p-red-bg,#F6EAE3)', borderRadius: 11, padding: '12px 14px' }}>
          <div style={{ fontSize: 12, color: 'var(--muted,#9A917F)' }}>รวมค่าใช้จ่าย</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#B26B4E' }}>{fmt(total)}</div>
        </div>
        <div style={{ flex: 1, minWidth: 130, background: 'var(--p-green-bg,#E9F1E6)', borderRadius: 11, padding: '12px 14px' }}>
          <div style={{ fontSize: 12, color: 'var(--muted,#9A917F)' }}>{net >= 0 ? 'คงเหลือหลังหักค่าใช้จ่าย' : 'ใช้เกินยอด'}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-ink,#3C7A4A)' }}>{fmt(net)}</div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--muted,#9A917F)', fontWeight: 600, marginBottom: 9 }}>แยกตามหมวดหมู่</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
        {cats.map((c) => {
          const pct = (catMap[c] / total) * 100;
          return (
            <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: catColor(c), flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13.5 }}>{c}</span>
              <div style={{ width: 90, height: 7, background: 'var(--inset,#EDE6D6)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: catColor(c), borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--muted,#9A917F)', width: 34, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
              <span style={{ fontSize: 13.5, fontWeight: 600, width: 96, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(catMap[c])}</span>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 12, color: 'var(--muted,#9A917F)', fontWeight: 600, marginBottom: 6 }}>รายการทั้งหมด</div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {items.map((e, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 2px', borderTop: '1px solid var(--border,#EFE8D9)' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: catColor(e.cat), flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.label}</div>
              <div style={{ fontSize: 12, color: 'var(--muted,#9A917F)' }}>{dueLabelTH(e.date)}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: catColor(e.cat), background: mixHex(catColor(e.cat), '#FFFFFF', 0.85), padding: '2px 8px', borderRadius: 5, whiteSpace: 'nowrap' }}>{e.cat}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#B26B4E', width: 100, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>- {fmt(e.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
