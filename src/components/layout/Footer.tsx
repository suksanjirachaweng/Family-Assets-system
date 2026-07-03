import { WHT_RATE } from '@/lib/format';

export function Footer() {
  return (
    <footer
      className="fa-noprint"
      style={{
        maxWidth: 1240,
        margin: '0 auto',
        padding: '0 24px 40px',
        color: 'var(--muted,#A89F8C)',
        fontSize: 12,
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
      }}
    >
      <span>ฐานข้อมูลจัดเก็บบน Google Sheets · อัปเดตอัตโนมัติ</span>
      <span>ดอกเบี้ยแสดงเป็นยอดสุทธิหลังหักภาษี ณ ที่จ่าย {WHT_RATE * 100}%</span>
    </footer>
  );
}
