export type AssetType =
  | 'fd'
  | 'sav'
  | 'fund'
  | 'bond'
  | 'gold'
  | 'stock'
  | 'land'
  | 'other';

export interface InterestAcct {
  bank: string;
  no: string;
  owners: string[];
}

export interface ExpenseEntry {
  label: string;
  cat: string;
  amount: number;
  date: string;
}

/** Raw asset record as authored in the prototype dataset. */
export interface RawAsset {
  id: string;
  type: AssetType;
  name: string;
  owners: string[];
  acctNo: string;
  due?: string | null;
  rate?: number;
  // deposit / bond / savings
  amount?: number;
  receiving?: boolean;
  iAcct?: InterestAcct;
  expenses?: ExpenseEntry[];
  // fund
  units?: number;
  navBuy?: number;
  navNow?: number;
  // gold
  goldBaht?: number;
  goldBuyPrice?: number;
  // stock
  shares?: number;
  priceBuy?: number;
  priceNow?: number;
  // land
  deedNo?: string;
  rai?: number;
  ngan?: number;
  wa?: number;
  appraisal?: number;
  // other
  otherCat?: string;
  otherVal?: number;
}

/** Asset with computed market value + display metadata. */
export interface Asset extends RawAsset {
  amount: number;
  color: string;
  typeLabel: string;
  typeEn: string;
}

export interface TypeMeta {
  label: string;
  en: string;
  color: string;
}

export type FlowNodeType =
  | AssetType
  | 'src'
  | 'exit'
  | 'merge'
  | 'expense';

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  amount: number;
  label: string;
  date: string;
}

export interface FlowGraph {
  nodes: FlowNode[];
  edges: [string, string][];
}

/** One source or destination leg of a recorded money move — enough to rebuild
 *  a FlowNode from real move history (see buildFlowGraph in data/flowGraph.ts). */
export interface MoveLeg {
  id: string;
  type: FlowNodeType;
  label: string;
  amount: number;
  date: string;
}

export const TYPES: Record<AssetType, TypeMeta> = {
  fd: { label: 'ฝากประจำ', en: 'Fixed Deposit', color: '#2E9E5B' },
  sav: { label: 'ออมทรัพย์', en: 'Savings', color: '#17B0A6' },
  fund: { label: 'กองทุน', en: 'Mutual Fund', color: '#F0792B' },
  bond: { label: 'หุ้นกู้', en: 'Bond', color: '#C13C8E' },
  gold: { label: 'ทองคำ', en: 'Gold', color: '#E9A911' },
  stock: { label: 'หุ้นสามัญ', en: 'Stock', color: '#2563EB' },
  land: { label: 'อสังหาฯ', en: 'Real Estate', color: '#9A6B2F' },
  other: { label: 'อื่นๆ', en: 'Other', color: '#8B5CF6' },
};
