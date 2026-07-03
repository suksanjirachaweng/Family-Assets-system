import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { Asset, AssetType } from '@/data/types';
import { fmt, dueLabelTH, daysLeft } from '@/lib/format';
import { ScreenTitle } from '@/components/common/ScreenTitle';
import { BankBadge } from '@/components/common/BankBadge';

const FILTERS: { key: AssetType | 'all'; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'fd', label: 'ฝากประจำ' },
  { key: 'sav', label: 'ออมทรัพย์' },
  { key: 'fund', label: 'กองทุน' },
  { key: 'bond', label: 'หุ้นกู้' },
  { key: 'stock', label: 'หุ้นสามัญ' },
  { key: 'gold', label: 'ทองคำ' },
  { key: 'land', label: 'อสังหาฯ' },
  { key: 'other', label: 'อื่นๆ' },
];

const th: React.CSSProperties = { padding: '14px 12px', fontWeight: 600 };

type SortKey = 'type' | 'name' | 'owners' | 'amount' | 'rate' | 'due' | 'iAcct';
type SortDir = 'asc' | 'desc';

const iAcctText = (a: Asset) => (a.iAcct ? a.iAcct.bank + ' ' + a.iAcct.no : a.receiving ? 'บัญชีรับดอกเบี้ย' : null);
const rateValue = (a: Asset) => {
  if (a.type === 'gold' || a.type === 'land' || a.type === 'other') return null;
  if (a.type === 'fund') return (a.rate ?? 0) > 0 ? a.rate ?? 0 : null;
  return a.rate ?? null;
};

const SORT_ACCESSORS: Record<SortKey, (a: Asset) => string | number | null> = {
  type: (a) => a.typeLabel,
  name: (a) => a.name,
  owners: (a) => a.owners.join(' · '),
  amount: (a) => a.amount,
  rate: rateValue,
  due: (a) => a.due ?? null,
  iAcct: iAcctText,
};

export function AssetsView() {
  const search = useAppStore((s) => s.search);
  const typeFilter = useAppStore((s) => s.typeFilter);
  const set = useAppStore((s) => s.set);
  const openAsset = useAppStore((s) => s.openAsset);
  const openAddForm = useAppStore((s) => s.openAddForm);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const assets = useAppStore((s) => s.assets);
  const q = (search || '').trim().toLowerCase();

  const filtered = useMemo(() => {
    const byType = typeFilter === 'all' ? assets : assets.filter((a) => a.type === typeFilter);
    return q
      ? byType.filter((a) =>
          (a.name + ' ' + a.acctNo + ' ' + a.owners.join(' ') + ' ' + a.typeLabel).toLowerCase().includes(q),
        )
      : byType;
  }, [assets, typeFilter, q]);

  const sorted = useMemo(() => {
    const acc = SORT_ACCESSORS[sortKey];
    const list = filtered.slice();
    list.sort((x, y) => {
      const vx = acc(x);
      const vy = acc(y);
      if (vx == null && vy == null) return 0;
      if (vx == null) return 1; // rows with no value always sort last
      if (vy == null) return -1;
      const cmp = typeof vx === 'number' && typeof vy === 'number' ? vx - vy : String(vx).localeCompare(String(vy), 'th');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  const onSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const rateFmt = (a: (typeof assets)[number]) => {
    if (a.type === 'gold' || a.type === 'land' || a.type === 'other') return '—';
    if (a.type === 'fund') return (a.rate ?? 0) > 0 ? (a.rate ?? 0).toFixed(2) + '%' : '—';
    return (a.rate ?? 0).toFixed(2) + '%';
  };

  return (
    <section>
      <ScreenTitle
        title="รายการสินทรัพย์"
        en="All assets"
        right={
          <button
            onClick={openAddForm}
            style={{
              background: 'var(--accent,#5E7350)', color: 'var(--on-accent,#FBF8F1)', border: 'none',
              borderRadius: 10, padding: '10px 18px', fontFamily: "'IBM Plex Sans Thai'",
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            + เพิ่มสินทรัพย์
          </button>
        }
      />

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted,#A89F8C)', fontSize: 15 }}>⌕</span>
          <input
            value={search}
            onChange={(e) => set('search', e.target.value)}
            placeholder="ค้นหาชื่อรายการ ธนาคาร เลขบัญชี หรือเจ้าของ..."
            style={{
              width: '100%', padding: '11px 13px 11px 36px', border: '1px solid var(--border2,#E2D9C8)',
              borderRadius: 11, background: 'var(--surface,#FBF8F1)', fontFamily: "'IBM Plex Sans Thai',sans-serif",
              fontSize: 14, color: 'var(--text,#2C2A23)', boxSizing: 'border-box',
            }}
          />
          {!!q && (
            <button
              onClick={() => set('search', '')}
              style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', width: 22, height: 22, border: 'none', background: '#E2D9C8', color: 'var(--muted2,#6B6356)', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
            >
              ✕
            </button>
          )}
        </div>
        <span style={{ fontSize: 13, color: 'var(--muted,#9A917F)', whiteSpace: 'nowrap' }}>{filtered.length} รายการ</span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <select
          value={typeFilter}
          onChange={(e) => set('typeFilter', e.target.value as AssetType | 'all')}
          style={{
            padding: '10px 13px', borderRadius: 11, border: '1px solid var(--border2,#E2D9C8)',
            background: 'var(--surface,#FBF8F1)', fontFamily: "'IBM Plex Sans Thai',sans-serif",
            fontSize: 14, color: 'var(--text,#2C2A23)', minWidth: 180,
          }}
        >
          {FILTERS.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
      </div>

      <div className="fa-scroll" style={{ background: 'var(--surface,#FBF8F1)', border: '1px solid var(--border,#E8E0CF)', borderRadius: 16, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860, fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--muted,#9A917F)', fontSize: 12, letterSpacing: '0.03em' }}>
              <SortTh label="ประเภท" sortKey="type" active={sortKey === 'type'} dir={sortDir} onClick={onSort} style={{ padding: '14px 18px' }} />
              <SortTh label="สถาบัน / ชื่อรายการ" sortKey="name" active={sortKey === 'name'} dir={sortDir} onClick={onSort} />
              <SortTh label="เจ้าของบัญชี" sortKey="owners" active={sortKey === 'owners'} dir={sortDir} onClick={onSort} />
              <SortTh label="จำนวนเงิน" sortKey="amount" active={sortKey === 'amount'} dir={sortDir} onClick={onSort} align="right" />
              <SortTh label="อัตรา" sortKey="rate" active={sortKey === 'rate'} dir={sortDir} onClick={onSort} align="right" />
              <SortTh label="ครบกำหนด" sortKey="due" active={sortKey === 'due'} dir={sortDir} onClick={onSort} />
              <SortTh label="บัญชีรับดอกเบี้ย" sortKey="iAcct" active={sortKey === 'iAcct'} dir={sortDir} onClick={onSort} style={{ padding: '14px 18px' }} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((a) => {
              const days = a.due ? daysLeft(a.due) : null;
              return (
                <tr key={a.id} onClick={() => openAsset(a.id)} style={{ borderTop: '1px solid var(--border,#EFE8D9)', cursor: 'pointer' }}>
                  <td style={{ padding: '13px 18px' }}>
                    <span style={{ background: a.color + '22', color: a.color, fontSize: 12, fontWeight: 600, padding: '4px 11px', borderRadius: 20, whiteSpace: 'nowrap' }}>{a.typeLabel}</span>
                  </td>
                  <td style={{ padding: '13px 12px' }}>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><BankBadge text={a.name} />{a.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted,#9A917F)' }}>{a.acctNo}</div>
                  </td>
                  <td style={{ padding: '13px 12px', color: 'var(--text,#4A4538)' }}>{a.owners.join(' · ')}</td>
                  <td style={{ padding: '13px 12px', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(a.amount)}</td>
                  <td style={{ padding: '13px 12px', textAlign: 'right', color: 'var(--accent-ink,#5E7350)', fontVariantNumeric: 'tabular-nums' }}>{rateFmt(a)}</td>
                  <td style={{ padding: '13px 12px' }}>
                    <span style={a.due
                      ? { fontSize: 13, fontWeight: 600, color: days! <= 30 ? '#C0472E' : days! <= 90 ? '#B26B4E' : '#4A4538' }
                      : { fontSize: 13, color: 'var(--muted,#A89F8C)' }}>
                      {a.due ? dueLabelTH(a.due) : 'ไม่มีกำหนด'}
                    </span>
                  </td>
                  <td style={{ padding: '13px 18px', fontSize: 13, color: 'var(--muted2,#6B6356)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {a.iAcct ? (<><BankBadge text={a.iAcct.bank} />{a.iAcct.bank + ' ' + a.iAcct.no}</>) : a.receiving ? 'บัญชีรับดอกเบี้ย' : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--muted,#9A917F)' }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>⌕</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--muted2,#6B6356)' }}>ไม่พบรายการที่ตรงกับการค้นหา</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>ลองเปลี่ยนคำค้นหา หรือล้างตัวกรองประเภท</div>
            <button
              onClick={() => set('search', '')}
              style={{ marginTop: 14, background: 'var(--accent,#5E7350)', color: 'var(--on-accent,#FBF8F1)', border: 'none', borderRadius: 10, padding: '9px 18px', fontFamily: "'IBM Plex Sans Thai'", fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
            >
              ล้างการค้นหา
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function SortTh({
  label, sortKey, active, dir, onClick, align, style,
}: {
  label: string; sortKey: SortKey; active: boolean; dir: SortDir; onClick: (k: SortKey) => void;
  align?: 'left' | 'right'; style?: React.CSSProperties;
}) {
  return (
    <th
      onClick={() => onClick(sortKey)}
      style={{ ...th, textAlign: align ?? 'left', cursor: 'pointer', userSelect: 'none', ...style }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexDirection: align === 'right' ? 'row-reverse' : 'row' }}>
        {label}
        <span style={{ fontSize: 9, color: active ? 'var(--accent-ink,#5E7350)' : 'var(--muted,#A89F8C)' }}>
          {active ? (dir === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </span>
    </th>
  );
}
