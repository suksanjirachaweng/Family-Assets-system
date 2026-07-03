/** Default app config (was DC props in the prototype). */
export const GOLD_PRICE_PER_BAHT = 51000;
export const WHT_RATE = 0.15;

/** Frozen "today" so due-date maths match the original design exactly. */
export const TODAY = new Date(2026, 5, 26); // 26 มิ.ย. 2569

/** TODAY as "YYYY-MM-DD" (local fields, not toISOString — that would shift a day in +7). */
export const todayISO = () =>
  TODAY.getFullYear() + '-' + String(TODAY.getMonth() + 1).padStart(2, '0') + '-' + String(TODAY.getDate()).padStart(2, '0');

export const fmt = (n: number) => '฿' + Math.round(n).toLocaleString('en-US');

export const fmtM = (n: number) =>
  (n / 1e6).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ลบ.';

export const fmtShort = (n: number) =>
  '฿' + (n / 1e6).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'M';

export const daysLeft = (due: string) =>
  Math.round((new Date(due).getTime() - TODAY.getTime()) / 86400000);

export const thMon = () =>
  ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export const thMonFull = () =>
  ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

/** e.g. "15 ส.ค. 69" (Buddhist year, 2-digit). */
export const dueLabelTH = (due: string) => {
  const d = new Date(due);
  return d.getDate() + ' ' + thMon()[d.getMonth()] + ' ' + (d.getFullYear() + 543).toString().slice(2);
};
