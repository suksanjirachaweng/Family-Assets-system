import type { RawAsset } from '@/data/types';

/** Parse "1,000,000" → 1000000; "" → undefined. */
export const numField = (v: FormDataEntryValue | null) => {
  if (v == null) return undefined;
  const n = Number(String(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && String(v).trim() !== '' ? n : undefined;
};

export const strField = (v: FormDataEntryValue | null) => (v == null ? '' : String(v).trim());

/** Parse a "ธ.กรุงเทพ 122-4423-121334 · วิวัฒน์·ธีรดา" select value into an iAcct. */
export function parseIAcctOption(v: string): RawAsset['iAcct'] | undefined {
  if (!v || v.indexOf('—') >= 0) return undefined;
  const [left, ownersPart] = v.split(' · ');
  const sp = left.trim().split(' ');
  const bank = sp[0];
  const no = sp.slice(1).join(' ');
  const owners = (ownersPart || '').split('·').map((x) => x.trim()).filter(Boolean);
  return { bank, no, owners };
}

/** Inverse of parseIAcctOption — builds the option string so <select defaultValue> can match it. */
export function iAcctOptionValue(ia?: { bank: string; no: string; owners: string[] }) {
  return ia ? `${ia.bank} ${ia.no} · ${ia.owners.join('·')}` : undefined;
}

/** Order-independent owner-set key, so "ชัย·วิภาดา" matches "วิภาดา·ชัย". */
const ownerSetKey = (owners: string[]) => owners.slice().sort().join('·');

/**
 * The บัญชีรับดอกเบี้ย/ปันผล <select> should only offer savings accounts owned by
 * exactly the same person/people as the asset itself — a joint account for
 * "ชัย·วิภาดา" isn't a valid interest destination for a bond owned by "ชัย" alone.
 * Options come from real ประเภทออมทรัพย์ assets first, falling back to legacy iAcct
 * references recorded directly on other assets (not yet backed by a savings-type
 * asset of their own) — both filtered to the same owner set. `current` is always
 * included even if it no longer matches, so editing never shows a blank/wrong value.
 */
export function collectIAcctOptions(assets: RawAsset[], owners: string[], current?: RawAsset['iAcct']): string[] {
  const wantKey = ownerSetKey(owners);
  const set = new Set<string>();
  assets.forEach((a) => {
    if (a.type === 'sav') {
      if (ownerSetKey(a.owners) === wantKey) {
        const bank = a.name.startsWith('ธ.') ? a.name : `ธ.${a.name}`;
        set.add(`${bank} ${a.acctNo} · ${a.owners.join('·')}`);
      }
    } else if (a.iAcct && ownerSetKey(a.iAcct.owners) === wantKey) {
      const v = iAcctOptionValue(a.iAcct);
      if (v) set.add(v);
    }
  });
  const currentValue = iAcctOptionValue(current);
  if (currentValue) set.add(currentValue);
  return Array.from(set).sort();
}

/** Stringify a possibly-undefined numeric field for a text input's defaultValue. */
export const dvField = (v: unknown) => (v == null ? undefined : String(v));

/** Build a RawAsset from the asset-form fields, keyed exactly as <AssetFormFields> names its inputs. */
export function buildRawAssetFromForm(f: FormData, type: RawAsset['type'], owners: string[], id: string): RawAsset {
  const isDeposit = type === 'fd' || type === 'sav' || type === 'bond';
  const a: RawAsset = {
    id,
    type,
    name: strField(f.get('name')),
    owners,
    acctNo: strField(f.get('acctNo')),
    rate: numField(f.get('rate')) ?? 0,
    due: strField(f.get('due')) || null,
  };
  if (isDeposit) {
    a.amount = numField(f.get('amount'));
    if (type === 'sav') a.receiving = true;
    else a.iAcct = parseIAcctOption(strField(f.get('iAcct')));
  } else if (type === 'fund') {
    a.units = numField(f.get('units'));
    a.navBuy = numField(f.get('navBuy'));
    a.navNow = numField(f.get('navNow'));
    a.iAcct = parseIAcctOption(strField(f.get('iAcct')));
    a.due = null;
  } else if (type === 'gold') {
    a.goldBaht = numField(f.get('goldBaht'));
    a.goldBuyPrice = numField(f.get('goldBuyPrice'));
    a.name = a.name || 'ทองคำแท่ง 96.5%';
    a.acctNo = strField(f.get('goldLocation')) || a.acctNo;
    a.due = null;
  } else if (type === 'stock') {
    a.shares = numField(f.get('shares'));
    a.priceBuy = numField(f.get('priceBuy'));
    a.priceNow = numField(f.get('priceNow'));
    a.iAcct = parseIAcctOption(strField(f.get('iAcct')));
    a.due = null;
  } else if (type === 'land') {
    a.deedNo = strField(f.get('deedNo'));
    a.appraisal = numField(f.get('appraisal'));
    a.rai = numField(f.get('rai')) ?? 0;
    a.ngan = numField(f.get('ngan')) ?? 0;
    a.wa = numField(f.get('wa')) ?? 0;
    a.acctNo = strField(f.get('deedNo')) || a.acctNo;
    a.due = null;
  } else if (type === 'other') {
    a.otherCat = strField(f.get('otherCat'));
    a.otherVal = numField(f.get('otherVal'));
    a.due = null;
  }
  return a;
}

/** Cash actually paid/received for a destination (cost basis), not necessarily its current market value. */
export function destinationCost(raw: RawAsset, marketAmount: number): number {
  if (raw.type === 'fund') return (raw.units ?? 0) * (raw.navBuy ?? 0);
  if (raw.type === 'stock') return (raw.shares ?? 0) * (raw.priceBuy ?? 0);
  return marketAmount;
}
