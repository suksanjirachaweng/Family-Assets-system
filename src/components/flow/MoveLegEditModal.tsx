import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { MoveRecord } from '@/api/client';
import type { MoveLeg } from '@/data/types';
import { fmt } from '@/lib/format';
import * as api from '@/api/client';

type LegSide = 'sources' | 'destinations';

/** Finds which move (and which side/leg) owns a double-clicked flow node.
 *
 *  A "src"/"exit" leg's flow-graph node id is `${moveId}:${leg.id}` (see
 *  buildFlowGraph, which scopes those per-move so unrelated moves don't
 *  collide) — the moveId is embedded right in it, so split it out and look
 *  up that exact move+leg directly, no ambiguity possible.
 *
 *  Every other leg type's node id is just the real asset id, which — being
 *  reused across every move that ever touched that account — can appear in
 *  more than one move over its history. The node's own raw date narrows it
 *  down to the specific occurrence that was actually clicked; if no move has
 *  that exact date (e.g. a date fixed after the node was drawn), fall back
 *  to the first id-only match. */
export function findLeg(moves: MoveRecord[], nodeId: string, date: string): { move: MoveRecord; side: LegSide; leg: MoveLeg } | null {
  const colon = nodeId.indexOf(':');
  if (colon >= 0) {
    const moveId = nodeId.slice(0, colon);
    const legId = nodeId.slice(colon + 1);
    const move = moves.find((m) => m.id === moveId);
    if (!move) return null;
    const s = move.sources?.find((l) => l.id === legId);
    if (s) return { move, side: 'sources', leg: s };
    const d = move.destinations?.find((l) => l.id === legId);
    if (d) return { move, side: 'destinations', leg: d };
    return null;
  }
  for (const move of moves) {
    const s = move.sources?.find((l) => l.id === nodeId && l.date === date);
    if (s) return { move, side: 'sources', leg: s };
    const d = move.destinations?.find((l) => l.id === nodeId && l.date === date);
    if (d) return { move, side: 'destinations', leg: d };
  }
  for (const move of moves) {
    const s = move.sources?.find((l) => l.id === nodeId);
    if (s) return { move, side: 'sources', leg: s };
    const d = move.destinations?.find((l) => l.id === nodeId);
    if (d) return { move, side: 'destinations', leg: d };
  }
  return null;
}

/** Opened by double-clicking a box in the money-flow diagram — lets the user
 *  correct that specific leg's date/amount directly, without needing to
 *  delete and re-record the whole move by hand (or ask for it in chat). */
export function MoveLegEditModal() {
  const node = useAppStore((s) => s.editingFlowNode);
  const moves = useAppStore((s) => s.moves);
  const patch = useAppStore((s) => s.patch);
  const loadData = useAppStore((s) => s.loadData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!node) return null;
  const close = () => patch({ editingFlowNode: null });

  const found = findLeg(moves, node.id, node.date);
  if (!found) {
    // Shouldn't normally happen — FlowView only opens this for nodes it
    // already confirmed belong to some move — but close cleanly if the
    // underlying move history changed (e.g. deleted) since the click.
    close();
    return null;
  }
  const { move, side, leg } = found;

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const newAmount = Math.max(0, Math.round(Number(String(f.get('amount')).replace(/[^0-9.]/g, '')) || 0));
    const newDate = String(f.get('date') || leg.date);

    const patchLegs = (legs: MoveLeg[] | undefined) =>
      (legs || []).map((l) => (l === leg ? { ...l, amount: newAmount, date: newDate } : l));
    const sources = side === 'sources' ? patchLegs(move.sources) : move.sources;
    const destinations = side === 'destinations' ? patchLegs(move.destinations) : move.destinations;

    setSaving(true);
    setError(null);
    try {
      await api.updateMove({ id: move.id!, title: move.title, detail: move.detail, sources, destinations, alloc: move.alloc });
      await loadData();
      close();
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,42,33,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
      <form onSubmit={onSubmit} style={{ background: 'var(--surface,#FBF8F1)', borderRadius: 18, width: '100%', maxWidth: 420, boxShadow: '0 24px 60px rgba(20,16,8,0.3)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border,#E8E0CF)' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>แก้ไขรายการในเส้นทางเงิน</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted,#9A917F)' }}>{move.title}</div>
          </div>
          <button type="button" onClick={close} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border2,#E2D9C8)', background: 'var(--surface2,#fff)', cursor: 'pointer', fontSize: 14, color: 'var(--muted2,#6B6356)' }}>✕</button>
        </div>

        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 12.5, color: 'var(--muted,#9A917F)', marginBottom: 4 }}>รายการ</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{leg.label}</div>
            <div style={{ fontSize: 12, color: 'var(--muted,#9A917F)' }}>{side === 'sources' ? 'ต้นทาง' : 'ปลายทาง'} · เดิม {fmt(leg.amount)} · {leg.date}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, color: 'var(--muted,#9A917F)', marginBottom: 6 }}>จำนวนเงิน (บาท)</label>
              <input name="amount" defaultValue={leg.amount} style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--border2,#E2D9C8)', borderRadius: 10, background: 'var(--surface2,#fff)', fontFamily: "'IBM Plex Sans Thai',sans-serif", fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, color: 'var(--muted,#9A917F)', marginBottom: 6 }}>วันที่</label>
              <input name="date" type="date" defaultValue={leg.date} style={{ width: '100%', padding: '9px 13px', border: '1px solid var(--border2,#E2D9C8)', borderRadius: 10, background: 'var(--surface2,#fff)', fontFamily: "'IBM Plex Sans Thai',sans-serif", fontSize: 14, boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted,#9A917F)' }}>แก้ไขเฉพาะรายการนี้ในเส้นทางเงิน — ไม่กระทบยอดสินทรัพย์จริงของบัญชี</div>
          {error && <div style={{ color: '#C0392B', fontSize: 13 }}>บันทึกไม่สำเร็จ: {error}</div>}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '16px 22px', borderTop: '1px solid var(--border,#E8E0CF)' }}>
          <button type="button" onClick={close} style={{ background: 'var(--surface2,#fff)', border: '1px solid var(--border2,#E2D9C8)', color: 'var(--muted2,#6B6356)', borderRadius: 10, padding: '11px 20px', fontFamily: "'IBM Plex Sans Thai'", fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>ยกเลิก</button>
          <button type="submit" disabled={saving} style={{ background: 'var(--accent,#5E7350)', border: 'none', color: 'var(--on-accent,#FBF8F1)', borderRadius: 10, padding: '11px 22px', fontFamily: "'IBM Plex Sans Thai'", fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>{saving ? 'กำลังบันทึก…' : 'บันทึกการแก้ไข'}</button>
        </div>
      </form>
    </div>
  );
}
