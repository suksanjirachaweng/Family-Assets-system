import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { Asset } from '@/data/types';
import { netInterest } from '@/lib/assets';
import { fmt, dueLabelTH, daysLeft, GOLD_PRICE_PER_BAHT, WHT_RATE } from '@/lib/format';
import { ExpenseLedger } from '@/components/detail/ExpenseLedger';
import { BankBadge } from '@/components/common/BankBadge';
import * as api from '@/api/client';

interface Field { label: string; value: string; sub?: string }

export function DetailView() {
  const selId = useAppStore((s) => s.selId);
  const patch = useAppStore((s) => s.patch);
  const openEditForm = useAppStore((s) => s.openEditForm);
  const removeLocalAsset = useAppStore((s) => s.removeLocalAsset);
  const assets = useAppStore((s) => s.assets);
  const [deleting, setDeleting] = useState(false);
  const a = assets.find((x) => x.id === selId);

  const back = () => patch({ view: 'assets', selId: null });
  if (!a) {
    return (
      <section>
        <BackBtn onClick={back} />
        <p style={{ color: 'var(--muted,#9A917F)' }}>ไม่พบรายการ</p>
      </section>
    );
  }

  const startMove = () => patch({ view: 'move', matSel: [a.id], moveTarget: a.id });

  const onDelete = async () => {
    if (!window.confirm(`ลบ "${a.name}" ออกจากระบบ?`)) return;
    setDeleting(true);
    try {
      if (api.isConfigured()) await api.deleteAsset(a.id);
      removeLocalAsset(a.id);
      patch({ view: 'assets', selId: null });
    } catch (err) {
      setDeleting(false);
      window.alert('ลบไม่สำเร็จ: ' + String(err));
    }
  };

  const days = a.due ? daysLeft(a.due) : null;

  const fields: Field[] = [
    { label: 'สถาบัน / เลขที่บัญชี', value: a.acctNo },
    { label: 'ประเภทสินทรัพย์', value: a.typeLabel + (a.typeEn ? '  ·  ' + a.typeEn : '') },
  ];
  if (a.type === 'fund') {
    const cost = (a.units ?? 0) * (a.navBuy ?? 0);
    const gain = a.amount - cost;
    const gainPct = cost ? (gain / cost) * 100 : 0;
    fields.push({ label: 'จำนวนหน่วยที่ถือ', value: (a.units ?? 0).toLocaleString('en-US') + ' หน่วย' });
    fields.push({ label: 'NAV ขณะซื้อ', value: '฿' + (a.navBuy ?? 0).toFixed(4) });
    fields.push({ label: 'มูลค่าต้นทุน', value: fmt(cost) });
    fields.push({ label: 'NAV วันนี้', value: '฿' + (a.navNow ?? 0).toFixed(4) });
    fields.push({ label: 'กำไร/ขาดทุนที่ยังไม่รับรู้', value: (gain >= 0 ? '+' : '') + fmt(gain), sub: (gain >= 0 ? '▲ +' : '▼ ') + gainPct.toFixed(2) + '%' });
    if ((a.rate ?? 0) > 0) fields.push({ label: 'เงินปันผล/ปี', value: (a.rate ?? 0).toFixed(2) + '%' });
  } else if (a.type === 'stock' || a.type === 'land' || a.type === 'other') {
    // shown in dedicated panel below
  } else {
    if (a.type !== 'gold') fields.push({ label: 'อัตราดอกเบี้ย/ปี', value: (a.rate ?? 0).toFixed(2) + '%' });
    if (a.due) {
      fields.push({ label: 'วันครบกำหนด', value: dueLabelTH(a.due), sub: days! < 0 ? 'ครบกำหนดแล้ว' : 'อีก ' + days + ' วัน' });
    } else if (a.type !== 'gold') {
      fields.push({ label: 'วันครบกำหนด', value: 'ไม่มีกำหนด' });
    }
    if (a.type !== 'gold' && (a.rate ?? 0) > 0) {
      const gross = a.amount * (a.rate ?? 0) / 100;
      fields.push({ label: 'ดอกเบี้ยก่อนหักภาษี', value: fmt(gross) });
      fields.push({ label: `ภาษี ณ ที่จ่าย (${WHT_RATE * 100}%)`, value: '-' + fmt(gross * WHT_RATE) });
    }
  }

  const actions: { label: string; primary: boolean; onClick: () => void }[] = [];
  if (a.type === 'fd' || a.type === 'bond') actions.push({ label: 'บันทึกครบกำหนด / ย้ายเงิน', primary: true, onClick: startMove });
  else if (a.type === 'fund') actions.push({ label: 'ขาย / ไถ่ถอน → ย้ายเงิน', primary: true, onClick: startMove });
  else if (a.type === 'gold') actions.push({ label: 'ขายทองคำ → ย้ายเงิน', primary: true, onClick: startMove });
  else if (a.type === 'stock') actions.push({ label: 'ขายหุ้น → ย้ายเงิน', primary: true, onClick: startMove });
  else if (a.type === 'land') actions.push({ label: 'ขาย / โอนกรรมสิทธิ์ → ย้ายเงิน', primary: true, onClick: startMove });
  else actions.push({ label: 'ย้ายเงินไปรายการใหม่', primary: true, onClick: startMove });
  actions.push({ label: 'แก้ไขรายการ', primary: false, onClick: () => openEditForm(a.id) });

  return (
    <section>
      <BackBtn onClick={back} />

      <div style={{ background: 'var(--surface,#FBF8F1)', border: '1px solid var(--border,#E8E0CF)', borderRadius: 18, overflow: 'hidden' }}>
        <div style={{ background: `linear-gradient(135deg,${a.color},${a.color}CC)`, padding: '26px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ background: 'rgba(255,255,255,0.22)', color: 'var(--on-accent,#FBF8F1)', fontSize: 12, fontWeight: 600, padding: '4px 11px', borderRadius: 20 }}>{a.typeLabel}</span>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{a.acctNo}</span>
          </div>
          <div style={{ fontSize: 21, fontWeight: 700, color: 'var(--on-accent,#FBF8F1)', display: 'flex', alignItems: 'center', gap: 8 }}><BankBadge text={a.name} size={22} />{a.name}</div>
          <div className="fa-detail-amt" style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 34, color: 'var(--on-accent,#FBF8F1)', marginTop: 8 }}>{fmt(a.amount)}</div>
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 4 }}>เจ้าของบัญชี: {a.owners.join(' · ')}</div>
        </div>

        <div style={{ padding: 22 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 22 }}>
            {actions.map((ac) => (
              <button
                key={ac.label}
                onClick={ac.onClick}
                style={ac.primary
                  ? { background: 'var(--accent,#5E7350)', color: 'var(--on-accent,#FBF8F1)', border: 'none', borderRadius: 11, padding: '11px 20px', fontFamily: "'IBM Plex Sans Thai',sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer' }
                  : { background: 'var(--surface2,#fff)', color: 'var(--muted2,#6B6356)', border: '1px solid var(--border2,#E2D9C8)', borderRadius: 11, padding: '11px 18px', fontFamily: "'IBM Plex Sans Thai',sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                {ac.label}
              </button>
            ))}
            <button
              onClick={onDelete}
              disabled={deleting}
              style={{ background: 'var(--surface2,#fff)', color: '#C0392B', border: '1px solid #E4C3BE', borderRadius: 11, padding: '11px 18px', fontFamily: "'IBM Plex Sans Thai',sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              {deleting ? 'กำลังลบ…' : 'ลบรายการ'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '18px 26px' }}>
            {fields.map((f, i) => (
              <div key={i}>
                <div style={{ fontSize: 12, color: 'var(--muted,#9A917F)', marginBottom: 3 }}>{f.label}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink,#3C3A30)' }}>{f.value}</div>
                {f.sub && <div style={{ fontSize: 12, color: 'var(--muted,#9A917F)' }}>{f.sub}</div>}
              </div>
            ))}
          </div>

          {a.iAcct && (
            <div style={{ marginTop: 22, background: 'var(--inset,#F1EDE2)', borderRadius: 13, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, background: '#5B8A7A', color: 'var(--on-accent,#FBF8F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>↳</span>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 12, color: 'var(--muted,#9A917F)' }}>{(a.type === 'fund' || a.type === 'stock') ? 'บัญชีรับเงินปันผล' : 'บัญชีรับดอกเบี้ย'}</div>
                <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><BankBadge text={a.iAcct.bank} />{a.iAcct.bank + ' ' + a.iAcct.no + ' · ' + a.iAcct.owners.join(' · ')}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: 'var(--muted,#9A917F)' }}>{(a.type === 'fund' || a.type === 'stock') ? 'เงินปันผล/ปีสุทธิ (หักภาษี)' : 'ดอกเบี้ย/ปีสุทธิ (หักภาษี)'}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-ink,#5E7350)' }}>{fmt(netInterest(a))}</div>
              </div>
            </div>
          )}

          {a.type === 'fund' && <FundPanel a={a} onMove={startMove} />}
          {a.type === 'gold' && <GoldPanel a={a} />}
          {a.type === 'stock' && <StockPanel a={a} />}
          {a.type === 'land' && <LandPanel a={a} />}
          {a.type === 'other' && <OtherPanel a={a} />}
          {!!(a.expenses && a.expenses.length) && <ExpenseLedger a={a} />}

          {/* timeline */}
          <div style={{ marginTop: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>ประวัติรายการนี้</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <TimelineRow title={`รายการปัจจุบัน — ${fmt(a.amount)}`} date={a.due ? 'ครบกำหนด ' + dueLabelTH(a.due) : 'ถือครองอยู่'} dot={{ background: a.color, border: `3px solid ${a.color}40` }} />
              <TimelineRow title="เปิดบัญชี / ลงทุน" date="โอนมาจากรายการก่อนหน้า" dot={{ background: '#C7BCA3', border: '3px solid var(--border2,#E2D9C8)' }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', color: 'var(--accent-ink,#5E7350)', fontFamily: "'IBM Plex Sans Thai'", fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 14 }}>
      ‹ กลับ
    </button>
  );
}

function TimelineRow({ title, date, dot }: { title: string; date: string; dot: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', gap: 14 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{ width: 13, height: 13, borderRadius: '50%', ...dot }} />
        <span style={{ width: 2, flex: 1, background: '#E2D9C8', minHeight: 14 }} />
      </div>
      <div style={{ paddingBottom: 16 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--muted,#9A917F)' }}>{date}</div>
      </div>
    </div>
  );
}

const panelLabel = (color: string): React.CSSProperties => ({ fontWeight: 700, fontSize: 15, marginBottom: 13, color });
const cellLabel: React.CSSProperties = { fontSize: 12, color: 'var(--muted,#9A917F)' };
const cellValue: React.CSSProperties = { fontSize: 16, fontWeight: 700 };

function FundPanel({ a, onMove }: { a: Asset; onMove: () => void }) {
  return (
    <div style={{ marginTop: 22, background: '#F6EFE6', border: '1px solid #E6D8C2', borderRadius: 13, padding: 18 }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: '#9A5A33' }}>การขาย / ไถ่ถอนหน่วยลงทุน</div>
      <div style={{ fontSize: 13, color: 'var(--muted2,#6B6356)', lineHeight: 1.6, marginBottom: 13 }}>
        บันทึกเป็น <strong>จำนวนหน่วยที่ขาย × NAV ขณะขาย = เงินที่ได้รับ</strong> — ระบบจะคำนวณกำไร/ขาดทุนที่รับรู้ (เทียบ NAV ตอนซื้อ) ให้อัตโนมัติ
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, color: 'var(--muted2,#6B6356)' }}>
          ถือทั้งหมด <strong>{(a.units ?? 0).toLocaleString('en-US')} หน่วย</strong> · NAV วันนี้ <strong>฿{(a.navNow ?? 0).toFixed(4)}</strong> ≈ <strong>{fmt(a.amount)}</strong>
        </div>
        <button onClick={onMove} style={{ marginLeft: 'auto', background: '#B26B4E', color: 'var(--on-accent,#FBF8F1)', border: 'none', borderRadius: 10, padding: '10px 18px', fontFamily: "'IBM Plex Sans Thai'", fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>บันทึกการขาย / ไถ่ถอน</button>
      </div>
    </div>
  );
}

function GoldPanel({ a }: { a: Asset }) {
  return (
    <div style={{ marginTop: 22, background: 'var(--p-gold-bg,#FBF4DF)', border: '1px solid var(--p-gold-bd,#ECDBA8)', borderRadius: 13, padding: 18 }}>
      <div style={panelLabel('var(--p-gold-ink,#8A6A12)')}>อ้างอิงราคาทองคำวันนี้ (สมาคมค้าทองคำ)</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 14 }}>
        <div><div style={cellLabel}>ทองคำแท่ง รับซื้อ</div><div style={{ ...cellValue, color: 'var(--p-gold-ink,#8A6A12)' }}>{fmt(GOLD_PRICE_PER_BAHT)} /บาททอง</div></div>
        <div><div style={cellLabel}>น้ำหนักถือครอง</div><div style={cellValue}>{a.goldBaht} บาททอง</div></div>
        <div><div style={cellLabel}>มูลค่าตามราคาตลาด</div><div style={{ ...cellValue, color: 'var(--ink,#3C4A33)' }}>{fmt(a.amount)}</div></div>
      </div>
    </div>
  );
}

function StockPanel({ a }: { a: Asset }) {
  const cost = (a.shares ?? 0) * (a.priceBuy ?? 0);
  const gain = a.amount - cost;
  const pct = cost ? (gain / cost) * 100 : 0;
  const up = gain >= 0;
  return (
    <div style={{ marginTop: 22, background: 'var(--p-blue-bg,#EEF3FA)', border: '1px solid var(--p-blue-bd,#CFE0F0)', borderRadius: 13, padding: 18 }}>
      <div style={panelLabel('var(--p-blue-ink,#2456A8)')}>ฐานะการลงทุนหุ้นสามัญ</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 14, marginBottom: 14 }}>
        <div><div style={cellLabel}>จำนวนหุ้น</div><div style={cellValue}>{(a.shares ?? 0).toLocaleString('en-US')}</div></div>
        <div><div style={cellLabel}>ราคาทุน/หุ้น</div><div style={cellValue}>฿{(a.priceBuy ?? 0).toFixed(2)}</div></div>
        <div><div style={cellLabel}>ราคาตลาด/หุ้น</div><div style={{ ...cellValue, color: 'var(--p-blue-ink,#2456A8)' }}>฿{(a.priceNow ?? 0).toFixed(2)}</div></div>
        <div><div style={cellLabel}>เงินปันผล (Yield)</div><div style={cellValue}>{(a.rate ?? 0) > 0 ? (a.rate ?? 0).toFixed(2) + '%' : '—'}</div></div>
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'stretch' }}>
        <div style={{ flex: 1, minWidth: 140, background: 'var(--surface2,#fff)', border: '1px solid var(--p-blue-bd,#DCE6F0)', borderRadius: 11, padding: '12px 14px' }}>
          <div style={cellLabel}>มูลค่าต้นทุน</div><div style={{ fontSize: 18, fontWeight: 700 }}>{fmt(cost)}</div>
        </div>
        <div style={{ flex: 1, minWidth: 140, background: 'var(--surface2,#fff)', border: '1px solid var(--p-blue-bd,#DCE6F0)', borderRadius: 11, padding: '12px 14px' }}>
          <div style={cellLabel}>มูลค่าตลาด</div><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--p-blue-ink,#2456A8)' }}>{fmt(a.amount)}</div>
        </div>
        <div style={{ flex: 1, minWidth: 140, borderRadius: 11, padding: '12px 14px', background: up ? '#E6F4EA' : '#FBEAE8', border: '1px solid ' + (up ? '#BFE3CC' : '#F0CFCB') }}>
          <div style={cellLabel}>กำไร/ขาดทุนที่ยังไม่รับรู้</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: up ? '#1F8A4C' : '#C0392B' }}>
            {(up ? '+' : '') + fmt(gain)} <span style={{ fontSize: 13 }}>({(up ? '▲ +' : '▼ ') + pct.toFixed(2) + '%'})</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LandPanel({ a }: { a: Asset }) {
  const totalWa = (a.rai ?? 0) * 400 + (a.ngan ?? 0) * 100 + (a.wa ?? 0);
  return (
    <div style={{ marginTop: 22, background: 'var(--p-brown-bg,#F4F0E8)', border: '1px solid var(--p-brown-bd,#E0D5C0)', borderRadius: 13, padding: 18 }}>
      <div style={panelLabel('var(--p-brown-ink,#7A5A26)')}>รายละเอียดอสังหาริมทรัพย์</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 14 }}>
        <div><div style={cellLabel}>เลขที่โฉนด</div><div style={{ ...cellValue, fontSize: 15 }}>{a.deedNo}</div></div>
        <div><div style={cellLabel}>เนื้อที่</div><div style={{ ...cellValue, fontSize: 15 }}>{`${a.rai} ไร่ ${a.ngan} งาน ${a.wa} ตร.วา`}</div><div style={{ fontSize: 11.5, color: 'var(--muted,#9A917F)' }}>≈ {totalWa.toLocaleString('en-US')} ตร.วา</div></div>
        <div><div style={cellLabel}>ราคาประเมินล่าสุด</div><div style={{ ...cellValue, fontSize: 15, color: 'var(--p-brown-ink,#7A5A26)' }}>{fmt(a.appraisal ?? 0)}</div><div style={{ fontSize: 11.5, color: 'var(--muted,#9A917F)' }}>{fmt((a.appraisal ?? 0) / Math.max(1, totalWa))} /ตร.วา</div></div>
      </div>
    </div>
  );
}

function OtherPanel({ a }: { a: Asset }) {
  return (
    <div style={{ marginTop: 22, background: 'var(--p-purple-bg,#F3EEF7)', border: '1px solid var(--p-purple-bd,#DDCFE8)', borderRadius: 13, padding: 18 }}>
      <div style={panelLabel('var(--p-purple-ink,#6A4A8A)')}>สินทรัพย์อื่นๆ</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 14 }}>
        <div><div style={cellLabel}>หมวดหมู่</div><div style={{ ...cellValue, fontSize: 15 }}>{a.otherCat}</div></div>
        <div><div style={cellLabel}>มูลค่าประเมิน</div><div style={{ ...cellValue, fontSize: 15, color: 'var(--p-purple-ink,#6A4A8A)' }}>{fmt(a.otherVal ?? 0)}</div></div>
        <div><div style={cellLabel}>ที่จัดเก็บ</div><div style={{ ...cellValue, fontSize: 15 }}>{a.acctNo}</div></div>
      </div>
    </div>
  );
}
