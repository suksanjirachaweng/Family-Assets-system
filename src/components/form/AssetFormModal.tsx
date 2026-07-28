import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import * as api from '@/api/client';
import { buildRawAssetFromForm } from '@/lib/assetForm';
import { AssetFormFields } from './AssetFormFields';

export function AssetFormModal() {
  const formType = useAppStore((s) => s.formType);
  const formOwners = useAppStore((s) => s.formOwners);
  const editingId = useAppStore((s) => s.editingId);
  const set = useAppStore((s) => s.set);
  const toggleFormOwner = useAppStore((s) => s.toggleFormOwner);
  const upsertLocalAsset = useAppStore((s) => s.upsertLocalAsset);
  const editing = useAppStore((s) => (editingId ? s.assets.find((x) => x.id === editingId) : undefined));
  const assets = useAppStore((s) => s.assets);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const a = buildRawAssetFromForm(f, formType, formOwners, editingId || 'a' + Date.now());
    if (editing?.expenses) a.expenses = editing.expenses;

    // optimistic local update (keeps mock mode fully functional too)
    upsertLocalAsset(a);
    if (!api.isConfigured()) { set('showForm', false); return; }
    setSaving(true);
    setError(null);
    try {
      if (editingId) await api.updateAsset(a);
      else await api.createAsset(a);
      set('showForm', false);
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,42,33,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '36px 16px', zIndex: 50, overflow: 'auto' }}>
      <form key={editingId ?? 'new'} onSubmit={onSubmit} style={{ background: 'var(--surface,#FBF8F1)', borderRadius: 20, width: '100%', maxWidth: 660, boxShadow: '0 24px 60px rgba(20,16,8,0.3)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border,#E8E0CF)' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{editingId ? 'แก้ไขสินทรัพย์' : 'เพิ่มสินทรัพย์ใหม่'}</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted,#9A917F)' }}>บันทึกลงฐานข้อมูล Google Sheets</div>
          </div>
          <button type="button" onClick={() => set('showForm', false)} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border2,#E2D9C8)', background: 'var(--surface2,#fff)', cursor: 'pointer', fontSize: 15, color: 'var(--muted2,#6B6356)' }}>✕</button>
        </div>

        <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 18, maxHeight: '68vh', overflow: 'auto' }}>
          <AssetFormFields
            formType={formType}
            onTypeChange={(k) => set('formType', k)}
            owners={formOwners}
            onToggleOwner={toggleFormOwner}
            defaults={editing}
            assets={assets}
          />
          {error && <div style={{ color: '#C0392B', fontSize: 13 }}>บันทึกไม่สำเร็จ: {error}</div>}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '18px 24px', borderTop: '1px solid var(--border,#E8E0CF)' }}>
          <button type="button" onClick={() => set('showForm', false)} style={{ background: 'var(--surface2,#fff)', border: '1px solid var(--border2,#E2D9C8)', color: 'var(--muted2,#6B6356)', borderRadius: 11, padding: '12px 22px', fontFamily: "'IBM Plex Sans Thai'", fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>ยกเลิก</button>
          <button type="submit" disabled={saving} style={{ background: 'var(--accent,#5E7350)', border: 'none', color: 'var(--on-accent,#FBF8F1)', borderRadius: 11, padding: '12px 24px', fontFamily: "'IBM Plex Sans Thai'", fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{saving ? 'กำลังบันทึก…' : editingId ? 'บันทึกการแก้ไข' : 'บันทึกสินทรัพย์'}</button>
        </div>
      </form>
    </div>
  );
}
