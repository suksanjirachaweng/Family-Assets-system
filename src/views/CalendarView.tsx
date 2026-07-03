import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { Asset } from '@/data/types';
import { assetsWithDue } from '@/lib/assets';
import { fmt, thMon, thMonFull } from '@/lib/format';
import { ScreenTitle } from '@/components/common/ScreenTitle';
import { BankBadge } from '@/components/common/BankBadge';

interface CalCell { day: string; hasEvent: boolean; ev?: Asset; isToday: boolean }

export function CalendarView() {
  const calIdx = useAppStore((s) => s.calIdx);
  const set = useAppStore((s) => s.set);
  const setView = useAppStore((s) => s.setView);
  const openAsset = useAppStore((s) => s.openAsset);

  const assets = useAppStore((s) => s.assets);
  const withDue = useMemo(() => assetsWithDue(assets), [assets]);

  const months = useMemo(() => {
    const monthSet: Record<number, 1> = {};
    assets.filter((a) => a.due).forEach((a) => {
      const d = new Date(a.due!);
      monthSet[d.getFullYear() * 12 + d.getMonth()] = 1;
    });
    let m = Object.keys(monthSet).map(Number).sort((x, y) => x - y).map((v) => ({ y: Math.floor(v / 12), mi: v % 12 }));
    if (!m.length) m = [{ y: 2026, mi: 5 }];
    return m;
  }, [assets]);

  const idx = Math.min(calIdx, months.length - 1);
  const cm = months[idx];
  const first = new Date(cm.y, cm.mi, 1).getDay();
  const dim = new Date(cm.y, cm.mi + 1, 0).getDate();

  const evMap: Record<number, Asset> = {};
  assets.filter((a) => a.due).forEach((a) => {
    const d = new Date(a.due!);
    if (d.getFullYear() === cm.y && d.getMonth() === cm.mi) evMap[d.getDate()] = a;
  });

  const cells: CalCell[] = [];
  for (let i = 0; i < first; i++) cells.push({ day: '', hasEvent: false, isToday: false });
  for (let day = 1; day <= dim; day++) {
    const ev = evMap[day];
    const isToday = cm.y === 2026 && cm.mi === 5 && day === 26;
    cells.push({ day: String(day), hasEvent: !!ev, ev, isToday });
  }
  const monthLabel = thMonFull()[cm.mi] + ' ' + (cm.y + 543);

  return (
    <section>
      <ScreenTitle title="ปฏิทินครบกำหนด" en="Due-date calendar" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 18, alignItems: 'start' }}>
        <div style={{ background: 'var(--surface,#FBF8F1)', border: '1px solid var(--border,#E8E0CF)', borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <button onClick={() => set('calIdx', Math.max(0, idx - 1))} style={navBtn}>‹</button>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{monthLabel}</div>
            <button onClick={() => set('calIdx', Math.min(months.length - 1, idx + 1))} style={navBtn}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, textAlign: 'center', fontSize: 12, color: 'var(--muted,#9A917F)', marginBottom: 6 }}>
            {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
            {cells.map((d, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: '1', borderRadius: 9, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                  background: d.ev ? d.ev.color + '1E' : d.isToday ? '#5E735015' : 'transparent',
                  border: d.isToday ? '1.5px solid var(--accent,#5E7350)' : '1px solid transparent',
                  fontWeight: d.ev ? 600 : 400, color: 'var(--ink,#3C3A30)',
                }}
              >
                <span>{d.day}</span>
                {d.hasEvent && d.ev && <span style={{ width: 6, height: 6, borderRadius: '50%', background: d.ev.color, marginTop: 3 }} />}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div onClick={() => setView('line')} style={{ background: 'var(--brand-deep,#3C4A33)', color: 'var(--on-accent,#EFEAD9)', borderRadius: 16, padding: '18px 20px', marginBottom: 16, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ width: 26, height: 26, borderRadius: 8, background: '#7BB661', color: '#22331B', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>L</span>
                <span style={{ fontWeight: 700, fontSize: 15 }}>แจ้งเตือนผ่าน LINE Group</span>
              </div>
              <span style={{ background: '#7BB661', color: '#22331B', fontSize: 11, fontWeight: 700, padding: '3px 11px', borderRadius: 20 }}>ตั้งค่า →</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--on-accent,#C4BFA9)', lineHeight: 1.55 }}>
              ส่งข้อความเตือนล่วงหน้า 30 / 7 / 1 วัน ก่อนวันครบกำหนด ไปยัง <span style={{ color: '#9FC585' }}>กลุ่ม “การเงินครอบครัว”</span> — แตะเพื่อตั้งค่า
            </div>
          </div>

          <div style={{ background: 'var(--surface,#FBF8F1)', border: '1px solid var(--border,#E8E0CF)', borderRadius: 16, padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>รายการครบกำหนดถัดไป</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {withDue.map(({ a, days }) => {
                const d = new Date(a.due!);
                const soon = days <= 30;
                return (
                  <div key={a.id} onClick={() => openAsset(a.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 4px', borderBottom: '1px solid var(--border,#EFE8D9)', cursor: 'pointer' }}>
                    <div style={{ width: 46, height: 46, borderRadius: 11, background: soon ? '#F6E2DA' : '#EDEBDD', color: soon ? '#C0472E' : '#5E7350', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>{d.getDate()}</div>
                      <div style={{ fontSize: 10 }}>{thMon()[d.getMonth()]}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <BankBadge text={a.name} size={16} />
                        <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{a.name}</div>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted,#9A917F)' }}>{a.typeLabel} · {fmt(a.amount)}</div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: days <= 30 ? '#C0472E' : days <= 90 ? '#B26B4E' : '#5E7350' }}>
                      {days < 0 ? 'ครบแล้ว' : 'อีก ' + days + ' วัน'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const navBtn: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border2,#E2D9C8)',
  background: 'var(--surface,#FBF8F1)', cursor: 'pointer', fontSize: 16, color: 'var(--muted2,#6B6356)',
};
