import { useState } from 'react';

/**
 * Second password gate in front of LINE bot controls — separate from the
 * family-wide PasswordGate. Deliberately has NO persistence (no localStorage):
 * per the user's explicit choice, it re-prompts every time this page is
 * visited, since navigating away unmounts this component (App.tsx only
 * renders LineSettingsView while `view === 'line'`). If VITE_ADMIN_PASSWORD
 * isn't set, the gate is skipped (matches PasswordGate's dev-friendly default).
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const required = import.meta.env.VITE_ADMIN_PASSWORD as string | undefined;
  const [unlocked, setUnlocked] = useState(!required);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  if (unlocked) return <>{children}</>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === required) setUnlocked(true);
    else setError(true);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 16px' }}>
      <form onSubmit={submit} style={{ background: 'var(--surface,#FBF8F1)', border: '1px solid var(--border,#E8E0CF)', borderRadius: 18, padding: '32px 28px', width: '100%', maxWidth: 360 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--accent,#5E7350)', color: 'var(--on-accent,#FBF8F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 19, marginBottom: 16 }}>🔒</div>
        <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text,#2C2A23)', marginBottom: 4 }}>ต้องใช้สิทธิ์ผู้ดูแลระบบ</div>
        <div style={{ fontSize: 13, color: 'var(--muted,#9A917F)', marginBottom: 20 }}>กรอกรหัสผ่านผู้ดูแลเพื่อจัดการการแจ้งเตือน LINE</div>
        <input
          type="password"
          autoFocus
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(false); }}
          placeholder="รหัสผ่านผู้ดูแล"
          style={{ width: '100%', padding: '11px 13px', border: '1px solid ' + (error ? '#C0472E' : 'var(--border2,#E2D9C8)'), borderRadius: 10, background: 'var(--surface2,#fff)', fontSize: 14, color: 'var(--text,#2C2A23)', boxSizing: 'border-box', marginBottom: error ? 8 : 16, fontFamily: "'IBM Plex Sans Thai',sans-serif" }}
        />
        {error && <div style={{ color: '#C0472E', fontSize: 12.5, marginBottom: 12 }}>รหัสผ่านไม่ถูกต้อง ลองใหม่อีกครั้ง</div>}
        <button type="submit" style={{ width: '100%', background: 'var(--accent,#5E7350)', color: 'var(--on-accent,#FBF8F1)', border: 'none', borderRadius: 10, padding: 12, fontFamily: "'IBM Plex Sans Thai'", fontSize: 14.5, fontWeight: 600, cursor: 'pointer' }}>
          เข้าใช้งาน
        </button>
      </form>
    </div>
  );
}
