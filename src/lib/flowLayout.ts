import type { CSSProperties } from 'react';
import { buildFlowGraph } from '@/data/flowGraph';
import { TYPES, type Asset, type FlowNodeType } from '@/data/types';
import { dueLabelTH, fmt, thMon } from './format';
import { ownerColor, mixHex, KNOWN_OWNERS } from './colors';
import type { FlowRange, FlowXAxis } from '@/store/useAppStore';
import type { MoveRecord } from '@/api/client';

// ROWH must clear NH + NODE_GAP (74) — otherwise the collision-avoidance pass
// below (which requires that much clearance before treating two boxes as not
// touching) treats every legitimately-adjacent DFS row as a false collision
// and cascades unrelated same-date nodes apart, dragging genuinely-linked
// nodes away from the row they were deliberately placed to share.
const NW = 176, NH = 60, STRIP_W = 20, COLW = 220, PADX = 20, PADY = 16, ROWH = 80, NODE_GAP = 14;
type FlowDateStep = 'week' | '2week' | 'month' | '3month' | '6month' | 'year';
const PX_PER_DAY_BY_STEP: Record<FlowDateStep, number> = {
  week: 120 / 7, '2week': 120 / 14, month: 120 / 30, '3month': 120 / 90, '6month': 120 / 180, year: 120 / 365,
};
/** Calendar months per gridline for the month-anchored granularities. */
const STEP_MONTHS_BY_STEP: Partial<Record<FlowDateStep, number>> = {
  month: 1, '3month': 3, '6month': 6, year: 12,
};

const daysBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

const ASSET_TAG: Record<string, string> = {
  src: 'ที่มา', exit: 'ออกจากพอร์ต', merge: 'รวมยอด', expense: 'ค่าใช้จ่าย',
  fd: 'ฝากประจำ', bond: 'หุ้นกู้', fund: 'กองทุน', sav: 'ออมทรัพย์',
  stock: 'หุ้นสามัญ', gold: 'ทองคำ', land: 'อสังหาฯ',
};

/** Fill/border hue for "new money" nodes (external income, interest — money
 *  that isn't coming from an existing tracked account) — matches the app's
 *  own accent green so it reads as a positive, incoming amount at a glance. */
const NEW_MONEY_COLOR = '#5E7350';

const colorOf = (t: FlowNodeType): string =>
  t === 'src' ? NEW_MONEY_COLOR
    : (t === 'exit' || t === 'merge') ? '#A89A7C'
      : t === 'expense' ? '#B26B4E'
        : (TYPES as Record<string, { color: string }>)[t] ? (TYPES as Record<string, { color: string }>)[t].color : '#8A7E8E';

const ownerOf = (lbl: string) => {
  const p = String(lbl).split(' · ');
  return p.length > 1 ? p[p.length - 1].trim() : '';
};

const KNOWN_OWNERS_SET = new Set(KNOWN_OWNERS);

/** The trailing run of "· owner" segments, sorted + joined — same detection
 *  splitLabelParts uses, but as a stable key so "สุขสันต์ · ธีรดา" and
 *  "ธีรดา · สุขสันต์" land in the same zone regardless of listed order. Empty
 *  string means "no recognized owner" (external income, etc.) — its own zone. */
function ownerZoneKey(label: string): string {
  const segs = String(label).split(' · ');
  let ownerStart = segs.length;
  for (let i = segs.length - 1; i >= 0; i--) {
    if (KNOWN_OWNERS_SET.has(segs[i].trim())) ownerStart = i;
    else break;
  }
  return segs.slice(ownerStart).map((s) => s.trim()).sort().join('·');
}

/** Splits a "name · owner · owner" label into plain-text segments and owner
 *  segments (the trailing run of parts that match a known family owner),
 *  so each owner's name can be rendered in its own color + bold instead of
 *  the whole card being tinted by one blended color. */
function splitLabelParts(label: string): { text: string; color?: string; bold?: boolean }[] {
  const segs = String(label).split(' · ');
  let ownerStart = segs.length;
  for (let i = segs.length - 1; i >= 0; i--) {
    if (KNOWN_OWNERS_SET.has(segs[i].trim())) ownerStart = i;
    else break;
  }
  const rest = segs.slice(0, ownerStart).join(' · ');
  const owners = segs.slice(ownerStart);
  const parts: { text: string; color?: string; bold?: boolean }[] = [];
  if (rest) parts.push({ text: rest + (owners.length ? ' · ' : '') });
  owners.forEach((o, i) => {
    parts.push({ text: o, color: ownerColor(o), bold: true });
    if (i < owners.length - 1) parts.push({ text: ' · ' });
  });
  if (!parts.length) parts.push({ text: label });
  return parts;
}

export type { FlowDateStep };

export interface FlowParams {
  moves: MoveRecord[];
  assets: Asset[];
  flowSel: string | null;
  flowRange: FlowRange;
  flowFrom: string;
  flowTo: string;
  xAxisMode: FlowXAxis;
  dateStep: FlowDateStep;
  ownerFilter: string | null;
}

export interface FlowNodeVM {
  id: string;
  isSel: boolean;
  amount: string;
  sub: string;
  subParts: { text: string; color?: string; bold?: boolean }[];
  tag: string;
  dateLabel: string;
  boxStyle: CSSProperties;
  stripStyle: CSSProperties;
  tagStyle: CSSProperties;
  amountStyle: CSSProperties;
  subStyle: CSSProperties;
}

export interface FlowLinkVM { d: string; color: string; dash: string; tx: number; ty: number }
export interface LegendVM { label: string; dotStyle: CSSProperties }
export interface StageVM { label: string; style: CSSProperties }
export interface ZoneVM { label: string; bandStyle: CSSProperties; labelStyle: CSSProperties }

export interface FlowResult {
  nodes: FlowNodeVM[];
  links: FlowLinkVM[];
  stages: StageVM[];
  gridLines: CSSProperties[];
  zones: ZoneVM[];
  ownerLegend: LegendVM[];
  typeLegend: LegendVM[];
  ownerOptions: string[];
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
  nodes: [], links: [], stages: [], gridLines: [], zones: [], ownerLegend: [], typeLegend: [], ownerOptions: [],
  flowW: 0, flowH: 0, treeCount: 0, nodeTotal: 0, minDate: '', maxDate: '',
  selLabel: '', fromVal: '', toVal: '',
};

export function computeFlow(p: FlowParams): FlowResult {
  const G = buildFlowGraph(p.moves, p.assets);
  if (!G.nodes.length) return EMPTY_FLOW;
  const gmap: Record<string, (typeof G.nodes)[number]> = {};
  G.nodes.forEach((n) => { gmap[n.id] = n; });

  // Full-graph date range — kept stable across owner/date filter changes so
  // the date axis and range presets don't jump around as you narrow the view.
  const allDatesRaw = G.nodes.map((n) => n.date).filter(Boolean).sort();
  const minDate = allDatesRaw[0], maxDate = allDatesRaw[allDatesRaw.length - 1];
  const totalDays = Math.max(1, daysBetween(minDate, maxDate));
  const pxPerDay = PX_PER_DAY_BY_STEP[p.dateStep] ?? PX_PER_DAY_BY_STEP.month;

  // Selection (click-to-trace) reachability, computed over the FULL graph's
  // edges so ancestors/descendants are found correctly regardless of what
  // the owner/date filters below end up hiding.
  const fwdFull: Record<string, string[]> = {}, revFull: Record<string, string[]> = {};
  G.edges.forEach(([a, b]) => {
    if (!gmap[a] || !gmap[b]) return;
    (fwdFull[a] = fwdFull[a] || []).push(b);
    (revFull[b] = revFull[b] || []).push(a);
  });
  const reach = (start: string, adj: Record<string, string[]>) => {
    const seen: Record<string, 1> = {}; const st = [start];
    while (st.length) { const x = st.pop()!; (adj[x] || []).forEach((y) => { if (!seen[y]) { seen[y] = 1; st.push(y); } }); }
    return seen;
  };
  const sel = p.flowSel;
  let activeNodes: Record<string, 1> | null = null;
  if (sel && gmap[sel]) {
    const up = reach(sel, revFull), down = reach(sel, fwdFull);
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
  const ownerOk = (n: { label: string }) => !p.ownerFilter || n.label.includes(p.ownerFilter);

  // Filter the graph BEFORE laying it out, so hidden nodes don't leave empty
  // gaps behind — the surviving nodes get a fresh, compact generation/row
  // layout every time the selection/date/owner filter changes, instead of
  // just being hidden inside a layout computed for the full graph.
  const activeGraphNodes = G.nodes.filter((n) => nodeActive(n.id) && dateOk(n) && ownerOk({ label: n.label }));
  const activeIds: Record<string, 1> = {};
  activeGraphNodes.forEach((n) => { activeIds[n.id] = 1; });
  const activeEdges = G.edges.filter(([a, b]) => activeIds[a] && activeIds[b]);

  const childrenOf: Record<string, string[]> = {}, parentsOf: Record<string, string[]> = {};
  activeGraphNodes.forEach((n) => { childrenOf[n.id] = []; parentsOf[n.id] = []; });
  activeEdges.forEach(([a, b]) => { childrenOf[a].push(b); parentsOf[b].push(a); });

  const genMemo: Record<string, number> = {};
  const calcGen = (id: string): number => {
    if (genMemo[id] != null) return genMemo[id];
    genMemo[id] = 0;
    let g = 0;
    parentsOf[id].forEach((par) => { g = Math.max(g, calcGen(par) + 1); });
    return (genMemo[id] = g);
  };
  activeGraphNodes.forEach((n) => calcGen(n.id));
  const maxGen = Math.max(0, ...activeGraphNodes.map((n) => genMemo[n.id]));

  const roots = activeGraphNodes.filter((n) => parentsOf[n.id].length === 0);

  // Group nodes into owner "zones" — each node's zone is its own owner (or
  // owner-combo), independent of what zone its parent/children fall in, so a
  // move that changes hands (e.g. a joint account's balance moving to a
  // single owner's new one) simply draws a normal edge across zone bands
  // rather than needing the two ends to agree on one zone.
  const zoneOf: Record<string, string> = {};
  activeGraphNodes.forEach((n) => { zoneOf[n.id] = ownerZoneKey(n.label); });

  // Unowned source money (interest, external income) has no zone of its own —
  // instead of stranding it in a separate "no owner" band, it joins the zone
  // of whatever it flows into. Resolve highest-generation nodes first so a
  // multi-hop chain of unowned nodes still inherits the eventual owner.
  const byGenDesc = [...activeGraphNodes].sort((a, b) => genMemo[b.id] - genMemo[a.id]);
  byGenDesc.forEach((n) => {
    if (zoneOf[n.id] !== '') return;
    const childZones = childrenOf[n.id].map((cid) => zoneOf[cid]).filter((z) => z !== '');
    if (!childZones.length) return;
    const counts = new Map<string, number>();
    childZones.forEach((z) => counts.set(z, (counts.get(z) || 0) + 1));
    let best = childZones[0], bestCount = 0;
    counts.forEach((cnt, z) => { if (cnt > bestCount) { bestCount = cnt; best = z; } });
    zoneOf[n.id] = best;
  });

  const nodesByZone = new Map<string, typeof activeGraphNodes>();
  activeGraphNodes.forEach((n) => {
    const z = zoneOf[n.id];
    let arr = nodesByZone.get(z);
    if (!arr) { arr = []; nodesByZone.set(z, arr); }
    arr.push(n);
  });
  const ownerRank = (name: string) => { const i = KNOWN_OWNERS.indexOf(name); return i < 0 ? KNOWN_OWNERS.length : i; };
  const zoneOrder = [...nodesByZone.keys()].sort((a, b) => {
    if (a === '') return -1;
    if (b === '') return 1;
    const ra = Math.min(...a.split('·').map(ownerRank));
    const rb = Math.min(...b.split('·').map(ownerRank));
    return ra !== rb ? ra - rb : a.localeCompare(b);
  });

  // Within each zone, the same "average of children's y" trick as before —
  // but scoped to that zone's own subgraph, then the whole zone is offset
  // down by every earlier zone's height so zones stack as non-overlapping bands.
  let zoneCursorY = 0;
  const yPos: Record<string, number> = {};
  const zones: ZoneVM[] = [];
  const ZONE_GAP = 22;
  zoneOrder.forEach((z) => {
    const zNodes = nodesByZone.get(z)!;
    const childrenInZone: Record<string, string[]> = {}, parentsInZone: Record<string, string[]> = {};
    zNodes.forEach((n) => {
      childrenInZone[n.id] = childrenOf[n.id].filter((cid) => zoneOf[cid] === z);
      parentsInZone[n.id] = parentsOf[n.id].filter((pid) => zoneOf[pid] === z);
    });
    // Group this zone's nodes into connected components (following edges in
    // either direction) so a whole move chain — e.g. an interest leg and its
    // principal both feeding the same destination — gets placed as one
    // contiguous block of rows, instead of unrelated standalone assets that
    // just happen to share the zone being interleaved in between them.
    const compOf: Record<string, number> = {};
    let compCount = 0;
    zNodes.forEach((n) => {
      if (compOf[n.id] != null) return;
      const compId = compCount++;
      const stack = [n.id];
      compOf[n.id] = compId;
      while (stack.length) {
        const cur = stack.pop()!;
        [...childrenInZone[cur], ...parentsInZone[cur]].forEach((nb) => {
          if (compOf[nb] == null) { compOf[nb] = compId; stack.push(nb); }
        });
      }
    });
    // Order components by their earliest date, so the vertical grouping still
    // roughly tracks the same left-to-right chronological flow as the x-axis.
    const compMinDate: Record<number, string> = {};
    zNodes.forEach((n) => {
      const c = compOf[n.id];
      if (compMinDate[c] == null || n.date < compMinDate[c]) compMinDate[c] = n.date;
    });
    const compOrder = [...new Set(zNodes.map((n) => compOf[n.id]))]
      .sort((a, b) => (compMinDate[a] || '').localeCompare(compMinDate[b] || ''));

    let localCursor = 0;
    const localY: Record<string, number> = {};
    const dfsLocal = (id: string, stack?: string[]): number => {
      if (localY[id] != null) return localY[id];
      if (stack && stack.indexOf(id) >= 0) { const y = localCursor * ROWH; localCursor++; return (localY[id] = y); }
      const ch = childrenInZone[id];
      if (!ch.length) { const y = localCursor * ROWH; localCursor++; return (localY[id] = y); }
      const s2 = (stack || []).concat(id);
      let s = 0;
      ch.forEach((c) => { s += dfsLocal(c, s2); });
      return (localY[id] = s / ch.length);
    };
    compOrder.forEach((compId) => {
      const compRoots = zNodes.filter((n) => compOf[n.id] === compId && parentsInZone[n.id].length === 0);
      compRoots.forEach((r) => dfsLocal(r.id));
    });
    zNodes.forEach((n) => { if (localY[n.id] == null) { localY[n.id] = localCursor * ROWH; localCursor++; } });

    const zoneTop = zoneCursorY;
    zNodes.forEach((n) => { yPos[n.id] = zoneTop + localY[n.id]; });
    const zoneHeight = Math.max(ROWH, localCursor * ROWH);
    const zoneColor = z ? ownerColor(z.split('·')[0]) : '#9AA0A6';
    zones.push({
      label: z ? z.split('·').join(' · ') : 'ไม่มีเจ้าของ / รายได้จากภายนอก',
      bandStyle: {
        position: 'absolute', left: 0, right: 0, top: zoneTop + PADY - ZONE_GAP / 2, height: zoneHeight + ZONE_GAP,
        background: mixHex(zoneColor, '#FFFFFF', 0.92), borderTop: '1px solid ' + mixHex(zoneColor, '#FFFFFF', 0.75),
        pointerEvents: 'none',
      },
      labelStyle: {
        position: 'absolute', left: 8, top: zoneTop + PADY - ZONE_GAP / 2 + 4,
        fontSize: 11, fontWeight: 700, color: mixHex(zoneColor, '#000000', 0.25), letterSpacing: '0.02em',
        background: mixHex(zoneColor, '#FFFFFF', 0.8), padding: '2px 8px', borderRadius: 6, pointerEvents: 'none',
      },
    });
    zoneCursorY += zoneHeight + ZONE_GAP;
  });

  const xOf = (n: { id: string; date: string }) =>
    p.xAxisMode === 'date'
      ? PADX + Math.max(0, daysBetween(minDate, n.date)) * pxPerDay
      : genMemo[n.id] * COLW + PADX;

  const nodes = activeGraphNodes.map((n) => ({
    id: n.id, x: xOf(n), y: yPos[n.id] + PADY, w: NW,
    h: NH,
    type: n.type, amount: n.amount, sub: n.label, date: n.date,
  }));

  // In date-axis mode, x is purely date-driven — but a move's legs are often
  // all logged under the same date, which would stack source and destination
  // at the same x with no visual cue for which side feeds which. Nudge each
  // node right of every parent that would otherwise land at or past it (in
  // gen order, so a parent's own nudge is already settled before its
  // children are checked), so "input" always sits strictly left of "output."
  if (p.xAxisMode === 'date') {
    const nodeById: Record<string, (typeof nodes)[number]> = {};
    nodes.forEach((n) => { nodeById[n.id] = n; });
    [...nodes]
      .sort((a, b) => genMemo[a.id] - genMemo[b.id])
      .forEach((n) => {
        parentsOf[n.id].forEach((pid) => {
          const par = nodeById[pid];
          if (!par) return;
          const minX = par.x + par.w + NODE_GAP;
          if (n.x < minX) n.x = minX;
        });
      });
  }

  // General 2D collision avoidance: process left-to-right, top-to-bottom and
  // push any node down past whatever it would otherwise overlap. Works the
  // same regardless of x-axis mode (stage columns or real dates), unlike the
  // old per-generation-column-only spacing which never accounted for two
  // different branches landing at the same pixel in date mode.
  const ordered = [...nodes].sort((a, b) => a.x - b.x || a.y - b.y);
  const placed: typeof nodes = [];
  ordered.forEach((n) => {
    let shifted = true;
    while (shifted) {
      shifted = false;
      for (const other of placed) {
        const xOverlap = n.x < other.x + other.w + NODE_GAP && n.x + n.w + NODE_GAP > other.x;
        const yOverlap = n.y < other.y + other.h + NODE_GAP && n.y + n.h + NODE_GAP > other.y;
        if (xOverlap && yOverlap) { n.y = other.y + other.h + NODE_GAP; shifted = true; }
      }
    }
    placed.push(n);
  });

  let maxY = 0;
  nodes.forEach((n) => { if (n.y + n.h > maxY) maxY = n.y + n.h; });

  const nodeMap: Record<string, (typeof nodes)[number]> = {};
  nodes.forEach((n) => { nodeMap[n.id] = n; });
  const links = activeEdges;
  let maxX = 0;
  nodes.forEach((n) => { if (n.x + n.w > maxX) maxX = n.x + n.w; });
  const flowW = p.xAxisMode === 'date'
    ? Math.max(PADX + totalDays * pxPerDay + NW + PADX, maxX + PADX)
    : (maxGen + 1) * COLW + PADX;
  const flowH = maxY + PADY + 24;
  const nodeVMs: FlowNodeVM[] = nodes.map((n) => {
    const owner = ownerOf(n.sub);
    const isSrc = n.type === 'src';
    const dashed = n.type === 'exit' || n.type === 'merge' || n.type === 'expense';
    const hasOwner = !!owner && !isSrc && !dashed;
    // "New money" (external income/interest, not moved from an existing tracked
    // account) gets its own green identity — fill + border — instead of the
    // neutral gray other un-owned nodes use, so it reads as distinctly "new."
    const c = hasOwner ? ownerColor(owner) : isSrc ? NEW_MONEY_COLOR : (n.type === 'expense' ? '#B26B4E' : '#9AA0A6');
    const isSel = sel === n.id;
    const borderC = mixHex(c, '#000000', 0.18);
    const typeC = colorOf(n.type);
    const bg = isSrc ? mixHex(NEW_MONEY_COLOR, '#FFFFFF', 0.85) : '#FFFFFF';
    return {
      id: n.id,
      isSel,
      amount: fmt(n.amount),
      sub: n.sub,
      subParts: splitLabelParts(n.sub),
      tag: ASSET_TAG[n.type],
      dateLabel: dueLabelTH(n.date),
      amountStyle: { fontFamily: "'Lora',serif", fontWeight: 700, fontSize: 12.5, color: 'var(--ink,#2C2A23)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 },
      subStyle: { fontSize: 9.5, color: 'var(--muted2,#6B6356)', lineHeight: 1.25 },
      boxStyle: {
        position: 'absolute', left: n.x, top: n.y, width: n.w, height: n.h, overflow: 'hidden',
        background: bg, color: borderC,
        border: (dashed ? '1.5px dashed ' : '1.5px solid ') + borderC,
        borderRadius: 8, padding: `5px 8px 5px ${STRIP_W + 6}px`, boxSizing: 'border-box',
        boxShadow: isSrc
          ? ('0 0 0 3px ' + bg + ', 0 0 0 4.5px ' + borderC + (isSel ? ', 0 4px 14px rgba(60,50,30,0.22)' : ''))
          : (isSel ? '0 4px 14px rgba(60,50,30,0.22)' : '0 1px 3px rgba(60,50,30,0.07)'),
        outline: isSel && !isSrc ? '2px solid ' + borderC : 'none',
        outlineOffset: 2,
        cursor: 'pointer',
      },
      stripStyle: {
        position: 'absolute', left: 0, top: 0, bottom: 0, width: STRIP_W,
        background: mixHex(typeC, '#FFFFFF', 0.6),
        borderRight: '1px solid ' + mixHex(typeC, '#000000', 0.15),
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      },
      tagStyle: {
        display: 'inline-block', whiteSpace: 'nowrap', transform: 'rotate(-90deg)',
        fontSize: 9, fontWeight: 700, color: mixHex(typeC, '#000000', 0.4), letterSpacing: '0.02em',
      },
    };
  });

  const linkVMs: FlowLinkVM[] = links
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
    const gridStyle = (x: number): CSSProperties => ({ position: 'absolute', left: x, top: 16, bottom: 0, width: 1, background: 'var(--border2,#E2D9C8)', opacity: 0.5 });
    const labelStyle = (x: number): CSSProperties => ({ position: 'absolute', left: x, top: -2, fontSize: 12, fontWeight: 700, color: 'var(--muted,#9A917F)', letterSpacing: '0.03em' });
    if (p.dateStep === 'week' || p.dateStep === '2week') {
      const stepDays = p.dateStep === 'week' ? 7 : 14;
      let dayOffset = 0, guard = 0;
      while (dayOffset <= totalDays && guard < 300) {
        guard++;
        const cur = new Date(start.getTime() + dayOffset * 86400000);
        const x = PADX + dayOffset * pxPerDay;
        const label = cur.getDate() + ' ' + thMon()[cur.getMonth()];
        stages.push({ label, style: labelStyle(x) });
        gridLines.push(gridStyle(x));
        dayOffset += stepDays;
      }
    } else {
      const stepMonths = STEP_MONTHS_BY_STEP[p.dateStep] ?? 1;
      const cur = new Date(start.getFullYear(), start.getMonth(), 1);
      let guard = 0;
      while (cur.getTime() <= end.getTime() && guard < 200) {
        guard++;
        const dayOffset = Math.round((cur.getTime() - start.getTime()) / 86400000);
        const x = PADX + Math.max(0, dayOffset) * pxPerDay;
        const label = thMon()[cur.getMonth()] + ' ' + ((cur.getFullYear() + 543) % 100);
        stages.push({ label, style: labelStyle(x) });
        gridLines.push(gridStyle(x));
        cur.setMonth(cur.getMonth() + stepMonths);
      }
    }
  } else {
    stages = Array.from({ length: maxGen + 1 }, (_, g) => ({
      label: g === 0 ? 'ต้นทาง' : (g === maxGen ? 'ปัจจุบัน' : 'ขั้นที่ ' + (g + 1)),
      style: { position: 'absolute', left: g * COLW + PADX, top: -2, fontSize: 12, fontWeight: 700, color: 'var(--muted,#9A917F)', letterSpacing: '0.03em' },
    }));
    gridLines = [];
  }

  // List every known family owner, not just ones with an existing asset —
  // otherwise someone with zero assets so far (e.g. a newly-added owner)
  // would never appear as a filter option.
  const ownerOptions = [...KNOWN_OWNERS].sort();

  return {
    nodes: nodeVMs,
    links: linkVMs,
    stages,
    gridLines,
    zones,
    ownerLegend,
    typeLegend,
    ownerOptions,
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
