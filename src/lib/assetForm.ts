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

/**
 * The บัญชีรับดอกเบี้ย/ปันผล <select> needs an <option> matching `current` or the
 * browser silently falls back to the first option — every real interest account
 * must be offered, not a fixed sample list, or editing an asset shows the wrong one.
 */
export function collectIAcctOptions(assets: RawAsset[], current?: RawAsset['iAcct']): string[] {
  const set = new Set<string>();
  assets.forEach((a) => { const v = iAcctOptionValue(a.iAcct); if (v) set.add(v); });
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
