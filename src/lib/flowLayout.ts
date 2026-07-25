import type { CSSProperties } from 'react';
import { buildFlowGraph } from '@/data/flowGraph';
import { TYPES, type FlowNodeType } from '@/data/types';
import { dueLabelTH, fmt, thMon } from './format';
import { ownerColor, mixHex } from './colors';
import type { FlowRange, FlowXAxis } from '@/store/useAppStore';

const NW = 196, NH = 58, COLW = 252, PADX = 20, PADY = 16, ROWH = 80, MINGAP = 72;
const MIN_PX_PER_DAY = 1.1, MAX_PX_PER_DAY = 4;

const daysBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

const ASSET_TAG: Record<string, string> = {
  src: 'ที่มา', exit: 'ออกจากพอร์ต', merge: 'รวมยอด', expense: 'ค่าใช้จ่าย',
  fd: 'ฝากประจำ', bond: 'หุ้นกู้', fund: 'กองทุน', sav: 'ออมทรัพย์',
  stock: 'หุ้นสามัญ', gold: 'ทองคำ', land: 'อสังหาฯ',
};

const colorOf = (t: FlowNodeType): string =>
  t === 'src' ? '#3C4A33'
    : (t === 'exit' || t === 'merge') ? '#A89A7C'
      : t === 'expense' ? '#B26B4E'
        : (TYPES as Record<string, { color: string }>)[t] ? (TYPES as Record<string, { color: string }>)[t].color : '#8A7E8E';

const ownerOf = (lbl: string) => {
  const p = String(lbl).split(' · ');
  return p.length > 1 ? p[p.length - 1].trim() : '';
};

export interface FlowParams {
  expenseExpanded: boolean;
  flowSel: string | null;
  flowRange: FlowRange;
  flowFrom: string;
  flowTo: string;
  xAxisMode: FlowXAxis;
}

export interface FlowNodeVM {
  id: string;
  isExpenseToggle: boolean;
  isSel: boolean;
  amount: string;
  sub: string;
  tag: string;
  dateLabel: string;
  boxStyle: CSSProperties;
  tagStyle: CSSProperties;
  amountStyle: CSSProperties;
  subStyle: CSSProperties;
}

export interface FlowLinkVM { d: string; color: string; dash: string; tx: number; ty: number }
export interface LegendVM { label: string; dotStyle: CSSProperties }
export interface StageVM { label: string; style: CSSProperties }

export interface FlowResult {
  nodes: FlowNodeVM[];
  links: FlowLinkVM[];
  stages: StageVM[];
  gridLines: CSSProperties[];
  ownerLegend: LegendVM[];
  typeLegend: LegendVM[];
  flowW: number;
  flowH: number;
  treeCount: number;
  nodeTotal: number;
  minDate: string;
  maxDate: string;
  selLabel: string;
  fromVal: string;
  toVal: string;
}

const EMPTY_FLOW: FlowResult = {
  nodes: [], links: [], stages: [], gridLines: [], ownerLegend: [], typeLegend: [],
  flowW: 0, flowH: 0, treeCount: 0, nodeTotal: 0, minDate: '', maxDate: '',
  selLabel: '', fromVal: '', toVal: '',
};

export function computeFlow(p: FlowParams): FlowResult {
  const G = buildFlowGraph(p.expenseExpanded);
  if (!G.nodes.length) return EMPTY_FLOW;
  const gmap: Record<string, (typeof G.nodes)[number]> = {};
  G.nodes.forEach((n) => { gmap[n.id] = n; });
  const childrenOf: Record<string, string[]> = {}, parentsOf: Record<string, string[]> = {};
  G.nodes.forEach((n) => { childrenOf[n.id] = []; parentsOf[n.id] = []; });
  G.edges.forEach(([a, b]) => { if (gmap[a] && gmap[b]) { childrenOf[a].push(b); parentsOf[b].push(a); } });

  const genMemo: Record<string, number> = {};
  const calcGen = (id: string): number => {
    if (genMemo[id] != null) return genMemo[id];
    genMemo[id] = 0;
    let g = 0;
    parentsOf[id].forEach((par) => { g = Math.max(g, calcGen(par) + 1); });
    return (genMemo[id] = g);
  };
  G.nodes.forEach((n) => calcGen(n.id));
  const maxGen = Math.max(0, ...G.nodes.map((n) => genMemo[n.id]));

  const allDatesRaw = G.nodes.map((n) => n.date).filter(Boolean).sort();
  const minDate = allDatesRaw[0], maxDate = allDatesRaw[allDatesRaw.length - 1];
  const totalDays = Math.max(1, daysBetween(minDate, maxDate));
  const pxPerDay = Math.min(MAX_PX_PER_DAY, Math.max(MIN_PX_PER_DAY, ((maxGen + 1) * COLW) / totalDays));

  let cursor = 0;
  const yPos: Record<string, number> = {};
  const dfsY = (id: string, stack?: string[]): number => {
    if (yPos[id] != null) return yPos[id];
    if (stack && stack.indexOf(id) >= 0) { const y = cursor * ROWH; cursor++; return (yPos[id] = y); }
    const ch = childrenOf[id];
    if (!ch.length) { const y = cursor * ROWH; cursor++; return (yPos[id] = y); }
    const s2 = (stack || []).concat(id);
    let s = 0;
    ch.forEach((c) => { s += dfsY(c, s2); });
    return (yPos[id] = s / ch.length);
  };
  const roots = G.nodes.filter((n) => parentsOf[n.id].length === 0);
  roots.forEach((r) => dfsY(r.id));
  G.nodes.forEach((n) => { if (yPos[n.id] == null) { yPos[n.id] = cursor * ROWH; cursor++; } });

  // per-column collision avoidance
  const byCol: Record<number, string[]> = {};
  G.nodes.forEach((n) => { const g = genMemo[n.id]; (byCol[g] = byCol[g] || []).push(n.id); });
  Object.keys(byCol).forEach((g) => {
    const ids = byCol[+g].sort((a, b) => yPos[a] - yPos[b]);
    for (let i = 1; i < ids.length; i++) {
      if (yPos[ids[i]] < yPos[ids[i - 1]] + MINGAP) yPos[ids[i]] = yPos[ids[i - 1]] + MINGAP;
    }
  });
  let maxY = 0;
  G.nodes.forEach((n) => { if (yPos[n.id] > maxY) maxY = yPos[n.id]; });

  const xOf = (n: { id: string; date: string }) =>
    p.xAxisMode === 'date'
      ? PADX + Math.max(0, daysBetween(minDate, n.date)) * pxPerDay
      : genMemo[n.id] * COLW + PADX;

  const nodes = G.nodes.map((n) => ({
    id: n.id, x: xOf(n), y: yPos[n.id] + PADY, w: NW,
    h: (n.type === 'exit' || n.type === 'merge') ? 50 : NH,
    type: n.type, amount: n.amount, sub: n.label, date: n.date,
  }));
  const nodeMap: Record<string, (typeof nodes)[number]> = {};
  nodes.forEach((n) => { nodeMap[n.id] = n; });
  const links = G.edges.filter(([a, b]) => nodeMap[a] && nodeMap[b]);
  const flowW = p.xAxisMode === 'date'
    ? PADX + totalDays * pxPerDay + NW + PADX
    : (maxGen + 1) * COLW + PADX;
  const flowH = maxY + NH + PADY + 24;

  // selection: ancestors + descendants
  const fwd: Record<string, string[]> = {}, rev: Record<string, string[]> = {};
  links.forEach(([f, t]) => { (fwd[f] = fwd[f] || []).push(t); (rev[t] = rev[t] || []).push(f); });
  const reach = (start: string, adj: Record<string, string[]>) => {
    const seen: Record<string, 1> = {}; const st = [start];
    while (st.length) { const x = st.pop()!; (adj[x] || []).forEach((y) => { if (!seen[y]) { seen[y] = 1; st.push(y); } }); }
    return seen;
  };
  const sel = p.flowSel;
  let activeNodes: Record<string, 1> | null = null;
  if (sel && nodeMap[sel]) {
    const up = reach(sel, rev), down = reach(sel, fwd);
    activeNodes = { ...up, ...down }; activeNodes[sel] = 1;
  }
  const nodeActive = (id: string) => !activeNodes || activeNodes[id];

  // date filter (preset or manual)
  const yearsBack: Record<string, number> = { '1Y': 1, '3Y': 3, '5Y': 5 };
  let from: string, to: string;
  if (p.flowRange === 'ALL') {
    from = ''; to = '';
  } else if (p.flowRange && yearsBack[p.flowRange]) {
    const anchor = new Date(maxDate);
    const f = new Date(anchor); f.setFullYear(f.getFullYear() - yearsBack[p.flowRange]);
    from = f.toISOString().slice(0, 10); to = maxDate;
  } else { from = p.flowFrom; to = p.flowTo; }
  const dateOk = (n: { date: string }) => (!from || n.date >= from) && (!to || n.date <= to);
  const inView = (n: { id: string; date: string }) => nodeActive(n.id) && dateOk(n);

  const visibleNodes = nodes.filter(inView);
  const visibleIds: Record<string, 1> = {};
  visibleNodes.forEach((n) => { visibleIds[n.id] = 1; });

  const nodeVMs: FlowNodeVM[] = visibleNodes.map((n) => {
    const owner = ownerOf(n.sub);
    const isSrc = n.type === 'src';
    const dashed = n.type === 'exit' || n.type === 'merge' || n.type === 'expense';
    const hasOwner = !!owner && !isSrc && !dashed;
    const c = hasOwner ? ownerColor(owner) : (n.type === 'expense' ? '#B26B4E' : '#9AA0A6');
    const isExpenseToggle = n.id === 't8g' || /^t8e/.test(n.id);
    const isSel = sel === n.id;
    const borderC = mixHex(c, '#000000', 0.1);
    const bgC = mixHex(c, '#FFFFFF', 0.72);
    const typeC = colorOf(n.type);
    const isAsset = !!(TYPES as Record<string, unknown>)[n.type];
    return {
      id: n.id,
      isExpenseToggle,
      isSel,
      amount: fmt(n.amount),
      sub: n.sub,
      tag: ASSET_TAG[n.type],
      dateLabel: dueLabelTH(n.date),
      amountStyle: { fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 13.5, color: mixHex(c, '#000000', 0.25), margin: 0 },
      subStyle: { fontSize: 10, color: mixHex(c, '#000000', 0.45), lineHeight: 1.25 },
      boxStyle: {
        position: 'absolute', left: n.x, top: n.y, width: n.w,
        background: bgC, color: borderC,
        border: (dashed ? '1.5px dashed ' : '1.5px solid ') + borderC,
        borderRadius: 9, padding: '6px 10px',
        boxShadow: isSrc
          ? ('0 0 0 3px ' + bgC + ', 0 0 0 4.5px ' + borderC + (isSel ? ', 0 4px 14px rgba(60,50,30,0.22)' : ''))
          : (isSel ? '0 4px 14px rgba(60,50,30,0.22)' : '0 1px 3px rgba(60,50,30,0.07)'),
        outline: isSel && !isSrc ? '2px solid ' + borderC : 'none',
        outlineOffset: 2,
        cursor: 'pointer',
      },
      tagStyle: isAsset
        ? { display: 'inline-block', flexShrink: 0, whiteSpace: 'nowrap', fontSize: 9.5, fontWeight: 700, color: mixHex(typeC, '#000000', 0.25), background: mixHex(typeC, '#FFFFFF', 0.78), border: '1px solid ' + mixHex(typeC, '#000000', 0.08), padding: '1px 7px', borderRadius: 5, letterSpacing: '0.01em' }
        : { flexShrink: 0, whiteSpace: 'nowrap', fontSize: 10, fontWeight: 700, color: mixHex(c, '#000000', 0.35), letterSpacing: '0.02em' },
    };
  });

  const linkVMs: FlowLinkVM[] = links
    .filter(([f, t]) => visibleIds[f] && visibleIds[t])
    .map(([f, t]) => {
      const s = nodeMap[f], e = nodeMap[t];
      const sx = s.x + s.w, sy = s.y + s.h / 2, tx = e.x, ty = e.y + e.h / 2;
      const cp = (sx + tx) / 2;
      return { d: `M ${sx},${sy} C ${cp},${sy} ${cp},${ty} ${tx},${ty}`, color: '#C2B79E', dash: '0', tx, ty };
    });

  const ownersInFlow = [...new Set(G.nodes.map((n) => ownerOf(n.label)).filter(Boolean))];
  const ownerLegend: LegendVM[] = ownersInFlow.map((o) => ({
    label: o, dotStyle: { width: 11, height: 11, borderRadius: '50%', background: ownerColor(o), display: 'inline-block', flexShrink: 0 },
  }));
  const typeLegend: LegendVM[] = [...new Set(G.nodes.map((n) => n.type))]
    .filter((t) => (TYPES as Record<string, unknown>)[t])
    .map((t) => {
      const col = (TYPES as Record<string, { color: string }>)[t].color;
      const label = (TYPES as Record<string, { label: string }>)[t].label;
      return { label, dotStyle: { width: 10, height: 10, borderRadius: 3, background: mixHex(col, '#FFFFFF', 0.4), border: '1px solid ' + mixHex(col, '#000000', 0.1), display: 'inline-block', flexShrink: 0 } };
    });

  let stages: StageVM[];
  let gridLines: CSSProperties[];
  if (p.xAxisMode === 'date') {
    stages = [];
    gridLines = [];
    const start = new Date(minDate);
    const end = new Date(maxDate);
    const stepMonths = totalDays > 900 ? 6 : totalDays > 450 ? 3 : totalDays > 200 ? 2 : 1;
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    let guard = 0;
    while (cur.getTime() <= end.getTime() && guard < 60) {
      guard++;
      const dayOffset = Math.round((cur.getTime() - start.getTime()) / 86400000);
      const x = PADX + Math.max(0, dayOffset) * pxPerDay;
      const label = thMon()[cur.getMonth()] + ' ' + ((cur.getFullYear() + 543) % 100);
      stages.push({ label, style: { position: 'absolute', left: x, top: -2, fontSize: 12, fontWeight: 700, color: 'var(--muted,#9A917F)', letterSpacing: '0.03em' } });
      gridLines.push({ position: 'absolute', left: x, top: 16, bottom: 0, width: 1, background: 'var(--border2,#E2D9C8)', opacity: 0.5 });
      cur.setMonth(cur.getMonth() + stepMonths);
    }
  } else {
    stages = Array.from({ length: maxGen + 1 }, (_, g) => ({
      label: g === 0 ? 'ต้นทาง' : (g === maxGen ? 'ปัจจุบัน' : 'ขั้นที่ ' + (g + 1)),
      style: { position: 'absolute', left: g * COLW + PADX, top: -2, fontSize: 12, fontWeight: 700, color: 'var(--muted,#9A917F)', letterSpacing: '0.03em' },
    }));
    gridLines = [];
  }

  return {
    nodes: nodeVMs,
    links: linkVMs,
    stages,
    gridLines,
    ownerLegend,
    typeLegend,
    flowW,
    flowH,
    treeCount: roots.length,
    nodeTotal: nodes.length,
    minDate,
    maxDate,
    selLabel: sel && nodeMap[sel] ? nodeMap[sel].sub.split('\n')[0] : '',
    fromVal: from || '',
    toVal: to || '',
  };
}
