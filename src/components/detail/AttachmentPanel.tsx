import { useRef, useState } from 'react';
import type { Asset, Attachment } from '@/data/types';
import { useAppStore } from '@/store/useAppStore';
import { dueLabelTH } from '@/lib/format';
import * as api from '@/api/client';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB — comfortably under Apps Script's request-body limits

const ICON_BY_MIME = (mime: string): { glyph: string; color: string } => {
  if (mime.startsWith('image/')) return { glyph: '🖼️', color: '#2563EB' };
  if (mime === 'application/pdf') return { glyph: '📄', color: '#C0392B' };
  if (mime.includes('spreadsheet') || mime.includes('excel')) return { glyph: '📊', color: '#1F8A4C' };
  if (mime.includes('word') || mime.includes('document')) return { glyph: '📝', color: '#2456A8' };
  return { glyph: '📎', color: '#8A8270' };
};

/** Strips the "data:<mime>;base64," prefix FileReader adds, leaving raw base64. */
const readAsBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/** Attach photos/PDFs/spreadsheets/documents to an asset — stored in the
 *  shared Google Drive folder, linked back to this record for viewing anytime. */
export function AttachmentPanel({ a }: { a: Asset }) {
  const upsertLocalAsset = useAppStore((s) => s.upsertLocalAsset);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attachments = a.attachments ?? [];

  const setAttachments = (next: Attachment[]) => upsertLocalAsset({ ...a, attachments: next });

  const onFilesChosen = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setError(null);
    if (!api.isConfigured()) {
      setError('ยังไม่ได้ตั้งค่า backend — แนบไฟล์ได้เฉพาะตอนเชื่อมต่อฐานข้อมูลจริงเท่านั้น');
      return;
    }
    setBusy(true);
    try {
      let current = attachments;
      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_BYTES) {
          setError(`"${file.name}" มีขนาดเกิน 10MB — ข้ามไฟล์นี้`);
          continue;
        }
        const dataBase64 = await readAsBase64(file);
        const uploaded = await api.uploadAttachment(a.id, file.name, file.type || 'application/octet-stream', dataBase64);
        current = [...current, uploaded];
        setAttachments(current);
      }
    } catch (err) {
      setError('แนบไฟล์ไม่สำเร็จ: ' + String(err));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onDelete = async (att: Attachment) => {
    if (!window.confirm(`ลบไฟล์ "${att.name}"?`)) return;
    setError(null);
    try {
      if (api.isConfigured()) await api.deleteAttachment(att.id);
      setAttachments(attachments.filter((x) => x.id !== att.id));
    } catch (err) {
      setError('ลบไฟล์ไม่สำเร็จ: ' + String(err));
    }
  };

  return (
    <div style={{ marginTop: 22, background: 'var(--surface,#FBF8F1)', border: '1px solid var(--border,#E8E0CF)', borderRadius: 13, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: attachments.length ? 14 : 4 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>ไฟล์แนบ</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted,#9A917F)' }}>{attachments.length} ไฟล์ · รูปภาพ / PDF / Excel / Word</div>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          style={{ background: 'var(--accent,#5E7350)', color: 'var(--on-accent,#FBF8F1)', border: 'none', borderRadius: 10, padding: '9px 16px', fontFamily: "'IBM Plex Sans Thai'", fontSize: 13.5, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}
        >
          {busy ? 'กำลังอัปโหลด…' : '+ แนบไฟล์'}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
          style={{ display: 'none' }}
          onChange={(e) => onFilesChosen(e.target.files)}
        />
      </div>

      {error && <div style={{ fontSize: 12.5, color: '#C0392B', marginBottom: 12 }}>{error}</div>}

      {!!attachments.length && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {attachments.map((att) => {
            const icon = ICON_BY_MIME(att.mimeType);
            return (
              <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 2px', borderTop: '1px solid var(--border,#EFE8D9)' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{icon.glyph}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{att.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted,#9A917F)' }}>{att.uploadedAt ? dueLabelTH(att.uploadedAt) : ''}</div>
                </div>
                <a
                  href={att.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 13, fontWeight: 600, color: icon.color, background: icon.color + '1A', padding: '7px 13px', borderRadius: 9, textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                  เปิดดู
                </a>
                <button
                  type="button"
                  onClick={() => onDelete(att)}
                  title="ลบไฟล์"
                  style={{ background: 'none', border: 'none', color: 'var(--muted,#A89F8C)', fontSize: 15, cursor: 'pointer', padding: '4px 6px' }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
