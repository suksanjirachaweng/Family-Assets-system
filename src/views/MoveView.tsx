import { useMemo, useState } from 'react';
import { useAppStore, type AllocMap } from '@/store/useAppStore';
import type { Asset, AssetType, RawAsset, MoveLeg, FlowNodeType } from '@/data/types';
import { netInterest, assetsWithDue, decorateAssets } from '@/lib/assets';
import { fmt, dueLabelTH, todayISO } from '@/lib/format';
import { ScreenTitle } from '@/components/common/ScreenTitle';
import { BankBadge } from '@/components/common/BankBadge';
import { AssetFormFields } from '@/components/form/AssetFormFields';
import { buildRawAssetFromForm, destinationCost } from '@/lib/assetForm';
import * as api from '@/api/client';

interface DestDef { id: string; typeLabel: string; color: string; name: string; target: number; detail: string; isExtra?: boolean }
interface MatCandEntry { id: string; name: string; subLabel: string; breakLabel: string; totalFmt: string; totalVal: number; sel: boolean; isExtra?: boolean }

/** Builds the selectable-source-card fields for any existing asset, regardless of whether it has a due date. */
function buildMatCandEntry(a: Asset, isExtra: boolean) {
  const hasMaturity = (a.type === 'fd' || a.type === 'bond' || a.type === 'sav') && !!a.due;
  const interest = hasMaturity ? netInterest(a) : 0;
  const totalM = a.amount + interest;
  let subLabel: string, breakLabel: string;
  if (hasMaturity) {
    subLabel = a.owners.join(' · ') + ' · ครบ ' + dueLabelTH(a.due!);
    breakLabel = 'เงินต้น ' + fmt(a.amount) + ' + ดอกเบี้ยสุทธิ ' + fmt(interest);
  } else if (a.type === 'fund') {
    subLabel = a.owners.join(' · ') + ' · ขาย / ไถ่ถอนหน่วยลงทุน';
    breakLabel = 'มูลค่าตลาด · ' + (a.units ?? 0).toLocaleString('en-US') + ' หน่วย × NAV ฿' + (a.navNow ?? 0).toFixed(4);
  } else if (a.type === 'gold') {
    subLabel = a.owners.join(' · ') + ' · ขายทองคำ';
    breakLabel = 'มูลค่าตามราคาตลาดวันนี้ · ' + a.goldBaht + ' บาททอง';
  } else if (a.type === 'stock') {
    subLabel = a.owners.join(' · ') + ' · ขายหุ้น';
    breakLabel = 'มูลค่าตลาด · ' + (a.shares ?? 0).toLocaleString('en-US') + ' หุ้น × ฿' + (a.priceNow ?? 0).toFixed(2);
  } else if (a.type === 'land') {
    subLabel = a.owners.join(' · ') + ' · ขาย / โอนกรรมสิทธิ์';
    breakLabel = 'ราคาประเมิน ' + fmt(a.appraisal ?? 0);
  } else {
    subLabel = a.owners.join(' · ') + ' · โยกย้าย';
    breakLabel = 'ยอดคงเหลือในบัญชี';
  }
  return { id: a.id, name: a.name, subLabel, breakLabel, totalFmt: fmt(totalM), totalVal: totalM, isExtra };
}

/** One-line summary shown on a freshly-drafted destination card, before it's saved as a real asset. */
function describeNewDestination(a: Asset): string {
  const owners = a.owners.join(' · ');
  if (a.type === 'fd' || a.type === 'sav' || a.type === 'bond') {
    const parts = [owners];
    if (a.rate) parts.push('อัตรา ' + a.rate.toFixed(2) + '%');
    if (a.due) parts.push('ครบ ' + dueLabelTH(a.due));
    if (a.iAcct) parts.push('ดอกเบี้ยเข้า ' + a.iAcct.bank + ' ' + a.iAcct.no);
    return parts.join(' · ');
  }
  if (a.type === 'fund') return `${owners} · ${(a.units ?? 0).toLocaleString('en-US')} หน่วย · NAV ซื้อ ฿${(a.navBuy ?? 0).toFixed(4)}`;
  if (a.type === 'gold') return `${owners} · ${a.goldBaht} บาททอง · เก็บที่ ${a.acctNo}`;
  if (a.type === 'stock') return `${owners} · ${(a.shares ?? 0).toLocaleString('en-US')} หุ้น · ราคาทุน ฿${(a.priceBuy ?? 0).toFixed(2)}`;
  if (a.type === 'land') return `${owners} · โฉนด ${a.deedNo || '—'}`;
  return `${owners} · ${a.otherCat || 'อื่นๆ'}`;
}

export function MoveView() {
  const matSel = useAppStore((s) => s.matSel);
  const moveTarget = useAppStore((s) => s.moveTarget);
  const alloc = useAppStore((s) => s.alloc);
  const toggleMatSel = useAppStore((s) => s.toggleMatSel);
  const set = useAppStore((s) => s.set);
  const loadData = useAppStore((s) => s.loadData);
  const moves = useAppStore((s) => s.moves);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [extraIncomes, setExtraIncomes] = useState<{ id: string; name: string; amount: number }[]>([]);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [incomeName, setIncomeName] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');

  const addIncome = () => {
    const amt = Number(incomeAmount.replace(/[^0-9.]/g, ''));
    if (!incomeName.trim() || !amt) return;
    const id = 'ext' + Date.now();
    setExtraIncomes((prev) => [...prev, { id, name: incomeName.trim(), amount: amt }]);
    toggleMatSel(id);
    setIncomeName('');
    setIncomeAmount('');
    setShowAddIncome(false);
  };
  const removeIncome = (id: string) => {
    setExtraIncomes((prev) => prev.filter((e) => e.id !== id));
    if (matSel.includes(id)) toggleMatSel(id);
  };

  const [manualSourceIds, setManualSourceIds] = useState<string[]>([]);
  const [showAddSource, setShowAddSource] = useState(false);
  const addSourceAsset = (id: string) => {
    setManualSourceIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    if (!matSel.includes(id)) toggleMatSel(id);
    setShowAddSource(false);
  };
  const removeManualSource = (id: string) => {
    setManualSourceIds((prev) => prev.filter((x) => x !== id));
    if (matSel.includes(id)) toggleMatSel(id);
  };
  const removeAnySource = (id: string) => {
    if (extraIncomes.some((e) => e.id === id)) { removeIncome(id); return; }
    removeManualSource(id);
  };

  /** Per-item withdrawal/deposit dates — each source or destination may clear on a different
   *  calendar day, so they're not forced to share one date the way `recordMove_` timestamps
   *  the overall history entry. Both default to today until the user picks a different date. */
  const [sourceDates, setSourceDates] = useState<Record<string, string>>({});
  const [destDates, setDestDates] = useState<Record<string, string>>({});
  const getSourceDate = (id: string) => sourceDates[id] ?? todayISO();
  const getDestDate = (id: string) => destDates[id] ?? todayISO();
  const setSourceDate = (id: string, date: string) => setSourceDates((prev) => ({ ...prev, [id]: date }));
  const setDestDate = (id: string, date: string) => setDestDates((prev) => ({ ...prev, [id]: date }));

  const [extraExpenses, setExtraExpenses] = useState<DestDef[]>([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  const clearAllocFor = (destId: string) => {
    set('alloc', (() => {
      if (!alloc) return alloc;
      const next: AllocMap = {};
      Object.keys(alloc).forEach((k) => { if (!k.startsWith(destId + '|')) next[k] = alloc[k]; });
      return next;
    })());
  };
  const addExpense = () => {
    const amt = Number(expenseAmount.replace(/[^0-9.]/g, ''));
    if (!expenseName.trim() || !amt) return;
    const id = 'exp' + Date.now();
    setExtraExpenses((prev) => [...prev, {
      id, typeLabel: 'ค่าใช้จ่าย', color: '#B26B4E', name: expenseName.trim(),
      target: amt, detail: 'เงินออกจากพอร์ต · ไม่ผูกบัญชีปลายทาง', isExtra: true,
    }]);
    setExpenseName('');
    setExpenseAmount('');
    setShowAddExpense(false);
  };
  const removeExpense = (id: string) => {
    setExtraExpenses((prev) => prev.filter((e) => e.id !== id));
    clearAllocFor(id);
  };

  const upsertLocalAsset = useAppStore((s) => s.upsertLocalAsset);
  const assets = useAppStore((s) => s.assets);
  const [newDestinations, setNewDestinations] = useState<{ id: string; raw: RawAsset; asset: Asset; target: number }[]>([]);
  const [showAddDest, setShowAddDest] = useState(false);
  const [destType, setDestType] = useState<AssetType>('fd');
  const [destOwners, setDestOwners] = useState<string[]>(['วิวัฒน์']);
  const toggleDestOwner = (p: string) => setDestOwners((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const addDestination = (f: FormData) => {
    const id = 'newdest' + Date.now();
    const raw = buildRawAssetFromForm(f, destType, destOwners, id);
    const [decorated] = decorateAssets([raw]);
    const target = destinationCost(raw, decorated.amount);
    setNewDestinations((prev) => [...prev, { id, raw, asset: decorated, target }]);
    setShowAddDest(false);
    setDestType('fd');
    setDestOwners(['วิวัฒน์']);
  };
  const removeDestination = (id: string) => {
    setNewDestinations((prev) => prev.filter((n) => n.id !== id));
    clearAllocFor(id);
  };
  const [topUps, setTopUps] = useState<{ existingId: string; asset: Asset; addAmount: number }[]>([]);
  const addTopUp = (existingId: string, addAmount: number) => {
    const asset = assets.find((a) => a.id === existingId);
    if (!asset || !addAmount) return;
    setTopUps((prev) => [...prev.filter((t) => t.existingId !== existingId), { existingId, asset, addAmount }]);
    setShowAddDest(false);
  };
  const removeTopUp = (existingId: string) => {
    setTopUps((prev) => prev.filter((t) => t.existingId !== existingId));
    clearAllocFor(existingId);
  };
  const removeAnyDest = (id: string) => {
    if (extraExpenses.some((e) => e.id === id)) { removeExpense(id); return; }
    if (topUps.some((t) => t.existingId === id)) { removeTopUp(id); return; }
    removeDestination(id);
  };

  const withDue = useMemo(() => assetsWithDue(assets), [assets]);
  const sortedMoves = useMemo(() => [...moves].sort((a, b) => (a.date < b.date ? 1 : -1)), [moves]);

  let autoCandSources: Asset[] = withDue.filter((x) => x.days <= 200).slice(0, 4).map((x) => x.a);
  if (moveTarget) {
    const tgt = assets.find((a) => a.id === moveTarget);
    if (tgt && !autoCandSources.some((a) => a.id === tgt.id)) autoCandSources = [tgt].concat(autoCandSources);
  }
  const manualSourceAssets = manualSourceIds
    .map((id) => assets.find((a) => a.id === id))
    .filter((a): a is Asset => !!a && !autoCandSources.some((c) => c.id === a.id));

  const matCandMaturity = autoCandSources.map((a) => ({ ...buildMatCandEntry(a, false), sel: matSel.includes(a.id) }));
  const matCandManual = manualSourceAssets.map((a) => ({ ...buildMatCandEntry(a, true), sel: matSel.includes(a.id) }));
  const matCandIncome = extraIncomes.map((e) => ({
    id: e.id,
    name: e.name,
    subLabel: 'รายได้ใหม่จากภายนอก',
    breakLabel: 'เงินที่ได้รับทั้งหมด',
    totalFmt: fmt(e.amount),
    totalVal: e.amount,
    sel: matSel.includes(e.id),
    isExtra: true,
  }));

  const matCand = [...matCandMaturity, ...matCandManual, ...matCandIncome];

  const destDefs: DestDef[] = useMemo(
    () => [
      ...extraExpenses,
      ...newDestinations.map((nd) => ({
        id: nd.id, typeLabel: nd.asset.typeLabel, color: nd.asset.color, name: nd.asset.name,
        target: nd.target, detail: describeNewDestination(nd.asset), isExtra: true,
      })),
      ...topUps.map((t) => ({
        id: t.existingId, typeLabel: t.asset.typeLabel, color: t.asset.color, name: t.asset.name,
        target: t.addAmount, detail: `เพิ่มเข้ายอดเดิม ${fmt(t.asset.amount)} → รวมเป็น ${fmt(t.asset.amount + t.addAmount)}`,
        isExtra: true,
      })),
    ],
    [extraExpenses, newDestinations, topUps],
  );

  const matTotal = matCand.filter((m) => matSel.includes(m.id)).reduce((s, m) => s + m.totalVal, 0);
  const selSources = matCand.filter((m) => matSel.includes(m.id)).map((m) => ({ id: m.id, name: m.name, total: m.totalVal }));

  const effAlloc = (dId: string, sId: string) => {
    const k = dId + '|' + sId;
    return (alloc && alloc[k]) || 0;
  };
  const setAlloc = (dId: string, sId: string, raw: string) => {
    const v = Math.max(0, Math.round(Number(String(raw).replace(/[^0-9.]/g, '')) || 0));
    const next: AllocMap = { ...(alloc || {}) };
    next[dId + '|' + sId] = v;
    set('alloc', next);
  };

  const totalAllocated = destDefs.reduce((acc, d) => acc + selSources.reduce((b, s) => b + effAlloc(d.id, s.id), 0), 0);
  const remain = matTotal - totalAllocated;
  const destAllOk = destDefs.every((d) => selSources.reduce((acc, s) => acc + effAlloc(d.id, s.id), 0) === d.target);
  const srcNoOver = selSources.every((s) => destDefs.reduce((acc, d) => acc + effAlloc(d.id, s.id), 0) <= s.total);
  const allocValid = remain === 0 && destAllOk && srcNoOver;

  const iStyle: React.CSSProperties = { width: 108, padding: '6px 9px', border: '1px solid var(--border2,#E2D9C8)', borderRadius: 8, fontFamily: "'IBM Plex Sans Thai',sans-serif", fontSize: 13, color: 'var(--text,#2C2A23)', textAlign: 'right', background: 'var(--surface2,#fff)' };

  /** Builds the structured source/destination legs the money-flow diagram needs,
   *  from the same state already tracked for the allocation UI — nothing new to
   *  ask the user for, just persisting what's already on screen. */
  const buildMoveLegs = () => {
    const sources: MoveLeg[] = selSources.map((s) => {
      const income = extraIncomes.find((e) => e.id === s.id);
      if (income) return { id: s.id, type: 'src' as FlowNodeType, label: income.name, amount: s.total, date: getSourceDate(s.id) };
      const a = assets.find((x) => x.id === s.id);
      const label = a ? `${a.name} · ${a.owners.join(' · ')}` : s.name;
      return { id: s.id, type: (a?.type ?? 'other') as FlowNodeType, label, amount: s.total, date: getSourceDate(s.id) };
    });
    const destinations: MoveLeg[] = [
      ...extraExpenses.map((e) => ({ id: e.id, type: 'exit' as FlowNodeType, label: e.name, amount: e.target, date: getDestDate(e.id) })),
      ...newDestinations.map((nd) => ({ id: nd.id, type: nd.asset.type as FlowNodeType, label: `${nd.asset.name} · ${nd.asset.owners.join(' · ')}`, amount: nd.target, date: getDestDate(nd.id) })),
      ...topUps.map((t) => ({ id: t.existingId, type: t.asset.type as FlowNodeType, label: `${t.asset.name} · ${t.asset.owners.join(' · ')}`, amount: t.addAmount, date: getDestDate(t.existingId) })),
    ];
    const alloc: Record<string, number> = {};
    destDefs.forEach((d) => {
      selSources.forEach((s) => {
        const v = effAlloc(d.id, s.id);
        if (v > 0) alloc[`${d.id}|${s.id}`] = v;
      });
    });
    return { sources, destinations, alloc };
  };

  const saveMove = async () => {
    const srcNames = selSources.map((s) => `${s.name} (ถอน ${dueLabelTH(getSourceDate(s.id))})`).join(' + ');
    const dstNames = destDefs.map((d) => `${d.name} ${fmt(d.target)} (ฝาก ${dueLabelTH(getDestDate(d.id))})`).join(' + ');
    const title = `โยกย้าย ${selSources.length} บัญชี → ${destDefs.length} ปลายทาง`;
    const detail = `รวม ${fmt(matTotal)} จาก ${srcNames} → ${dstNames}`;
    const { sources, destinations, alloc: allocOut } = buildMoveLegs();
    if (!api.isConfigured()) {
      newDestinations.forEach((nd) => upsertLocalAsset(nd.raw));
      topUps.forEach((t) => upsertLocalAsset({ ...t.asset, amount: (t.asset.amount ?? 0) + t.addAmount }));
      setNewDestinations([]);
      setTopUps([]);
      set('alloc', {});
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
      return;
    }
    setSaveState('saving');
    try {
      for (const nd of newDestinations) await api.createAsset(nd.raw);
      for (const t of topUps) await api.updateAsset({ ...t.asset, amount: (t.asset.amount ?? 0) + t.addAmount });
      await api.recordMove({ title, detail, amount: matTotal, sources, destinations, alloc: allocOut });
      await loadData();
      setNewDestinations([]);
      setTopUps([]);
      set('alloc', {});
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('error');
    }
  };

  return (
    <section>
      <ScreenTitle title="บันทึกการครบกำหนด / โยกย้ายเงิน" en="Record maturity & transfer" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(330px,1fr))', gap: 18, alignItems: 'start' }}>
        {/* step 1 — select */}
        <div style={cardRed}>
          <StepHead n={1} label="เลือกรายการต้นทาง" color="#DC2626" />
          <div style={{ fontSize: 13, color: 'var(--muted,#9A917F)', marginBottom: 14, paddingLeft: 31 }}>เลือกได้มากกว่า 1 รายการเพื่อรวมยอด</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SourceGroup label="บัญชีใกล้ครบกำหนด" ink="#B91C1C" bg="#FEE2E2" bd="#FCA5A5" items={matCandMaturity} onToggle={toggleMatSel} onRemove={removeAnySource} getDate={getSourceDate} onDateChange={setSourceDate} />
            <SourceGroup label="รายการต้นทางเดิม (เพิ่มเอง)" ink="var(--p-blue-ink,#2456A8)" bg="var(--p-blue-bg,#EEF3FA)" bd="var(--p-blue-bd,#CFE0F0)" items={matCandManual} onToggle={toggleMatSel} onRemove={removeAnySource} getDate={getSourceDate} onDateChange={setSourceDate} />
            <SourceGroup label="รายได้ใหม่จากภายนอก" ink="var(--p-gold-ink,#8A6A12)" bg="var(--p-gold-bg,#FBF4DF)" bd="var(--p-gold-bd,#ECDBA8)" items={matCandIncome} onToggle={toggleMatSel} onRemove={removeAnySource} getDate={getSourceDate} onDateChange={setSourceDate} />

            <button
              onClick={() => setShowAddSource(true)}
              style={{ border: '1.5px dashed #C7BCA3', background: 'none', borderRadius: 13, padding: '12px 15px', color: 'var(--muted,#8A8270)', fontFamily: "'IBM Plex Sans Thai'", fontSize: 14, cursor: 'pointer' }}
            >
              + เพิ่มรายการต้นทาง
            </button>

            {!showAddIncome ? (
              <button
                onClick={() => setShowAddIncome(true)}
                style={{ border: '1.5px dashed #C7BCA3', background: 'none', borderRadius: 13, padding: '12px 15px', color: 'var(--muted,#8A8270)', fontFamily: "'IBM Plex Sans Thai'", fontSize: 14, cursor: 'pointer' }}
              >
                + เพิ่มรายได้ใหม่จากภายนอก
              </button>
            ) : (
              <div style={{ border: '1.5px dashed #C7BCA3', borderRadius: 13, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 12.5, color: 'var(--muted,#9A917F)', fontWeight: 600 }}>เงินรายได้ใหม่จากภายนอก (ยังไม่เคยอยู่ในระบบ)</div>
                <input
                  value={incomeName}
                  onChange={(e) => setIncomeName(e.target.value)}
                  placeholder="เช่น รายรับจากการขายสินค้า"
                  style={incomeInputStyle}
                />
                <input
                  value={incomeAmount}
                  onChange={(e) => setIncomeAmount(e.target.value)}
                  inputMode="numeric"
                  placeholder="จำนวนเงิน (บาท)"
                  style={incomeInputStyle}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={addIncome}
                    disabled={!incomeName.trim() || !Number(incomeAmount.replace(/[^0-9.]/g, ''))}
                    style={{ flex: 1, background: 'var(--accent,#5E7350)', color: 'var(--on-accent,#FBF8F1)', border: 'none', borderRadius: 9, padding: '9px 14px', fontFamily: "'IBM Plex Sans Thai'", fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
                  >
                    + เพิ่ม
                  </button>
                  <button
                    onClick={() => { setShowAddIncome(false); setIncomeName(''); setIncomeAmount(''); }}
                    style={{ background: 'var(--surface2,#fff)', border: '1px solid var(--border2,#E2D9C8)', color: 'var(--muted2,#6B6356)', borderRadius: 9, padding: '9px 14px', fontFamily: "'IBM Plex Sans Thai'", fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}
          </div>
          <div style={{ marginTop: 16, background: 'var(--inset,#F1EDE2)', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--muted2,#6B6356)' }}>ยอดรวมต้นทาง ({matSel.length} รายการ)</span>
              <span style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 22, color: 'var(--ink,#3C4A33)' }}>{fmt(matTotal)}</span>
            </div>
          </div>
        </div>

        {/* step 2 — allocate */}
        <div style={cardYellow}>
          <StepHead n={2} label="จัดสรรไปยังรายการปลายทาง" color="#B45309" />
          <div style={{ fontSize: 13, color: 'var(--muted,#9A917F)', marginBottom: 14, paddingLeft: 31 }}>เลือกประเภท ปลายทาง และผู้ถือใหม่</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {destDefs.map((d) => {
              const filled = selSources.reduce((acc, s) => acc + effAlloc(d.id, s.id), 0);
              const ok = filled === d.target;
              return (
                <div key={d.id} style={{ border: '1px solid var(--border,#E8E0CF)', borderRadius: 12, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ background: d.color + '22', color: d.color, fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>{d.typeLabel}</span>
                    <span style={{ fontWeight: 600, fontSize: 14, flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}><BankBadge text={d.name} />{d.name}</span>
                    <span style={{ fontFamily: "'Lora',serif", fontWeight: 600, fontSize: 16, color: 'var(--ink,#3C4A33)' }}>{fmt(d.target)}</span>
                    {d.isExtra && (
                      <button
                        onClick={() => removeAnyDest(d.id)}
                        style={{ width: 22, height: 22, border: 'none', background: '#E2D9C8', color: 'var(--muted2,#6B6356)', borderRadius: 6, cursor: 'pointer', fontSize: 12, flexShrink: 0 }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted2,#6B6356)', marginBottom: 10 }}>{d.detail}</div>
                  <div style={{ background: 'var(--inset2,#F8F5EE)', borderRadius: 9, padding: '10px 12px' }}>
                    <div style={{ fontSize: 11.5, color: 'var(--muted,#9A917F)', fontWeight: 600, marginBottom: 7 }}>รับเงินมาจากบัญชีต้นทาง</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {selSources.map((s) => (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <BankBadge text={s.name} />
                          <span style={{ flex: 1, fontSize: 13, color: 'var(--text,#4A4538)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                          <input value={String(effAlloc(d.id, s.id))} onChange={(e) => setAlloc(d.id, s.id, e.target.value)} inputMode="numeric" style={iStyle} />
                        </div>
                      ))}
                      {selSources.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--muted,#A89F8C)' }}>เลือกบัญชีต้นทางก่อน</div>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 9, paddingTop: 8, borderTop: '1px dashed #E2D9C8' }}>
                      <span style={{ fontSize: 12, color: 'var(--muted,#9A917F)' }}>จัดสรรแล้ว {fmt(filled)} / {fmt(d.target)}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: ok ? '#5E7350' : filled > d.target ? '#C0472E' : '#B26B4E' }}>
                        {ok ? '✓ ครบ' : filled > d.target ? 'เกิน ' + fmt(filled - d.target) : 'ขาด ' + fmt(d.target - filled)}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                    <label style={{ fontSize: 12, color: 'var(--muted2,#6B6356)' }}>วันที่ฝากเงิน</label>
                    <input type="date" value={getDestDate(d.id)} onChange={(e) => setDestDate(d.id, e.target.value)} style={dateInputStyle} />
                  </div>
                </div>
              );
            })}
            <button
              onClick={() => setShowAddDest(true)}
              style={{ border: '1.5px dashed #C7BCA3', background: 'none', borderRadius: 12, padding: 13, color: 'var(--muted,#8A8270)', fontFamily: "'IBM Plex Sans Thai'", fontSize: 14, cursor: 'pointer' }}
            >
              + เพิ่มรายการปลายทาง
            </button>

            {!showAddExpense ? (
              <button
                onClick={() => setShowAddExpense(true)}
                style={{ border: '1.5px dashed #C7BCA3', background: 'none', borderRadius: 12, padding: 13, color: 'var(--muted,#8A8270)', fontFamily: "'IBM Plex Sans Thai'", fontSize: 14, cursor: 'pointer' }}
              >
                + เพิ่มค่าใช้จ่ายจากภายนอก
              </button>
            ) : (
              <div style={{ border: '1.5px dashed #C7BCA3', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 12.5, color: 'var(--muted,#9A917F)', fontWeight: 600 }}>ค่าใช้จ่าย / เงินที่ออกจากพอร์ต (ไม่ผูกบัญชีปลายทาง)</div>
                <input
                  value={expenseName}
                  onChange={(e) => setExpenseName(e.target.value)}
                  placeholder="เช่น ซื้อเครื่องจักร / แบ่งมรดกบุตร"
                  style={incomeInputStyle}
                />
                <input
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  inputMode="numeric"
                  placeholder="จำนวนเงิน (บาท)"
                  style={incomeInputStyle}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={addExpense}
                    disabled={!expenseName.trim() || !Number(expenseAmount.replace(/[^0-9.]/g, ''))}
                    style={{ flex: 1, background: '#B26B4E', color: 'var(--on-accent,#FBF8F1)', border: 'none', borderRadius: 9, padding: '9px 14px', fontFamily: "'IBM Plex Sans Thai'", fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
                  >
                    + เพิ่ม
                  </button>
                  <button
                    onClick={() => { setShowAddExpense(false); setExpenseName(''); setExpenseAmount(''); }}
                    style={{ background: 'var(--surface2,#fff)', border: '1px solid var(--border2,#E2D9C8)', color: 'var(--muted2,#6B6356)', borderRadius: 9, padding: '9px 14px', fontFamily: "'IBM Plex Sans Thai'", fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 16, background: '#FDECC8', border: '1px solid #E8C468', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 11.5, color: 'var(--muted,#9A917F)', fontWeight: 600, marginBottom: 9 }}>ยอดคงเหลือแต่ละบัญชีต้นทาง</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {selSources.map((s) => {
                const used = destDefs.reduce((acc, d) => acc + effAlloc(d.id, s.id), 0);
                const rem = s.total - used;
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <BankBadge text={s.name} />
                    <span style={{ flex: 1, color: 'var(--text,#4A4538)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                    <span style={{ color: 'var(--muted,#9A917F)', fontSize: 12 }}>ใช้ {fmt(used)} / {fmt(s.total)}</span>
                    <span style={{ fontWeight: 600, fontSize: 13, color: rem < 0 ? '#C0472E' : rem > 0 ? '#B26B4E' : '#5E7350' }}>เหลือ {fmt(Math.abs(rem)) + (rem < 0 ? ' (เกิน)' : '')}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 9, borderTop: '1px solid #E8C468' }}>
              <span style={{ fontSize: 13, color: 'var(--muted2,#6B6356)' }}>คงเหลือยังไม่จัดสรร (รวม)</span>
              <span style={{ fontWeight: 700, fontSize: 16, color: remain === 0 ? '#5E7350' : remain < 0 ? '#C0472E' : '#B26B4E' }}>{fmt(Math.abs(remain)) + (remain < 0 ? ' (เกิน)' : '')}</span>
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600, color: allocValid ? '#5E7350' : '#B26B4E' }}>
            {allocValid ? '✓ จัดสรรครบถ้วน ที่มาของเงินตรงกับยอดปลายทาง' : 'ยังจัดสรรไม่ครบ — ปรับยอดให้ผลรวมต้นทาง = ยอดปลายทาง'}
          </div>
          <button onClick={saveMove} disabled={!allocValid || saveState === 'saving'} style={{ marginTop: 12, width: '100%', background: saveState === 'saved' ? '#3C7A4A' : '#B45309', color: 'var(--on-accent,#FBF8F1)', border: 'none', borderRadius: 11, padding: 13, fontFamily: "'IBM Plex Sans Thai'", fontSize: 15, fontWeight: 600, cursor: allocValid ? 'pointer' : 'not-allowed', opacity: allocValid ? 1 : 0.55 }}>
            {saveState === 'saving' ? 'กำลังบันทึก…' : saveState === 'saved' ? '✓ บันทึกแล้ว' : saveState === 'error' ? 'บันทึกไม่สำเร็จ — ลองใหม่' : 'บันทึกการโยกย้าย'}
          </button>
        </div>
      </div>

      {showAddSource && (
        <SourcePickerModal
          assets={assets}
          excludeIds={matCand.map((m) => m.id)}
          onCancel={() => setShowAddSource(false)}
          onSelect={addSourceAsset}
        />
      )}

      {showAddDest && (
        <NewDestinationModal
          type={destType}
          onTypeChange={setDestType}
          owners={destOwners}
          onToggleOwner={toggleDestOwner}
          onCancel={() => setShowAddDest(false)}
          onSubmit={addDestination}
          assets={assets}
          onSubmitExisting={addTopUp}
        />
      )}

      {/* history */}
      <div style={{ marginTop: 26 }}>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 14 }}>ประวัติการโยกย้าย</div>
        {sortedMoves.length === 0 ? (
          <div style={{ fontSize: 13.5, color: 'var(--muted,#9A917F)' }}>ยังไม่มีประวัติการโยกย้ายเงิน — บันทึกรายการแรกได้จากฟอร์มด้านบน</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {sortedMoves.map((h, i) => (
              <div key={h.id ?? i} style={{ display: 'flex', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ width: 13, height: 13, borderRadius: '50%', background: 'var(--accent,#5E7350)', border: '3px solid #DCEAD2', marginTop: 4 }} />
                  <span style={{ width: 2, flex: 1, background: '#E2D9C8' }} />
                </div>
                <div style={{ background: 'var(--surface,#FBF8F1)', border: '1px solid var(--border,#E8E0CF)', borderRadius: 14, padding: '16px 18px', marginBottom: 14, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }}>
                    <span style={{ fontWeight: 600 }}>{h.title}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted,#9A917F)' }}>{dueLabelTH(h.date)}</span>
                  </div>
                  <div style={{ fontSize: 13.5, color: 'var(--text,#5B5444)', marginTop: 6, lineHeight: 1.55 }}>{h.detail}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

const card: React.CSSProperties = { background: 'var(--surface,#FBF8F1)', border: '1px solid var(--border,#E8E0CF)', borderRadius: 16, padding: 22 };
const cardRed: React.CSSProperties = { ...card, background: '#FEF2F2', border: '1px solid #FCA5A5' };
const cardYellow: React.CSSProperties = { ...card, background: '#FEF3C7', border: '1px solid #D4A017' };
const incomeInputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid var(--border2,#E2D9C8)', borderRadius: 9, background: 'var(--surface2,#fff)', fontFamily: "'IBM Plex Sans Thai',sans-serif", fontSize: 13.5, color: 'var(--text,#2C2A23)', boxSizing: 'border-box' };
const dateInputStyle: React.CSSProperties = { padding: '6px 9px', border: '1px solid var(--border2,#E2D9C8)', borderRadius: 8, background: 'var(--surface2,#fff)', fontFamily: "'IBM Plex Sans Thai',sans-serif", fontSize: 12.5, color: 'var(--text,#2C2A23)' };

/** One color-coded box per source category (maturity / manually-added / new income) —
 *  keeps the three kinds visually distinct instead of one undifferentiated list. */
function SourceGroup({
  label, ink, bg, bd, items, onToggle, onRemove, getDate, onDateChange,
}: {
  label: string; ink: string; bg: string; bd: string; items: MatCandEntry[];
  onToggle: (id: string) => void; onRemove: (id: string) => void;
  getDate: (id: string) => string; onDateChange: (id: string, date: string) => void;
}) {
  if (!items.length) return null;
  return (
    <div style={{ border: `1.5px solid ${bd}`, background: bg, borderRadius: 14, padding: 12 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: ink, marginBottom: 9, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {label} <span style={{ fontWeight: 500, opacity: 0.75 }}>({items.length})</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((m) => (
          <div key={m.id} style={{ border: '1.5px solid ' + (m.sel ? '#5E7350' : '#E8E0CF'), background: m.sel ? '#F2F5EC' : '#FFFFFF', borderRadius: 13, padding: '13px 15px' }}>
            <div onClick={() => onToggle(m.id)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ width: 20, height: 20, borderRadius: 6, border: '1.5px solid ' + (m.sel ? '#5E7350' : '#C7BCA3'), background: m.sel ? '#5E7350' : 'transparent', color: 'var(--on-accent,#FBF8F1)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{m.sel ? '✓' : ''}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}><BankBadge text={m.name} />{m.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted,#9A917F)' }}>{m.subLabel}</div>
                </div>
                {m.isExtra && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemove(m.id); }}
                    style={{ width: 22, height: 22, border: 'none', background: '#E2D9C8', color: 'var(--muted2,#6B6356)', borderRadius: 6, cursor: 'pointer', fontSize: 12, flexShrink: 0 }}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9, paddingTop: 9, borderTop: '1px dashed #E2D9C8', fontSize: 12.5 }}>
                <span style={{ color: 'var(--muted2,#6B6356)' }}>{m.breakLabel}</span>
                <span style={{ fontWeight: 700, color: 'var(--ink,#3C4A33)' }}>{m.totalFmt}</span>
              </div>
            </div>
            {m.sel && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 9, paddingTop: 9, borderTop: '1px dashed #E2D9C8' }}>
                <label style={{ fontSize: 12, color: 'var(--muted2,#6B6356)' }}>วันที่ถอนเงิน</label>
                <input type="date" value={getDate(m.id)} onChange={(e) => onDateChange(m.id, e.target.value)} style={dateInputStyle} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StepHead({ n, label, color }: { n: number; label: string; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
      <span style={{ width: 22, height: 22, borderRadius: '50%', background: color || 'var(--accent,#5E7350)', color: '#FBF8F1', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>
      <span style={{ fontWeight: 700, fontSize: 16 }}>{label}</span>
    </div>
  );
}

const cancelBtnStyle: React.CSSProperties = { background: 'var(--surface2,#fff)', border: '1px solid var(--border2,#E2D9C8)', color: 'var(--muted2,#6B6356)', borderRadius: 11, padding: '12px 22px', fontFamily: "'IBM Plex Sans Thai'", fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const primaryBtnStyle: React.CSSProperties = { background: 'var(--accent,#5E7350)', border: 'none', color: 'var(--on-accent,#FBF8F1)', borderRadius: 11, padding: '12px 24px', fontFamily: "'IBM Plex Sans Thai'", fontSize: 14, fontWeight: 600, cursor: 'pointer' };

const EXISTING_TYPES: AssetType[] = ['fd', 'sav', 'bond'];

/** Search + pick ANY existing asset (no type or due-date restriction) to use as a source. */
function SourcePickerModal({
  assets, excludeIds, onCancel, onSelect,
}: {
  assets: Asset[]; excludeIds: string[]; onCancel: () => void; onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const q = search.trim().toLowerCase();
  const options = assets
    .filter((a) => !excludeIds.includes(a.id))
    .filter((a) => !q || (a.name + ' ' + a.acctNo + ' ' + a.owners.join(' ') + ' ' + a.typeLabel).toLowerCase().includes(q))
    .slice(0, 30);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,42,33,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '36px 16px', zIndex: 50, overflow: 'auto' }}>
      <div style={{ background: 'var(--surface,#FBF8F1)', borderRadius: 20, width: '100%', maxWidth: 660, boxShadow: '0 24px 60px rgba(20,16,8,0.3)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border,#E8E0CF)' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>เพิ่มรายการต้นทาง</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted,#9A917F)' }}>เลือกสินทรัพย์ที่มีอยู่แล้ว — รวมถึงบัญชีที่ไม่มีวันครบกำหนด เช่น ทองคำ หุ้น หรือบัญชีออมทรัพย์</div>
          </div>
          <button type="button" onClick={onCancel} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border2,#E2D9C8)', background: 'var(--surface2,#fff)', cursor: 'pointer', fontSize: 15, color: 'var(--muted2,#6B6356)' }}>✕</button>
        </div>
        <div style={{ padding: '18px 24px 22px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '60vh', overflow: 'auto' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ชื่อรายการ ประเภท ธนาคาร เลขบัญชี หรือเจ้าของ..."
            style={incomeInputStyle}
          />
          <div style={{ border: '1px solid var(--border2,#E2D9C8)', borderRadius: 10, maxHeight: 320, overflow: 'auto' }}>
            {options.length === 0 && (
              <div style={{ padding: 14, fontSize: 13, color: 'var(--muted,#A89F8C)' }}>ไม่พบรายการที่ตรงกับการค้นหา</div>
            )}
            {options.map((a) => {
              const active = a.id === selectedId;
              return (
                <div
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  style={{ padding: '11px 14px', borderBottom: '1px solid var(--border,#EFE8D9)', cursor: 'pointer', background: active ? '#EEF2E8' : 'transparent' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: a.color + '22', color: a.color, fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20 }}>{a.typeLabel}</span>
                    <BankBadge text={a.name} />
                    <span style={{ fontWeight: 600, fontSize: 13.5 }}>{a.name}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted,#9A917F)', marginTop: 3 }}>{a.owners.join(' · ')} · มูลค่า {fmt(a.amount)}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '18px 24px', borderTop: '1px solid var(--border,#E8E0CF)' }}>
          <button type="button" onClick={onCancel} style={cancelBtnStyle}>ยกเลิก</button>
          <button
            type="button"
            onClick={() => selectedId && onSelect(selectedId)}
            disabled={!selectedId}
            style={{ ...primaryBtnStyle, opacity: selectedId ? 1 : 0.55, cursor: selectedId ? 'pointer' : 'not-allowed' }}
          >
            + เพิ่มเป็นต้นทาง
          </button>
        </div>
      </div>
    </div>
  );
}

function NewDestinationModal({
  type, onTypeChange, owners, onToggleOwner, onCancel, onSubmit, assets, onSubmitExisting,
}: {
  type: AssetType; onTypeChange: (t: AssetType) => void;
  owners: string[]; onToggleOwner: (p: string) => void;
  onCancel: () => void; onSubmit: (f: FormData) => void;
  assets: Asset[]; onSubmitExisting: (existingId: string, addAmount: number) => void;
}) {
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addAmountStr, setAddAmountStr] = useState('');

  const submitNew = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(new FormData(e.currentTarget));
  };

  const q = search.trim().toLowerCase();
  const existingOptions = assets
    .filter((a) => EXISTING_TYPES.includes(a.type))
    .filter((a) => !q || (a.name + ' ' + a.acctNo + ' ' + a.owners.join(' ')).toLowerCase().includes(q))
    .slice(0, 30);
  const selected = assets.find((a) => a.id === selectedId);
  const addAmountNum = Number(addAmountStr.replace(/[^0-9.]/g, ''));

  const submitExisting = () => {
    if (!selectedId || !addAmountNum) return;
    onSubmitExisting(selectedId, addAmountNum);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,42,33,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '36px 16px', zIndex: 50, overflow: 'auto' }}>
      <div style={{ background: 'var(--surface,#FBF8F1)', borderRadius: 20, width: '100%', maxWidth: 660, boxShadow: '0 24px 60px rgba(20,16,8,0.3)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border,#E8E0CF)' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>เพิ่มรายการปลายทางใหม่</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted,#9A917F)' }}>
              {mode === 'new' ? 'จะถูกสร้างเป็นสินทรัพย์จริงเมื่อบันทึกการโยกย้ายสำเร็จ' : 'จะบวกเพิ่มเข้ายอดเดิมของบัญชีที่เลือกเมื่อบันทึกสำเร็จ'}
            </div>
          </div>
          <button type="button" onClick={onCancel} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border2,#E2D9C8)', background: 'var(--surface2,#fff)', cursor: 'pointer', fontSize: 15, color: 'var(--muted2,#6B6356)' }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '14px 24px 0' }}>
          {(['new', 'existing'] as const).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1.5px solid ' + (active ? '#5E7350' : '#E2D9C8'), background: active ? '#EEF2E8' : '#fff', color: active ? '#3C4A33' : '#6B6356', cursor: 'pointer', fontFamily: "'IBM Plex Sans Thai'", fontSize: 13.5, fontWeight: active ? 600 : 500 }}
              >
                {m === 'new' ? 'สร้างใหม่' : 'เลือกจากที่มีอยู่แล้ว'}
              </button>
            );
          })}
        </div>

        {mode === 'new' ? (
          <form onSubmit={submitNew}>
            <div style={{ padding: '18px 24px 22px', display: 'flex', flexDirection: 'column', gap: 18, maxHeight: '60vh', overflow: 'auto' }}>
              <AssetFormFields formType={type} onTypeChange={onTypeChange} owners={owners} onToggleOwner={onToggleOwner} assets={assets} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '18px 24px', borderTop: '1px solid var(--border,#E8E0CF)' }}>
              <button type="button" onClick={onCancel} style={cancelBtnStyle}>ยกเลิก</button>
              <button type="submit" style={primaryBtnStyle}>+ เพิ่มเป็นปลายทาง</button>
            </div>
          </form>
        ) : (
          <>
            <div style={{ padding: '18px 24px 22px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '60vh', overflow: 'auto' }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, color: 'var(--muted,#9A917F)', marginBottom: 6 }}>ค้นหาบัญชี (ฝากประจำ / ออมทรัพย์ / หุ้นกู้)</label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ชื่อรายการ ธนาคาร เลขบัญชี หรือเจ้าของ..."
                  style={incomeInputStyle}
                />
              </div>
              <div style={{ border: '1px solid var(--border2,#E2D9C8)', borderRadius: 10, maxHeight: 220, overflow: 'auto' }}>
                {existingOptions.length === 0 && (
                  <div style={{ padding: 14, fontSize: 13, color: 'var(--muted,#A89F8C)' }}>ไม่พบบัญชีที่ตรงกับการค้นหา</div>
                )}
                {existingOptions.map((a) => {
                  const active = a.id === selectedId;
                  return (
                    <div
                      key={a.id}
                      onClick={() => setSelectedId(a.id)}
                      style={{ padding: '11px 14px', borderBottom: '1px solid var(--border,#EFE8D9)', cursor: 'pointer', background: active ? '#EEF2E8' : 'transparent' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ background: a.color + '22', color: a.color, fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20 }}>{a.typeLabel}</span>
                        <BankBadge text={a.name} />
                        <span style={{ fontWeight: 600, fontSize: 13.5 }}>{a.name}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted,#9A917F)', marginTop: 3 }}>{a.owners.join(' · ')} · ยอดปัจจุบัน {fmt(a.amount)}</div>
                    </div>
                  );
                })}
              </div>
              {selected && (
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, color: 'var(--muted,#9A917F)', marginBottom: 6 }}>จำนวนเงินที่จะเพิ่มเข้าไป (บาท)</label>
                  <input
                    value={addAmountStr}
                    onChange={(e) => setAddAmountStr(e.target.value)}
                    inputMode="numeric"
                    placeholder="1,000,000"
                    style={incomeInputStyle}
                  />
                  <div style={{ fontSize: 12.5, color: 'var(--muted2,#6B6356)', marginTop: 6 }}>
                    ยอดเดิม {fmt(selected.amount)} → รวมเป็น {fmt(selected.amount + (addAmountNum || 0))}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '18px 24px', borderTop: '1px solid var(--border,#E8E0CF)' }}>
              <button type="button" onClick={onCancel} style={cancelBtnStyle}>ยกเลิก</button>
              <button type="button" onClick={submitExisting} disabled={!selectedId || !addAmountNum} style={{ ...primaryBtnStyle, opacity: !selectedId || !addAmountNum ? 0.55 : 1, cursor: !selectedId || !addAmountNum ? 'not-allowed' : 'pointer' }}>
                + เพิ่มเป็นปลายทาง
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
