import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { TYPES, type AssetType } from '@/data/types';
import { assetsWithDue } from '@/lib/assets';
import { fmt, dueLabelTH } from '@/lib/format';
import { ScreenTitle } from '@/components/common/ScreenTitle';
import { BankBadge } from '@/components/common/BankBadge';
import * as api from '@/api/client';

const LINE_TYPE_KEYS: AssetType[] = ['fd', 'bond', 'fund'];

export function LineSettingsView() {
  const s = useAppStore();
  const setView = useAppStore((st) => st.setView);
  const set = useAppStore((st) => st.set);
  const setLineLead = useAppStore((st) => st.setLineLead);
  const toggleLineType = useAppStore((st) => st.toggleLineType);

  const assets = useAppStore((s) => s.assets);
  const withDue = useMemo(() => assetsWithDue(assets), [assets]);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [testState, setTestState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const ejectGroup = async (id: string) => {
    const filtered = s.lineGroups.filter((g) => g.id !== id);
    set('lineGroups', filtered);
    if (api.isConfigured()) {
      try { await api.saveSettings({ lineGroups: filtered }); } catch { /* optimistic — local state already updated */ }
    }
  };

  const sendTestMessage = async () => {
    if (!api.isConfigured()) { setTestState('error'); setTimeout(() => setTestState('idle'), 2500); return; }
    setTestState('sending');
    try {
      await api.sendTest();
      setTestState('sent');
    } catch {
      setTestState('error');
    } finally {
      setTimeout(() => setTestState('idle'), 2500);
    }
  };

  const saveLineSettings = async () => {
    if (!api.isConfigured()) { setSaveState('saved'); setTimeout(() => setSaveState('idle'), 2000); return; }
    setSaveState('saving');
    try {
      await api.saveSettings({
        lineConnected: s.lineConnected,
        lineLead: s.lineLead,
        lineTypes: s.lineTypes as Record<string, boolean>,
        lineTime: s.lineTime,
        lineMaturity: s.lineMaturity,
        lineMonthly: s.lineMonthly,
        lineLargeMove: s.lineLargeMove,
      });
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('error');
    }
  };

  const leadDays: number[] = [];
  if (s.lineLead.d30) leadDays.push(30);
  if (s.lineLead.d7) leadDays.push(7);
  if (s.lineLead.d1) leadDays.push(1);

  // preview: nearest upcoming maturity of an enabled type
  const previewItem = withDue.find((x) => s.lineTypes[x.a.type]) || withDue[0];

  // scheduled queue
  const scheduled: { a: typeof assets[number]; ld: number; sendIn: number }[] = [];
  withDue.forEach(({ a, days }) => {
    if (!s.lineTypes[a.type]) return;
    leadDays.forEach((ld) => {
      const sendIn = days - ld;
      if (sendIn >= 0) scheduled.push({ a, ld, sendIn });
    });
  });
  scheduled.sort((x, y) => x.sendIn - y.sendIn);

  return (
    <section>
      <button onClick={() => setView('calendar')} style={{ background: 'none', border: 'none', color: 'var(--accent-ink,#5E7350)', fontFamily: "'IBM Plex Sans Thai'", fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 14 }}>
        ‹ กลับไปปฏิทิน
      </button>
      <ScreenTitle title="ตั้งค่าแจ้งเตือน LINE" en="LINE notification settings" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 18, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* connection */}
          <div style={card}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>กลุ่ม LINE ที่เชื่อมต่อ</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted,#9A917F)', marginBottom: 14 }}>เชิญบอทเข้ากลุ่มแล้วส่งข้อความ 1 ครั้ง ระบบจะเพิ่มกลุ่มให้อัตโนมัติ — ส่งแจ้งเตือนได้พร้อมกันหลายกลุ่ม</div>
            {s.lineGroups.length === 0 ? (
              <div style={{ background: '#F1EDE2', border: '1px solid #E2D9C8', borderRadius: 10, padding: '11px 14px', fontSize: 12.5, color: 'var(--muted2,#6B6356)' }}>ยังไม่มีกลุ่มเชื่อมต่อ</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {s.lineGroups.map((g) => (
                  <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 13, background: 'var(--inset,#F1EDE2)', borderRadius: 12, padding: '14px 16px' }}>
                    <span style={{ width: 44, height: 44, borderRadius: 12, background: '#06C755', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>L</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--accent-ink,#3C7A4A)', fontWeight: 600 }}>● เชื่อมต่อแล้ว</div>
                    </div>
                    <button onClick={() => ejectGroup(g.id)} style={{ background: 'var(--surface2,#fff)', border: '1px solid #C0472E', borderRadius: 9, padding: '8px 14px', fontFamily: "'IBM Plex Sans Thai'", fontSize: 13, fontWeight: 600, color: '#C0472E', cursor: 'pointer', flexShrink: 0 }}>เอาออก</button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={sendTestMessage} disabled={testState === 'sending' || s.lineGroups.length === 0} style={{ width: '100%', marginTop: 12, background: testState === 'sent' ? '#3C7A4A' : 'var(--surface2,#fff)', border: '1.5px solid ' + (testState === 'sent' ? '#3C7A4A' : testState === 'error' ? '#C0472E' : 'var(--accent,#5E7350)'), borderRadius: 10, padding: '11px', fontFamily: "'IBM Plex Sans Thai'", fontSize: 14, fontWeight: 600, color: testState === 'sent' ? '#fff' : testState === 'error' ? '#C0472E' : 'var(--accent,#5E7350)', cursor: s.lineGroups.length === 0 ? 'not-allowed' : 'pointer', opacity: s.lineGroups.length === 0 ? 0.5 : 1 }}>
              {testState === 'sending' ? 'กำลังส่ง…' : testState === 'sent' ? '✓ ส่งข้อความทดสอบแล้ว — เช็คกลุ่ม LINE' : testState === 'error' ? 'ส่งไม่สำเร็จ — ลองใหม่' : '🔔 ส่งข้อความทดสอบเข้ากลุ่ม LINE'}
            </button>
          </div>

          {/* lead time */}
          <div style={card}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>เตือนล่วงหน้าก่อนครบกำหนด</div>
            <div style={{ fontSize: 13, color: 'var(--muted,#9A917F)', margin: '3px 0 14px' }}>เลือกได้หลายช่วง — ระบบจะส่งทุกช่วงที่เลือก</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {([['d30', '30 วัน'], ['d7', '7 วัน'], ['d1', '1 วัน']] as const).map(([k, label]) => {
                const on = s.lineLead[k];
                return (
                  <div key={k} onClick={() => setLineLead(k)} style={{ padding: '9px 16px', borderRadius: 11, border: '1.5px solid ' + (on ? '#5E7350' : '#E2D9C8'), background: on ? '#EEF2E8' : 'var(--surface,#FBF8F1)', color: on ? '#3C4A33' : '#9A917F', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{on ? '✓' : ''}</span>{label}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border,#EFE8D9)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>เวลาส่งข้อความ</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted,#9A917F)' }}>ส่งช่วงเช้าของวันที่กำหนด</div>
              </div>
              <input type="time" value={s.lineTime} onChange={(e) => set('lineTime', e.target.value)} style={{ border: '1px solid var(--border2,#E2D9C8)', borderRadius: 9, padding: '8px 11px', fontFamily: "'IBM Plex Sans Thai',sans-serif", fontSize: 14, color: 'var(--text,#2C2A23)', background: 'var(--surface2,#fff)' }} />
            </div>
          </div>

          {/* by type */}
          <div style={card}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>เตือนเฉพาะประเภทที่มีวันครบกำหนด</div>
            <div style={{ fontSize: 13, color: 'var(--muted,#9A917F)', marginBottom: 6 }}>เลือกประเภทสินทรัพย์ที่ต้องการให้แจ้งเตือน</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {LINE_TYPE_KEYS.map((k) => {
                const on = !!s.lineTypes[k];
                const count = assets.filter((a) => a.type === k && a.due).length;
                return (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 2px', borderTop: '1px solid var(--border,#EFE8D9)' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: TYPES[k].color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{TYPES[k].label}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted,#9A917F)' }}>{count} บัญชีมีวันครบกำหนด</div>
                    </div>
                    <Toggle on={on} onClick={() => toggleLineType(k)} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* event types */}
          <div style={card}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>เหตุการณ์ที่แจ้งเตือน</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {([
                ['lineMaturity', 'แจ้งเมื่อใกล้ครบกำหนด', 'ฝากประจำ / หุ้นกู้ / กองทุน ตามช่วงวันที่ตั้ง'],
                ['lineMonthly', 'สรุปพอร์ตรายเดือน', 'ส่งมูลค่ารวมและกำไร/ขาดทุน ทุกวันที่ 1'],
                ['lineLargeMove', 'การโยกย้ายเงินก้อนใหญ่', 'แจ้งเมื่อมีการขาย/ย้ายเกิน 1 ล้านบาท'],
              ] as const).map(([k, label, sub]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 2px', borderTop: '1px solid var(--border,#EFE8D9)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted,#9A917F)' }}>{sub}</div>
                  </div>
                  <Toggle on={s[k]} onClick={() => set(k, !s[k])} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ background: '#7A8C68', borderRadius: 16, padding: 20 }}>
            <div style={{ color: '#EAF0E2', fontWeight: 700, fontSize: 14, marginBottom: 14 }}>ตัวอย่างข้อความที่จะส่ง</div>
            {previewItem && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, background: '#06C755', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>L</span>
                <div style={{ background: 'var(--surface2,#fff)', borderRadius: '4px 16px 16px 16px', padding: '13px 15px', maxWidth: 280, boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text,#2C2A23)', marginBottom: 7 }}>🔔 แจ้งเตือนครบกำหนด</div>
                  <div style={{ fontSize: 13, color: 'var(--ink,#3C3A30)', lineHeight: 1.7 }}>
                    <div>{previewItem.a.typeLabel} · {previewItem.a.name}</div>
                    <div style={{ color: 'var(--muted2,#6B6356)' }}>เจ้าของบัญชี: {previewItem.a.owners.join(' · ')}</div>
                    <div style={{ color: '#B26B4E', fontWeight: 600 }}>ครบกำหนด {dueLabelTH(previewItem.a.due!)} (อีก {previewItem.days} วัน)</div>
                    <div style={{ fontWeight: 700, color: 'var(--ink,#3C4A33)' }}>จำนวนเงิน {fmt(previewItem.a.amount)}</div>
                    <div style={{ color: 'var(--muted2,#6B6356)' }}>{previewItem.a.iAcct ? 'ดอกเบี้ยเข้า ' + previewItem.a.iAcct.bank + ' ' + previewItem.a.iAcct.no : ''}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={card}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>คิวแจ้งเตือนถัดไป</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted,#9A917F)', marginBottom: 8 }}>ตามการตั้งค่าด้านซ้าย</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {scheduled.slice(0, 6).map((sc, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 2px', borderTop: '1px solid var(--border,#EFE8D9)' }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: sc.a.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                      <BankBadge text={sc.a.name} size={15} />
                      <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{sc.a.name}</div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted,#9A917F)' }}>เตือนล่วงหน้า {sc.ld} วัน</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: sc.sendIn === 0 ? '#C0472E' : sc.sendIn <= 7 ? '#B26B4E' : '#5E7350' }}>
                    {sc.sendIn === 0 ? 'ส่งวันนี้' : 'อีก ' + sc.sendIn + ' วัน'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button onClick={saveLineSettings} disabled={saveState === 'saving'} style={{ width: '100%', background: saveState === 'saved' ? '#3C7A4A' : 'var(--accent,#5E7350)', color: 'var(--on-accent,#FBF8F1)', border: 'none', borderRadius: 12, padding: 14, fontFamily: "'IBM Plex Sans Thai'", fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            {saveState === 'saving' ? 'กำลังบันทึก…' : saveState === 'saved' ? '✓ บันทึกแล้ว' : saveState === 'error' ? 'บันทึกไม่สำเร็จ — ลองใหม่' : 'บันทึกการตั้งค่า'}
          </button>
        </div>
      </div>
    </section>
  );
}

const card: React.CSSProperties = { background: 'var(--surface,#FBF8F1)', border: '1px solid var(--border,#E8E0CF)', borderRadius: 16, padding: 20 };

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ width: 42, height: 24, borderRadius: 13, background: on ? '#5E7350' : '#D8CFBE', position: 'relative', transition: 'background 0.15s', flexShrink: 0, cursor: 'pointer' }}>
      <div style={{ position: 'absolute', top: 2, left: on ? 20 : 2, width: 20, height: 20, borderRadius: '50%', background: 'var(--surface2,#fff)', transition: 'left 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
    </div>
  );
}
