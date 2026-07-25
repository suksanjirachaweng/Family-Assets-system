import { create } from 'zustand';
import type { Asset, AssetType, RawAsset } from '@/data/types';
import { computeAssets, decorateAssets } from '@/lib/assets';
import * as api from '@/api/client';
import type { LineGroup, MoveRecord } from '@/api/client';

export type View =
  | 'overview'
  | 'assets'
  | 'move'
  | 'flow'
  | 'calendar'
  | 'history'
  | 'detail'
  | 'line';

export type ThemeKey = 'earth' | 'dark' | 'navy' | 'teal';
export type HistRange = '1Y' | '3Y' | '5Y' | 'ALL';
export type FlowRange = '1Y' | '3Y' | '5Y' | 'ALL' | null;
export type FlowXAxis = 'stage' | 'date';

export interface AllocMap {
  [key: string]: number;
}

export interface AppState {
  view: View;
  selId: string | null;
  typeFilter: AssetType | 'all';
  matSel: string[];
  calIdx: number;
  showForm: boolean;
  formType: AssetType;
  formOwners: string[];
  editingId: string | null;
  moveTarget: string | null;
  expandedType: AssetType | null;
  flowZoom: number;
  flowSel: string | null;
  flowFrom: string;
  flowTo: string;
  alloc: AllocMap | null;
  flowRange: FlowRange;
  flowXAxis: FlowXAxis;
  expenseExpanded: boolean;
  search: string;
  histRange: HistRange;
  lineConnected: boolean;
  lineGroups: LineGroup[];
  linePendingGroups: LineGroup[];
  lineLead: { d30: boolean; d7: boolean; d1: boolean };
  lineTypes: Partial<Record<AssetType, boolean>>;
  lineTime: string;
  lineMaturity: boolean;
  lineMonthly: boolean;
  lineLargeMove: boolean;
  theme: ThemeKey;
  showEnglish: boolean;

  // data slice
  assets: Asset[];
  moves: MoveRecord[];
  dataSource: 'mock' | 'remote';
  loading: boolean;
  dataError: string | null;

  // actions
  setView: (v: View) => void;
  openAsset: (id: string) => void;
  set: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
  patch: (partial: Partial<AppState>) => void;
  toggleMatSel: (id: string) => void;
  toggleFormOwner: (name: string) => void;
  setLineLead: (k: 'd30' | 'd7' | 'd1') => void;
  toggleLineType: (k: AssetType) => void;
  loadData: () => Promise<void>;
  openAddForm: () => void;
  openEditForm: (id: string) => void;
  upsertLocalAsset: (raw: RawAsset) => void;
  removeLocalAsset: (id: string) => void;
}

export const useAppStore = create<AppState>((setState) => ({
  view: 'overview',
  selId: null,
  typeFilter: 'all',
  matSel: ['a3'],
  calIdx: 0,
  showForm: false,
  formType: 'fd',
  formOwners: ['วิวัฒน์'],
  editingId: null,
  moveTarget: null,
  expandedType: null,
  flowZoom: 1,
  flowSel: null,
  flowFrom: '',
  flowTo: '',
  alloc: null,
  flowRange: '1Y',
  flowXAxis: 'stage',
  expenseExpanded: false,
  search: '',
  histRange: '1Y',
  lineConnected: true,
  lineGroups: [],
  linePendingGroups: [],
  lineLead: { d30: true, d7: true, d1: true },
  lineTypes: { fd: true, bond: true, fund: false },
  lineTime: '09:00',
  lineMaturity: true,
  lineMonthly: true,
  lineLargeMove: true,
  theme: 'teal',
  showEnglish: true,

  assets: computeAssets(),
  moves: [],
  dataSource: 'mock',
  loading: false,
  dataError: null,

  setView: (v) => setState({ view: v, selId: null, moveTarget: null }),
  openAsset: (id) => setState({ view: 'detail', selId: id }),
  set: (key, value) => setState({ [key]: value } as Partial<AppState>),
  patch: (partial) => setState(partial),
  toggleMatSel: (id) =>
    setState((s) => {
      const cur = s.matSel.slice();
      const i = cur.indexOf(id);
      if (i >= 0) cur.splice(i, 1);
      else cur.push(id);
      return { matSel: cur };
    }),
  toggleFormOwner: (name) =>
    setState((s) => {
      const cur = s.formOwners.slice();
      const i = cur.indexOf(name);
      if (i >= 0) cur.splice(i, 1);
      else cur.push(name);
      return { formOwners: cur };
    }),
  setLineLead: (k) =>
    setState((s) => ({ lineLead: { ...s.lineLead, [k]: !s.lineLead[k] } })),
  toggleLineType: (k) =>
    setState((s) => ({ lineTypes: { ...s.lineTypes, [k]: !s.lineTypes[k] } })),

  loadData: async () => {
    if (!api.isConfigured()) return; // stay on mock
    setState({ loading: true, dataError: null });
    try {
      const data = await api.fetchAll();
      if (!data) return;
      const next: Partial<AppState> = {
        assets: decorateAssets(data.assets, data.settings.goldPricePerBaht),
        moves: data.moves || [],
        dataSource: 'remote',
        loading: false,
      };
      const s = data.settings || {};
      if (s.lineConnected != null) next.lineConnected = s.lineConnected;
      if (s.lineGroups) next.lineGroups = s.lineGroups;
      if (s.linePendingGroups) next.linePendingGroups = s.linePendingGroups;
      if (s.lineLead) next.lineLead = s.lineLead;
      if (s.lineTypes) next.lineTypes = s.lineTypes;
      if (s.lineTime) next.lineTime = s.lineTime;
      if (s.lineMaturity != null) next.lineMaturity = s.lineMaturity;
      if (s.lineMonthly != null) next.lineMonthly = s.lineMonthly;
      if (s.lineLargeMove != null) next.lineLargeMove = s.lineLargeMove;
      setState(next);
    } catch (err) {
      setState({ loading: false, dataError: String(err) });
    }
  },

  openAddForm: () => setState({ showForm: true, editingId: null, formType: 'fd', formOwners: ['วิวัฒน์'] }),
  openEditForm: (id) =>
    setState((s) => {
      const a = s.assets.find((x) => x.id === id);
      if (!a) return { showForm: true, editingId: id };
      return { showForm: true, editingId: id, formType: a.type, formOwners: a.owners.slice() };
    }),
  upsertLocalAsset: (raw) =>
    setState((s) => {
      const [decorated] = decorateAssets([raw]);
      const idx = s.assets.findIndex((a) => a.id === raw.id);
      const assets = s.assets.slice();
      if (idx >= 0) assets[idx] = decorated;
      else assets.push(decorated);
      return { assets };
    }),
  removeLocalAsset: (id) =>
    setState((s) => ({ assets: s.assets.filter((a) => a.id !== id) })),
}));
