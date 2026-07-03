export function PrintHeader({ totalFmt }: { totalFmt: string }) {
  return (
    <div
      className="fa-print-only"
      style={{ marginBottom: 18, paddingBottom: 14, borderBottom: '2px solid var(--brand-deep,#3C4A33)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: 'var(--accent,#5E7350)',
              color: 'var(--on-accent,#FBF8F1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            บ
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>รายงานสรุปสินทรัพย์ครอบครัว</div>
            <div style={{ fontSize: 12, color: 'var(--muted2,#6B6356)' }}>Family Asset Portfolio Report</div>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--muted2,#6B6356)' }}>
          <div>ข้อมูล ณ 26 มิ.ย. 2569</div>
          <div>
            มูลค่ารวมสุทธิ <strong style={{ color: 'var(--ink,#3C4A33)', fontSize: 14 }}>{totalFmt}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
