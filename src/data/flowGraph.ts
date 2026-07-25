import type { FlowGraph } from './types';

/**
 * Money-flow graph. Previously held hardcoded sample data ported from the
 * design prototype; that never reflected real assets/moves, so it's been
 * cleared out. This view has no real data source yet — it needs to be wired
 * up to recorded "ขาย/ย้ายเงิน" moves once that history starts accumulating.
 */
export function buildFlowGraph(_expenseExpanded: boolean): FlowGraph {
  return { nodes: [], edges: [] };
}
