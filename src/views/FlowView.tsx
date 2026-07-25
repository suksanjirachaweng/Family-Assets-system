import { useMemo } from 'react';
import { useAppStore, type FlowDateStep, type FlowRange } from '@/store/useAppStore';
import { computeFlow } from '@/lib/flowLayout';
import { BankBadge } from '@/components/common/BankBadge';

export function FlowView() {
  const moves = useAppStore((s) => s.moves);
  const assets = useAppStore((s) => s.assets);
  const flowSel = useAppStore((s) => s.flowSel);
  const flowRange = useAppStore((s) => s.flowRange);
  const flowFrom = useAppStore((s) => s.flowFrom);
  const flowTo = useAppStore((s) => s.flowTo);
  const flowZoom = useAppStore((s) => s.flowZoom);
  const flowXAxis = useAppStore((s) => s.flowXAxis);
  const flowDateStep = useAppStore((s) => s.flowDateStep);
  const flowOwnerFilter = useAppStore((s) => s.flowOwnerFilter);
  const set = useAppStore((s) => s.set);
  const patch = useAppStore((s) => s.patch);

  const flow = useMemo(
    () => computeFlow({ moves, assets, flowSel, flowRange, flowFrom, flowTo, xAxisMode: flowXAxis, dateStep: flowDateStep, ownerFilter: flowOwnerFilter }),
    [moves, assets, flowSel, flowRange, flowFrom, flowTo, flowXAxis, flowDateStep, flowOwnerFilter],
  );

  const hasDateFilter = !!(flowFrom || flowTo);

  return (
    <section>
      <div style={{ marginBottom: 8 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>เส้นทางการโยกย้ายเงิน</h1>
        <EnSub text="Money flow" />
      </div>

      {flow.nodeTotal === 0 ? (
        <div style={{ background: 'var(--surface,#FBF8F1)', border: '1px solid var(--border,#E8E0CF)', borderRadius: 16, padding: '48px 24px', textAlign: 'center', color: 'var(--muted,#9A917F)' }}>
          <div style={{ fontSize: 15, marginBottom: 6 }}>ยังไม่มีประวัติการโยกย้ายเงิน</div>
          <div style={{ fontSize: 13 }}>เริ่มบันทึกได้ที่หน้า "ขาย / ย้ายเงิน" — ผังนี้จะแสดงเส้นทางตามรายการที่บันทึกไว้จริง</div>
        </div>
      ) : (
      <>
      {/* toolbar stays pinned below the app header while the (often very tall) diagram scrolls */}
      <div style={{ position: 'sticky', top: 130, zIndex: 15, background: 'var(--bg,#F4EFE6)', paddingTop: 6, marginTop: -6 }}>
      {/* toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'var(--surface,#FBF8F1)', border: '1px solid var(--border2,#E2D9C8)', borderRadius: 10, padding: 3 }}>
          <button onClick={() => set('flowZoom', Math.max(0.5, Math.round((flowZoom - 0.15) * 100) / 100))} style={zoomBtn}>−</button>
          <span style={{ minWidth: 48, textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--text,#4A4538)', fontVariantNumeric: 'tabular-nums' }}>{Math.round(flowZoom * 100)}%</span>
          <button onClick={() => set('flowZoom', Math.min(1.6, Math.round((flowZoom + 0.15) * 100) / 100))} style={zoomBtn}>+</button>
        </div>
        <button onClick={() => patch({ flowZoom: 1, flowSel: null })} style={{ background: 'var(--surface,#FBF8F1)', border: '1px solid var(--border2,#E2D9C8)', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontFamily: "'IBM Plex Sans Thai'", fontSize: 13, color: 'var(--muted2,#6B6356)', fontWeight: 500 }}>รีเซ็ต</button>
        <div style={{ width: 1, height: 26, background: '#E2D9C8' }} />
        <div style={{ display: 'flex', background: 'var(--surface,#FBF8F1)', border: '1px solid var(--border2,#E2D9C8)', borderRadius: 10, padding: 3 }}>
          {(['stage', 'date'] as const).map((m) => {
            const active = flowXAxis === m;
            return (
              <button
                key={m}
                onClick={() => set('flowXAxis', m)}
                style={{ padding: '6px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Sans Thai',sans-serif", fontSize: 13, fontWeight: 700, background: active ? '#5E7350' : 'transparent', color: active ? '#FBF8F1' : '#6B6356' }}
              >
                {m === 'stage' ? 'ขั้นที่' : 'วันที่'}
              </button>
            );
          })}
        </div>
        {flowXAxis === 'date' && (
          <>
            <div style={{ width: 1, height: 26, background: '#E2D9C8' }} />
            <select
              value={flowDateStep}
              onChange={(e) => set('flowDateStep', e.target.value as FlowDateStep)}
              style={selectStyle}
            >
              <option value="week">ช่องละ 1 สัปดาห์</option>
              <option value="2week">ช่องละ 2 สัปดาห์</option>
              <option value="month">ช่องละ 1 เดือน</option>
              <option value="3month">ช่องละ 3 เดือน</option>
              <option value="6month">ช่องละ 6 เดือน</option>
              <option value="year">ช่องละ 1 ปี</option>
            </select>
          </>
        )}
        <div style={{ width: 1, height: 26, background: '#E2D9C8' }} />
        <select
          value={flowRange ?? ''}
          onChange={(e) => patch({ flowRange: e.target.value as FlowRange, flowFrom: '', flowTo: '' })}
          style={selectStyle}
        >
          {flowRange === null && <option value="">กำหนดเอง</option>}
          <option value="1Y">1Y</option>
          <option value="3Y">3Y</option>
          <option value="5Y">5Y</option>
          <option value="ALL">ALL</option>
        </select>
        <div style={{ width: 1, height: 26, background: '#E2D9C8' }} />
        <select
          value={flowOwnerFilter ?? ''}
          onChange={(e) => set('flowOwnerFilter', e.target.value || null)}
          style={selectStyle}
        >
          <option value="">แสดงทุกเจ้าของ</option>
          {flow.ownerOptions.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--surface,#FBF8F1)', border: '1px solid var(--border2,#E2D9C8)', borderRadius: 10, padding: '5px 11px' }}>
          <span style={{ fontSize: 13, color: 'var(--muted,#9A917F)' }}>ช่วงวันที่</span>
          <input type="date" value={flow.fromVal} min={flow.minDate} max={flow.maxDate} onChange={(e) => patch({ flowFrom: e.target.value, flowRange: null })} style={dateInput} />
          <span style={{ fontSize: 13, color: 'var(--muted,#9A917F)' }}>ถึง</span>
          <input type="date" value={flow.toVal} min={flow.minDate} max={flow.maxDate} onChange={(e) => patch({ flowTo: e.target.value, flowRange: null })} style={dateInput} />
          {hasDateFilter && (
            <button onClick={() => patch({ flowFrom: '', flowTo: '', flowRange: '1Y' })} style={{ width: 22, height: 22, border: 'none', background: '#B26B4E', color: 'var(--on-accent,#FBF8F1)', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>✕</button>
          )}
        </div>
        {flowSel ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'var(--accent-soft,#EEF2E8)', border: '1px solid #CBD9BC', borderRadius: 10, padding: '7px 9px 7px 14px' }}>
            <span style={{ fontSize: 13, color: 'var(--ink,#3C4A33)' }}>กำลังดูเส้นทางของ: <strong>{flow.selLabel}</strong></span>
            <button onClick={() => set('flowSel', null)} style={{ width: 22, height: 22, border: 'none', background: 'var(--accent,#5E7350)', color: 'var(--on-accent,#FBF8F1)', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>✕</button>
          </div>
        ) : (
          <span style={{ fontSize: 12.5, color: 'var(--muted,#A89F8C)' }}>คลิกที่กล่องใดๆ เพื่อดูเฉพาะเส้นทางของบัญชีนั้น</span>
        )}
      </div>
      </div>

      {/* canvas */}
      <div className="fa-scroll" style={{ background: 'var(--surface,#FBF8F1)', border: '1px solid var(--border,#E8E0CF)', borderRadius: 16, padding: 18, overflow: 'auto' }}>
        <div style={{ display: 'inline-block' }}>
          <div style={{ position: 'relative', width: flow.flowW, height: flow.flowH, zoom: flowZoom }}>
            {flow.stages.map((st, i) => (
              <div key={i} style={st.style}>{st.label}</div>
            ))}
            {flow.gridLines.map((gl, i) => (
              <div key={i} style={gl} />
            ))}
            <svg width={flow.flowW} height={flow.flowH} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}>
              {flow.links.map((lk, i) => (
                <path key={i} d={lk.d} fill="none" stroke={lk.color} strokeWidth={2} strokeDasharray={lk.dash} />
              ))}
              {flow.links.map((lk, i) => (
                <circle key={'c' + i} cx={lk.tx} cy={lk.ty} r={3.5} fill={lk.color} />
              ))}
            </svg>
            {flow.nodes.map((n) => (
              <div
                key={n.id}
                title={n.sub}
                onClick={() => set('flowSel', n.isSel ? null : n.id)}
                style={n.boxStyle}
              >
                <div style={n.stripStyle}><span style={n.tagStyle}>{n.tag}</span></div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
                  <div style={n.amountStyle}>{n.amount}</div>
                  <div style={{ fontSize: 9, color: 'var(--muted,#A89F8C)', whiteSpace: 'nowrap', flexShrink: 0 }}>{n.dateLabel}</div>
                </div>
                <div style={{ ...n.subStyle, display: 'flex', alignItems: 'flex-start', gap: 4, minWidth: 0 }}>
                  <span style={{ flexShrink: 0, marginTop: 1 }}><BankBadge text={n.sub} size={11} /></span>
                  <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{n.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--muted,#9A917F)', marginTop: 12 }}>
        แสดง {flow.treeCount} เส้นทางการโยกย้าย · {flow.nodeTotal} รายการในผัง — คลิกกล่องเพื่อดูเฉพาะเส้นทางของบัญชีนั้น · เลือกช่วงวันที่เพื่อกรองตามช่วงเวลา
      </div>
      </>
      )}
    </section>
  );
}

const zoomBtn: React.CSSProperties = { width: 32, height: 32, border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--muted2,#6B6356)', borderRadius: 7 };
const dateInput: React.CSSProperties = { border: '1px solid var(--border2,#E2D9C8)', borderRadius: 7, padding: '5px 8px', fontFamily: "'IBM Plex Sans Thai',sans-serif", fontSize: 13, color: 'var(--text,#2C2A23)', background: 'var(--surface2,#fff)' };
const selectStyle: React.CSSProperties = { border: '1px solid var(--border2,#E2D9C8)', borderRadius: 10, padding: '8px 10px', fontFamily: "'IBM Plex Sans Thai',sans-serif", fontSize: 13, fontWeight: 600, color: 'var(--text,#2C2A23)', background: 'var(--surface,#FBF8F1)', cursor: 'pointer' };

function EnSub({ text }: { text: string }) {
  const showEnglish = useAppStore((s) => s.showEnglish);
  if (!showEnglish) return null;
  return <div style={{ fontFamily: "'Lora',serif", fontStyle: 'italic', color: 'var(--muted,#A39A87)', fontSize: 14 }}>{text}</div>;
}
