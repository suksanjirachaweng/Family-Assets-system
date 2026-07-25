import type { FlowGraph, FlowNode, MoveLeg } from './types';
import type { MoveRecord } from '@/api/client';

/**
 * Turns real recorded moves (each with structured source/destination legs +
 * an alloc map, see MoveView's saveMove) into the Sankey node/edge graph.
 * Real assets are deduped by their real asset id, so the same account shows
 * as one connected node across multiple moves over time (e.g. money that
 * lands in an account today can later appear as that same node when it's
 * used as a source in a future move). One-off legs — new external income
 * ('src') or money leaving the portfolio ('exit') — aren't reusable accounts,
 * so they're scoped per-move to avoid unrelated moves colliding.
 */
export function buildFlowGraph(moves: MoveRecord[]): FlowGraph {
  const nodes: FlowNode[] = [];
  const seen: Record<string, true> = {};
  const edges: [string, string][] = [];

  const nodeId = (moveId: string, leg: MoveLeg) =>
    leg.type === 'src' || leg.type === 'exit' ? `${moveId}:${leg.id}` : leg.id;

  const addLeg = (moveId: string, leg: MoveLeg) => {
    const id = nodeId(moveId, leg);
    if (!seen[id]) {
      seen[id] = true;
      nodes.push({ id, type: leg.type, amount: leg.amount, label: leg.label, date: leg.date });
    }
    return id;
  };

  moves.forEach((m) => {
    if (!m.sources?.length || !m.destinations?.length) return;
    const moveId = m.id || '';
    const srcIds: Record<string, string> = {};
    const dstIds: Record<string, string> = {};
    m.sources.forEach((s) => { srcIds[s.id] = addLeg(moveId, s); });
    m.destinations.forEach((d) => { dstIds[d.id] = addLeg(moveId, d); });
    Object.entries(m.alloc || {}).forEach(([key, amount]) => {
      if (!amount) return;
      const [destId, srcId] = key.split('|');
      const from = srcIds[srcId], to = dstIds[destId];
      if (from && to) edges.push([from, to]);
    });
  });

  return { nodes, edges };
}
