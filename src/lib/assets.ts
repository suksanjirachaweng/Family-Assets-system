import { rawAssets } from '@/data/assets';
import { TYPES, type Asset, type AssetType, type RawAsset } from '@/data/types';
import { GOLD_PRICE_PER_BAHT, WHT_RATE, daysLeft } from './format';

/** Compute market value + display metadata for a set of raw assets. */
export function decorateAssets(raw: RawAsset[], goldPrice = GOLD_PRICE_PER_BAHT): Asset[] {
  return raw.map((a) => {
    const amount =
      a.type === 'gold'
        ? (a.goldBaht ?? 0) * goldPrice
        : a.type === 'fund'
          ? (a.units ?? 0) * (a.navNow ?? 0)
          : a.type === 'stock'
            ? (a.shares ?? 0) * (a.priceNow ?? 0)
            : a.type === 'land'
              ? (a.appraisal ?? 0)
              : a.type === 'other'
                ? (a.otherVal ?? 0)
                : (a.amount ?? 0);
    return {
      ...a,
      amount,
      color: TYPES[a.type].color,
      typeLabel: TYPES[a.type].label,
      typeEn: TYPES[a.type].en,
    };
  });
}

/** Local mock dataset, decorated (used until/unless a backend is configured). */
let _cache: Asset[] | null = null;
export function computeAssets(): Asset[] {
  if (!_cache) _cache = decorateAssets(rawAssets);
  return _cache;
}

/** Net annual interest/dividend after withholding tax. */
export const netInterest = (a: Asset) => a.amount * (a.rate ?? 0) / 100 * (1 - WHT_RATE);

export interface WithDue {
  a: Asset;
  days: number;
}

/** Assets that have a due date, sorted by soonest. */
export function assetsWithDue(assets: Asset[]): WithDue[] {
  return assets
    .filter((a) => a.due)
    .map((a) => ({ a, days: daysLeft(a.due!) }))
    .sort((x, y) => x.days - y.days);
}

/** Owner bucket key: combined owners joined with " · ", sorted so entry order doesn't split the group. */
export function ownerKey(owners: string[]): string {
  return owners.length > 1 ? owners.slice().sort().join(' · ') : owners[0];
}

export const TYPE_ORDER: AssetType[] = ['fund', 'bond', 'fd', 'sav', 'stock', 'gold', 'land', 'other'];
