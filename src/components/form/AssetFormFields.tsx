import { useState } from 'react';
import { TYPES, type Asset, type AssetType } from '@/data/types';
import { fmt } from '@/lib/format';
import { dvField, iAcctOptionValue } from '@/lib/assetForm';

const FTYPE_ORDER: AssetType[] = ['fd', 'sav', 'fund', 'bond', 'stock', 'gold', 'land', 'other'];
const PEOPLE = ['ชัย', 'วิวัฒน์', 'ธีรดา', 'กวิน', 'สุภาดา', 'วิภาดา', 'สุขสันต์', 'สุวิชช์'];
const FAMILY = 'ครอบครัว';

export const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 13px', border: '1px solid var(--border2,#E2D9C8)', borderRadius: 10,
  background: 'var(--surface2,#fff)', fontFamily: "'IBM Plex Sans Thai',sans-serif", fontSize: 14,
  color: 'var(--text,#2C2A23)', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12.5, color: 'var(--muted,#9A917F)', marginBottom: 6 };
const note = (bg: string, bd: string, color: string): React.CSSProperties => ({ background: bg, border: `1px solid ${bd}`, borderRadius: 10, padding: '11px 14px', fontSize: 12.5, color });

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}
function Input({ name, placeholder, type, defaultValue, onChange }: { name: string; placeholder?: string; type?: string; defaultValue?: string | number; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return <input name={name} placeholder={placeholder} type={type} defaultValue={defaultValue} onChange={onChange} style={type === 'date' ? { ...inputStyle, padding: '10px 13px' } : inputStyle} />;
}

export interface AssetFormFieldsProps {
  formType: AssetType;
  onTypeChange: (t: AssetType) => void;
  owners: string[];
  onToggleOwner: (name: string) => void;
  /** Existing asset to prefill from (omit when creating a brand-new one). */
  defaults?: Asset;
}

/**
 * The type chips + name/account + owners + per-type fields shared by the
 * "add/edit asset" modal and the "add new destination" flow in the move view.
 * Purely prop-driven — the parent owns all state and reads values back via FormData on submit.
 */
export function AssetFormFields({ formType, onTypeChange, owners, onToggleOwner, defaults: d }: AssetFormFieldsProps) {
  const isDeposit = formType === 'fd' || formType === 'sav' || formType === 'bond';

  /** Tracked locally (the rest of the form is uncontrolled/read via FormData on submit) purely
   *  so the "มูลค่า" preview box below can update live as the user types. */
  const [goldBahtLive, setGoldBahtLive] = useState(d?.goldBaht ?? 0);
  const [goldBuyPriceLive, setGoldBuyPriceLive] = useState(d?.goldBuyPrice ?? 0);
  const parseNum = (v: string) => Number(v.replace(/[^0-9.]/g, '')) || 0;

  /** Clicking "ครอบครัว" replaces the whole selection with just that — it's a joint-ownership
   *  label, not shorthand for "everyone individually" — so it can't coexist with named owners. */
  const clickFamily = () => {
    if (owners.length === 1 && owners[0] === FAMILY) { onToggleOwner(FAMILY); return; }
    owners.forEach((o) => { if (o !== FAMILY) onToggleOwner(o); });
    if (!owners.includes(FAMILY)) onToggleOwner(FAMILY);
  };
  const clickPerson = (p: string) => {
    if (owners.includes(FAMILY)) onToggleOwner(FAMILY);
    onToggleOwner(p);
  };

  return (
    <>
      {/* type */}
      <Field label="ประเภทสินทรัพย์">
        <select
          value={formType}
          onChange={(e) => onTypeChange(e.target.value as AssetType)}
          style={{ ...inputStyle, borderColor: TYPES[formType].color, color: TYPES[formType].color, fontWeight: 600 }}
        >
          {FTYPE_ORDER.map((k) => (
            <option key={k} value={k}>{TYPES[k].label}</option>
          ))}
        </select>
      </Field>

      {/* name + acct — gold skips these (name auto-generated, location captured below instead) */}
      {formType === 'gold' ? (
        <input type="hidden" name="name" defaultValue={d?.type === 'gold' ? d?.name : undefined} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14 }}>
          <Field label="ชื่อรายการ / สถาบัน"><Input name="name" placeholder="เช่น ฝากประจำ 12 เดือน · ธ.ออมสิน" defaultValue={d?.name} /></Field>
          <Field label="เลขที่บัญชี / รหัสรายการ"><Input name="acctNo" placeholder="เช่น 534-21213-2311" defaultValue={d?.acctNo} /></Field>
        </div>
      )}

      {/* owners */}
      <div>
        <label style={{ ...labelStyle, marginBottom: 7 }}>เจ้าของบัญชี <span style={{ color: '#B8AF9B', fontWeight: 400 }}>· เลือกได้มากกว่า 1 คน หรือเลือก "ครอบครัว" สำหรับเจ้าของร่วมทุกคน</span></label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(64px,1fr))', gap: 5 }}>
          {PEOPLE.map((p) => {
            const active = owners.includes(p);
            return (
              <button
                type="button"
                key={p}
                onClick={() => clickPerson(p)}
                style={{ padding: '7px 3px', borderRadius: 9, border: '1.5px solid ' + (active ? 'var(--accent,#5E7350)' : '#E2D9C8'), background: active ? 'var(--accent,#5E7350)' : '#fff', color: active ? 'var(--on-accent,#FBF8F1)' : '#6B6356', cursor: 'pointer', fontFamily: "'IBM Plex Sans Thai',sans-serif", fontSize: 11.5, fontWeight: active ? 600 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {(active ? '✓ ' : '') + p}
              </button>
            );
          })}
          <button
            type="button"
            onClick={clickFamily}
            style={{ padding: '7px 3px', borderRadius: 9, border: '1.5px solid ' + (owners.includes(FAMILY) ? '#8A6A12' : '#E2D9C8'), background: owners.includes(FAMILY) ? '#8A6A12' : '#fff', color: owners.includes(FAMILY) ? '#FBF8F1' : '#6B6356', cursor: 'pointer', fontFamily: "'IBM Plex Sans Thai',sans-serif", fontSize: 11.5, fontWeight: owners.includes(FAMILY) ? 600 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {(owners.includes(FAMILY) ? '✓ ' : '') + FAMILY}
          </button>
        </div>
      </div>

      {/* deposit / bond / savings */}
      {isDeposit && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14 }}>
            <Field label="จำนวนเงิน (บาท)"><Input name="amount" placeholder="1,000,000" defaultValue={dvField(d?.amount)} /></Field>
            <Field label="อัตราดอกเบี้ย / ปันผล (% ต่อปี)"><Input name="rate" placeholder="1.80" defaultValue={dvField(d?.rate)} /></Field>
          </div>
          {formType === 'sav' ? (
            <div style={note('#F1EDE2', '#E2D9C8', 'var(--muted2,#6B6356)')}>บัญชีออมทรัพย์ไม่มีวันครบกำหนด และถือเป็นบัญชีรับดอกเบี้ยของตัวเองโดยอัตโนมัติ — ไม่ต้องกรอกเพิ่ม</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14 }}>
              <Field label="วันครบกำหนด"><Input name="due" type="date" defaultValue={d?.due ?? undefined} /></Field>
              <Field label="บัญชีรับดอกเบี้ย">
                <select name="iAcct" defaultValue={iAcctOptionValue(d?.iAcct)} style={inputStyle}>
                  <option>ธ.กรุงเทพ 122-4423-121334 · วิวัฒน์</option>
                  <option>ธ.ออมสิน 534-21213-2311 · ชัย·ธีรดา</option>
                  <option>ธ.กสิกร 777-26443-28881 · ธีรดา</option>
                </select>
              </Field>
            </div>
          )}
        </div>
      )}

      {/* fund */}
      {formType === 'fund' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14 }}>
            <Field label="จำนวนหน่วยลงทุน"><Input name="units" placeholder="250,000" defaultValue={dvField(d?.units)} /></Field>
            <Field label="NAV / ราคาต่อหน่วย ขณะซื้อ (บาท)"><Input name="navBuy" placeholder="14.5000" defaultValue={dvField(d?.navBuy)} /></Field>
          </div>
          <div style={note('#F6EFE6', '#E6D8C2', '#8A6A4A')}>มูลค่าเงินลงทุน = จำนวนหน่วย × NAV ขณะซื้อ · มูลค่าตลาดคำนวณจาก NAV วันนี้อัตโนมัติ</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14 }}>
            <Field label="NAV วันนี้ (บาท)"><Input name="navNow" placeholder="16.8000" defaultValue={dvField(d?.navNow)} /></Field>
            <Field label="บัญชีรับเงินปันผล (ถ้ามี)">
              <select name="iAcct" defaultValue={iAcctOptionValue(d?.iAcct)} style={inputStyle}>
                <option>— ไม่มี (กองทุนสะสมมูลค่า) —</option>
                <option>ธ.ออมสิน 534-21213-2311 · ชัย·ธีรดา</option>
                <option>ธ.กรุงเทพ 122-4423-121334 · วิวัฒน์</option>
              </select>
            </Field>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted,#9A917F)' }}>เมื่อขาย/ไถ่ถอน: บันทึกจำนวนหน่วยที่ขาย และ NAV ขณะขาย — ทำได้จากหน้ารายละเอียดกองทุน</div>
        </div>
      )}

      {/* gold */}
      {formType === 'gold' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14 }}>
            <Field label="น้ำหนัก (บาททอง)">
              <Input name="goldBaht" placeholder="30" defaultValue={dvField(d?.goldBaht)} onChange={(e) => setGoldBahtLive(parseNum(e.target.value))} />
            </Field>
            <Field label="ราคาทองตอนที่ซื้อ (บาท/บาททอง)">
              <Input name="goldBuyPrice" placeholder="42,000" defaultValue={dvField(d?.goldBuyPrice)} onChange={(e) => setGoldBuyPriceLive(parseNum(e.target.value))} />
            </Field>
          </div>
          <Field label="สถานที่เก็บ"><Input name="goldLocation" placeholder="เช่น ตู้นิรภัย" defaultValue={d?.type === 'gold' ? d?.acctNo : undefined} /></Field>
          <div style={{ background: 'var(--p-gold-bg,#FBF4DF)', border: '1px solid var(--p-gold-bd,#ECDBA8)', borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--p-gold-ink,#8A6A12)' }}>มูลค่า <strong style={{ fontSize: 15 }}>{fmt(goldBahtLive * goldBuyPriceLive)}</strong></span>
          </div>
        </div>
      )}

      {/* stock */}
      {formType === 'stock' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14 }}>
            <Field label="จำนวนหุ้น"><Input name="shares" placeholder="50,000" defaultValue={dvField(d?.shares)} /></Field>
            <Field label="ราคาทุน / หุ้น (บาท)"><Input name="priceBuy" placeholder="32.00" defaultValue={dvField(d?.priceBuy)} /></Field>
          </div>
          <div style={note('#EEF3F7', 'var(--p-blue-bd,#CDDDE9)', '#3E6B8F')}>มูลค่าตลาด = จำนวนหุ้น × ราคาปัจจุบัน · ระบบคำนวณกำไร/ขาดทุนจากราคาทุนให้อัตโนมัติ</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14 }}>
            <Field label="ราคาตลาดวันนี้ / หุ้น (บาท)"><Input name="priceNow" placeholder="35.50" defaultValue={dvField(d?.priceNow)} /></Field>
            <Field label="บัญชีรับเงินปันผล">
              <select name="iAcct" defaultValue={iAcctOptionValue(d?.iAcct)} style={inputStyle}>
                <option>ธ.กรุงเทพ 122-4423-121334 · วิวัฒน์</option>
                <option>ธ.ออมสิน 534-21213-2311 · ชัย·ธีรดา</option>
              </select>
            </Field>
          </div>
        </div>
      )}

      {/* land */}
      {formType === 'land' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14 }}>
            <Field label="เลขที่โฉนด / น.ส."><Input name="deedNo" placeholder="น.ส.4จ. 12456" defaultValue={d?.deedNo} /></Field>
            <Field label="ราคาประเมิน (บาท)"><Input name="appraisal" placeholder="18,500,000" defaultValue={dvField(d?.appraisal)} /></Field>
          </div>
          <Field label="เนื้อที่">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(80px,1fr))', gap: 10 }}>
              {([['rai', '5', 'ไร่'], ['ngan', '2', 'งาน'], ['wa', '40', 'ตร.วา']] as const).map(([nm, ph, unit]) => (
                <div key={unit} style={{ position: 'relative' }}>
                  <input name={nm} placeholder={ph} defaultValue={dvField(d?.[nm])} style={inputStyle} />
                  <span style={{ position: 'absolute', right: 13, top: 12, fontSize: 12, color: 'var(--muted,#A89F8C)' }}>{unit}</span>
                </div>
              ))}
            </div>
          </Field>
          <Field label="ที่ตั้ง"><Input name="location" placeholder="เช่น ต.บางพระ อ.ศรีราชา จ.ชลบุรี" /></Field>
          <div style={note('#F5F1E9', '#E2D6C2', '#7E6A4E')}>อสังหาริมทรัพย์ไม่มีดอกเบี้ย/วันครบกำหนด — มูลค่าใช้ราคาประเมินล่าสุด ปรับได้เมื่อมีการประเมินใหม่</div>
        </div>
      )}

      {/* other */}
      {formType === 'other' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14 }}>
            <Field label="หมวดหมู่ (กำหนดเอง)"><Input name="otherCat" placeholder="เช่น ของสะสม · รถยนต์ · พระเครื่อง" defaultValue={d?.otherCat} /></Field>
            <Field label="มูลค่าประเมิน (บาท)"><Input name="otherVal" placeholder="1,200,000" defaultValue={dvField(d?.otherVal)} /></Field>
          </div>
          <Field label="หมายเหตุ"><Input name="note" placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)" /></Field>
        </div>
      )}
    </>
  );
}
