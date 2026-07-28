import { useEffect, useState } from 'react';
import * as api from '@/api/client';

const STORAGE_KEY = 'fa-unlocked';

/** Idle timeout in ms — no activity for this long and the session is treated as
 *  expired, requiring the password again. Configurable via VITE_SESSION_TIMEOUT_MIN
 *  (minutes); defaults to 30. */
const SESSION_TIMEOUT_MS = (Number(import.meta.env.VITE_SESSION_TIMEOUT_MIN) || 30) * 60 * 1000;
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const;

const readLastActivity = (): number => {
  const raw = localStorage.getItem(STORAGE_KEY);
  const ts = raw ? Number(raw) : NaN;
  return Number.isFinite(ts) ? ts : 0;
};
const isSessionValid = () => Date.now() - readLastActivity() < SESSION_TIMEOUT_MS;
const touchSession = () => localStorage.setItem(STORAGE_KEY, String(Date.now()));

/**
 * Client-side password screen — blocks casual visitors from seeing family
 * financial data if the deployed URL is shared or stumbled on. This is NOT
 * real security: the check runs in the browser, so anyone who reads the
 * bundled JS can find the password. It only stops accidental/casual access,
 * not a determined technical visitor. If VITE_APP_PASSWORD isn't set (e.g.
 * local dev), the gate is skipped entirely so it never blocks development.
 *
 * A session expires after SESSION_TIMEOUT_MS of inactivity (sliding window —
 * any click/keypress/scroll/touch renews it), forcing the password again.
 * Every attempt (success or failure) is logged server-side via api.logLogin.
 */
export function PasswordGate({ children }: { children: React.ReactNode }) {
  const required = import.meta.env.VITE_APP_PASSWORD as string | undefined;
  const [unlocked, setUnlocked] = useState(() => !required || isSessionValid());
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  // While unlocked: renew the session on user activity, and re-lock automatically
  // once the idle timeout elapses (checked periodically, not just on activity).
  useEffect(() => {
    if (!unlocked || !required) return;
    const renew = () => touchSession();
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, renew, { passive: true }));
    const check = window.setInterval(() => { if (!isSessionValid()) setUnlocked(false); }, 30_000);
    return () => {
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, renew));
      window.clearInterval(check);
    };
  }, [unlocked, required]);

  if (unlocked) return <>{children}</>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = input === required;
    if (api.isConfigured()) api.logLogin(success).catch(() => { /* logging is best-effort */ });
    if (success) {
      touchSession();
      setUnlocked(true);
    } else {
      setError(true);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4EFE6', fontFamily: "'IBM Plex Sans Thai',sans-serif" }}>
      <form onSubmit={submit} style={{ background: '#FBF8F1', border: '1px solid #E8E0CF', borderRadius: 18, padding: '32px 28px', width: '100%', maxWidth: 340, boxShadow: '0 12px 40px rgba(20,16,8,0.12)' }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: '#5E7350', color: '#FBF8F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 19, marginBottom: 16 }}>บ</div>
        <div style={{ fontWeight: 700, fontSize: 17, color: '#2C2A23', marginBottom: 4 }}>สินทรัพย์ครอบครัว</div>
        <div style={{ fontSize: 13, color: '#9A917F', marginBottom: 20 }}>กรอกรหัสผ่านเพื่อเข้าใช้งาน</div>
        <input
          type="password"
          autoFocus
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(false); }}
          placeholder="รหัสผ่าน"
          style={{ width: '100%', padding: '11px 13px', border: '1px solid ' + (error ? '#C0472E' : '#E2D9C8'), borderRadius: 10, background: '#fff', fontSize: 14, color: '#2C2A23', boxSizing: 'border-box', marginBottom: error ? 8 : 16 }}
        />
        {error && <div style={{ color: '#C0472E', fontSize: 12.5, marginBottom: 12 }}>รหัสผ่านไม่ถูกต้อง ลองใหม่อีกครั้ง</div>}
        <button type="submit" style={{ width: '100%', background: '#5E7350', color: '#FBF8F1', border: 'none', borderRadius: 10, padding: 12, fontFamily: "'IBM Plex Sans Thai'", fontSize: 14.5, fontWeight: 600, cursor: 'pointer' }}>
          เข้าใช้งาน
        </button>
      </form>
    </div>
  );
}
