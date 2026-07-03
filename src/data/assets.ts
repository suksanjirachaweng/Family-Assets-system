import type { RawAsset } from './types';

/** Deterministic pseudo-random sequence (ported from prototype). */
const rnd = (i: number, s: number) => {
  const v = Math.sin((i + 1) * s) * 10000;
  return v - Math.floor(v);
};
const pick = <T>(arr: T[], i: number, s: number) =>
  arr[Math.floor(rnd(i, s) * arr.length)];

/** Procedurally generated assets a51..a100 (ported 1:1 from prototype genMore). */
function genMore(): RawAsset[] {
  const banks = ['ธ.ออมสิน', 'ธ.กสิกร', 'ธ.ไทยพาณิชย์', 'ธ.กรุงเทพ', 'ธ.กรุงไทย', 'ธ.กรุงศรี', 'ธ.ทหารไทยธนชาต'];
  const owners = [['วิวัฒน์'], ['ชัย'], ['ธีรดา'], ['ชัย', 'ธีรดา'], ['วิวัฒน์', 'ชัย'], ['วิวัฒน์', 'ธีรดา'], ['ครอบครัว']];
  const iAccts = [
    { bank: 'ธ.กรุงเทพ', no: '122-4423-121334', owners: ['วิวัฒน์'] },
    { bank: 'ธ.ออมสิน', no: '534-21213-2311', owners: ['ชัย', 'ธีรดา'] },
    { bank: 'ธ.กสิกร', no: '777-26443-28881', owners: ['ธีรดา'] },
    { bank: 'ธ.ไทยพาณิชย์', no: '101-553-9921', owners: ['ชัย'] },
  ];
  const stocks = [['PTT', 'ปตท.'], ['ADVANC', 'เอไอเอส'], ['AOT', 'ท่าอากาศยานไทย'], ['KBANK', 'กสิกรไทย'], ['SCC', 'ปูนซิเมนต์ไทย'], ['MINT', 'ไมเนอร์'], ['CPN', 'เซ็นทรัลพัฒนา'], ['HMPRO', 'โฮมโปร'], ['BH', 'รพ.บำรุงราษฎร์'], ['PTTEP', 'ปตท.สผ.']];
  const bondsI = ['GULF', 'CPALL', 'TRUE', 'BDMS', 'PTTGC', 'LH', 'BAM', 'TU', 'BJC', 'CK', 'GPSC', 'SCB'];
  const fundsN = ['TISCO Equity', 'K-USA', 'SCB Fixed', 'ONE-UGG', 'B-INNOTECH', 'KKP-PROP', 'SCBGOLD', 'K-SF', 'KFGBRAND', 'TMBGQG', 'ABSM', 'PRINCIPAL VNEQ'];
  const fdMonths = [6, 12, 18, 24, 36];
  const otherCats = [['ของสะสม', 'นาฬิกาสะสม'], ['ยานพาหนะ', 'รถยนต์'], ['งานศิลปะ', 'ภาพวาดสะสม'], ['ของสะสม', 'พระเครื่อง'], ['ของสะสม', 'เครื่องประดับ']];
  const dueDate = (i: number, s: number) => {
    const base = new Date(2026, 6, 1);
    const days = Math.floor(rnd(i, s) * 900);
    const d = new Date(base.getTime() + days * 86400000);
    return d.toISOString().slice(0, 10);
  };
  const out: RawAsset[] = [];
  for (let i = 0; i < 50; i++) {
    const id = 'a' + (51 + i);
    const own = pick(owners, i, 7.31);
    const ia = pick(iAccts, i, 5.13);
    const r = rnd(i, 3.7);
    let a: RawAsset;
    if (r < 0.24) {
      const bank = pick(banks, i, 12.9), m = pick(fdMonths, i, 4.2);
      a = { id, type: 'fd', name: 'ฝากประจำ ' + m + ' เดือน · ' + bank, owners: own, amount: (3 + Math.floor(rnd(i, 9.1) * 38)) * 100000, rate: 1.5 + rnd(i, 2.3) * 1.1, due: dueDate(i, 8.8), acctNo: (100 + Math.floor(rnd(i, 6.6) * 800)) + '-' + (1 + Math.floor(rnd(i, 1.7) * 8)) + '-' + (10000 + Math.floor(rnd(i, 3.3) * 89999)) + '-' + Math.floor(rnd(i, 2.2) * 9), iAcct: ia };
    } else if (r < 0.40) {
      const iss = pick(bondsI, i, 11.2);
      a = { id, type: 'bond', name: 'หุ้นกู้ ' + iss + ' รุ่น ' + (26 + Math.floor(rnd(i, 4.4) * 3)) + (pick(['7A', '8A', '9A', '1B', '5A'], i, 2.9)), owners: own, amount: (10 + Math.floor(rnd(i, 7.7) * 40)) * 100000, rate: 3.5 + rnd(i, 5.5) * 1.4, due: dueDate(i, 6.2), acctNo: 'TH-' + iss + (1000 + Math.floor(rnd(i, 8.1) * 8999)), iAcct: ia };
    } else if (r < 0.56) {
      const fn = pick(fundsN, i, 9.4), navB = 8 + rnd(i, 3.1) * 18, navN = navB * (0.82 + rnd(i, 7.2) * 0.5);
      a = { id, type: 'fund', name: 'กองทุน · ' + fn, owners: own, units: (5 + Math.floor(rnd(i, 2.6) * 55)) * 10000, navBuy: Math.round(navB * 100) / 100, navNow: Math.round(navN * 100) / 100, rate: rnd(i, 1.4) < 0.5 ? 0 : Math.round(rnd(i, 5.9) * 5 * 100) / 100, due: null, acctNo: fn.replace(/[^A-Z]/g, '').slice(0, 5) + '-' + (1000 + Math.floor(rnd(i, 4.7) * 8999)) };
    } else if (r < 0.72) {
      const st = pick(stocks, i, 10.8), pB = 20 + rnd(i, 6.1) * 200, pN = pB * (0.8 + rnd(i, 8.3) * 0.55);
      a = { id, type: 'stock', name: 'หุ้น ' + st[0] + ' · ' + st[1], owners: own, shares: (5 + Math.floor(rnd(i, 3.9) * 70)) * 1000, priceBuy: Math.round(pB * 100) / 100, priceNow: Math.round(pN * 100) / 100, rate: Math.round(rnd(i, 2.1) * 5 * 100) / 100, due: null, acctNo: 'พอร์ต KTBST-' + (7790 + i), iAcct: ia };
    } else if (r < 0.82) {
      a = { id, type: 'sav', name: 'ออมทรัพย์ · ' + pick(banks, i, 13.3), owners: own, amount: (5 + Math.floor(rnd(i, 5.2) * 25)) * 100000, rate: 0.4 + rnd(i, 2.8) * 1.2, due: null, acctNo: (100 + Math.floor(rnd(i, 6.1) * 800)) + '-' + (10000 + Math.floor(rnd(i, 3.8) * 89999)) + '-' + Math.floor(rnd(i, 2.4) * 9), receiving: true };
    } else if (r < 0.90) {
      a = { id, type: 'gold', name: pick(['ทองคำแท่ง 96.5%', 'ทองรูปพรรณ 96.5%'], i, 1.9), owners: own, goldBaht: 5 + Math.floor(rnd(i, 4.1) * 40), rate: 0, due: null, acctNo: pick(['ตู้นิรภัย', 'ธ.ทิสโก้ Gold Wallet', 'ตู้เซฟบ้าน'], i, 2.7) };
    } else if (r < 0.96) {
      const loc = pick(['ต.บางพระ ชลบุรี', 'ต.หนองปรือ บางละมุง', 'อ.ศรีราชา ชลบุรี', 'ต.สุรศักดิ์ ศรีราชา', 'อ.เมือง ระยอง'], i, 3.6);
      a = { id, type: 'land', name: pick(['ที่ดินเปล่า', 'บ้านเดี่ยว', 'ทาวน์โฮม', 'ที่ดินจัดสรร'], i, 5.5) + ' · ' + loc, owners: own, deedNo: 'น.ส.4จ. ' + (10000 + Math.floor(rnd(i, 7.4) * 89999)), rai: Math.floor(rnd(i, 2.2) * 6), ngan: Math.floor(rnd(i, 3.1) * 4), wa: Math.floor(rnd(i, 4.8) * 99), appraisal: (30 + Math.floor(rnd(i, 8.9) * 200)) * 100000, due: null, rate: 0, acctNo: 'โฉนด ' + (10000 + Math.floor(rnd(i, 7.4) * 89999)) };
    } else {
      const oc = pick(otherCats, i, 6.3);
      a = { id, type: 'other', name: oc[1] + ' #' + (i + 1), owners: own, otherCat: oc[0], otherVal: (5 + Math.floor(rnd(i, 9.6) * 60)) * 100000, due: null, rate: 0, acctNo: pick(['ตู้นิรภัย', 'บ้านพักหลัก', 'โกดัง'], i, 1.3) };
    }
    if (a.rate != null && typeof a.rate === 'number') a.rate = Math.round(a.rate * 100) / 100;
    out.push(a);
  }
  return out;
}

/** Hand-authored base assets a1..a50 (ported 1:1 from prototype rawAssets). */
const baseAssets: RawAsset[] = [
  { id: 'a1', type: 'fd', name: 'ฝากประจำ 12 เดือน · ธ.ออมสิน', owners: ['ชัย', 'ธีรดา'], amount: 1000000, rate: 1.80, due: '2026-08-15', acctNo: '534-21213-2311', iAcct: { bank: 'ธ.ออมสิน', no: '534-21213-2311', owners: ['ชัย', 'ธีรดา'] } },
  { id: 'a2', type: 'fd', name: 'ฝากประจำ 24 เดือน · ธ.ออมสิน', owners: ['วิวัฒน์'], amount: 1100000, rate: 1.85, due: '2026-09-02', acctNo: '342-4773-166334', iAcct: { bank: 'ธ.ออมสิน', no: '342-4773-166334', owners: ['วิวัฒน์'] } },
  { id: 'a3', type: 'bond', name: 'หุ้นกู้ GULF รุ่น 266A', owners: ['วิวัฒน์'], amount: 3000000, rate: 4.20, due: '2026-07-20', acctNo: 'TH-GULF266A', iAcct: { bank: 'ธ.กรุงเทพ', no: '122-4423-121334', owners: ['วิวัฒน์'] } },
  { id: 'a4', type: 'bond', name: 'หุ้นกู้ CPALL รุ่น 281A', owners: ['วิวัฒน์'], amount: 1000000, rate: 3.90, due: '2028-03-10', acctNo: 'TH-CPALL281A', iAcct: { bank: 'ธ.กรุงเทพ', no: '122-4423-121334', owners: ['วิวัฒน์'] } },
  { id: 'a5', type: 'fd', name: 'ฝากประจำ 18 เดือน · ธ.กสิกร', owners: ['ธีรดา'], amount: 1250000, rate: 2.00, due: '2027-01-05', acctNo: '777-26443-28881', iAcct: { bank: 'ธ.กสิกร', no: '777-26443-28881', owners: ['ธีรดา'] } },
  { id: 'a6', type: 'fund', name: 'กองทุนหุ้นไทย · TISCO Equity', owners: ['ชัย', 'วิวัฒน์'], units: 250000, navBuy: 14.50, navNow: 16.80, rate: 0, due: null, acctNo: 'TISCOEQ-0042' },
  { id: 'a7', type: 'fund', name: 'กองทุนดัชนีสหรัฐ · K-USA', owners: ['ธีรดา'], units: 200000, navBuy: 12.00, navNow: 16.00, rate: 0, due: null, acctNo: 'KUSA-1188' },
  { id: 'a8', type: 'fund', name: 'กองทุนตราสารหนี้ · SCB Fixed', owners: ['ชัย'], units: 400000, navBuy: 10.50, navNow: 11.25, rate: 3.20, due: null, acctNo: 'SCBFIX-7720', iAcct: { bank: 'ธ.ออมสิน', no: '534-21213-2311', owners: ['ชัย', 'ธีรดา'] } },
  { id: 'a9', type: 'bond', name: 'หุ้นกู้ GULF รุ่น 27NA (ชุด 2)', owners: ['ชัย', 'ธีรดา'], amount: 5000000, rate: 4.05, due: '2027-11-15', acctNo: 'TH-GULF27NA', iAcct: { bank: 'ธ.กรุงเทพ', no: '122-4423-121334', owners: ['วิวัฒน์'] } },
  { id: 'a10', type: 'sav', name: 'ออมทรัพย์ · ธ.กรุงเทพ', owners: ['วิวัฒน์'], amount: 1250000, rate: 0.50, due: null, acctNo: '122-4423-121334', receiving: true, expenses: [
    { label: 'ค่าเทอมลูก เทอม 1', cat: 'การศึกษา', amount: 185000, date: '2026-05-12' },
    { label: 'ค่าซ่อมหลังคาบ้าน', cat: 'ที่อยู่อาศัย', amount: 96000, date: '2026-05-28' },
    { label: 'เบี้ยประกันสุขภาพครอบครัว', cat: 'ประกัน', amount: 142000, date: '2026-06-03' },
    { label: 'ค่ารักษาพยาบาล รพ.', cat: 'สุขภาพ', amount: 58500, date: '2026-06-15' },
    { label: 'ทริปครอบครัว เชียงใหม่', cat: 'ท่องเที่ยว', amount: 124000, date: '2026-06-22' },
    { label: 'ภาษีที่ดินประจำปี', cat: 'ภาษี', amount: 47000, date: '2026-06-25' },
  ] },
  { id: 'a11', type: 'sav', name: 'ออมทรัพย์ · ธ.ออมสิน', owners: ['ชัย', 'ธีรดา'], amount: 980000, rate: 0.45, due: null, acctNo: '534-21213-2311', receiving: true },
  { id: 'a13', type: 'fd', name: 'ฝากประจำ 12 เดือน · ธ.ไทยพาณิชย์', owners: ['ชัย'], amount: 2000000, rate: 1.95, due: '2026-10-30', acctNo: '101-553-9921', iAcct: { bank: 'ธ.ไทยพาณิชย์', no: '101-553-9921', owners: ['ชัย'] } },
  { id: 'a12', type: 'gold', name: 'ทองคำแท่ง 96.5%', owners: ['ครอบครัว'], goldBaht: 30, rate: 0, due: null, acctNo: 'ตู้นิรภัย' },
  { id: 'a14', type: 'stock', name: 'หุ้น PTT · ปตท.', owners: ['วิวัฒน์'], shares: 50000, priceBuy: 32.00, priceNow: 35.50, rate: 4.50, due: null, acctNo: 'พอร์ต KTBST-7781', iAcct: { bank: 'ธ.กรุงเทพ', no: '122-4423-121334', owners: ['วิวัฒน์'] } },
  { id: 'a15', type: 'stock', name: 'หุ้น ADVANC · เอไอเอส', owners: ['ชัย', 'ธีรดา'], shares: 20000, priceBuy: 210.00, priceNow: 248.00, rate: 3.80, due: null, acctNo: 'พอร์ต KTBST-7782', iAcct: { bank: 'ธ.ออมสิน', no: '534-21213-2311', owners: ['ชัย', 'ธีรดา'] } },
  { id: 'a16', type: 'land', name: 'ที่ดินเปล่า · ต.บางพระ ชลบุรี', owners: ['ชัย', 'ธีรดา'], deedNo: 'น.ส.4จ. 12456', rai: 5, ngan: 2, wa: 40, appraisal: 18500000, due: null, rate: 0, acctNo: 'โฉนด 12456' },
  { id: 'a17', type: 'land', name: 'บ้านเดี่ยว · หมู่บ้านลัดดารมย์', owners: ['วิวัฒน์'], deedNo: 'น.ส.4จ. 88213', rai: 0, ngan: 1, wa: 60, appraisal: 9800000, due: null, rate: 0, acctNo: 'โฉนด 88213' },
  { id: 'a18', type: 'other', name: 'นาฬิกาสะสม · Rolex', owners: ['ครอบครัว'], otherCat: 'ของสะสม', otherVal: 1200000, due: null, rate: 0, acctNo: 'ตู้นิรภัย' },
  { id: 'a19', type: 'fd', name: 'ฝากประจำ 24 เดือน · ธ.กรุงไทย', owners: ['วิวัฒน์'], amount: 3000000, rate: 1.90, due: '2026-12-12', acctNo: '019-2-55821-7', iAcct: { bank: 'ธ.กรุงเทพ', no: '122-4423-121334', owners: ['วิวัฒน์'] } },
  { id: 'a20', type: 'fd', name: 'ฝากประจำ 36 เดือน · ธ.กรุงศรี', owners: ['ชัย', 'ธีรดา'], amount: 2500000, rate: 2.15, due: '2027-05-20', acctNo: '128-1-77432-9', iAcct: { bank: 'ธ.ออมสิน', no: '534-21213-2311', owners: ['ชัย', 'ธีรดา'] } },
  { id: 'a21', type: 'fd', name: 'ฝากประจำ 12 เดือน · ธ.ทหารไทยธนชาต', owners: ['ธีรดา'], amount: 1500000, rate: 1.75, due: '2026-07-08', acctNo: '244-2-09981-3', iAcct: { bank: 'ธ.กสิกร', no: '777-26443-28881', owners: ['ธีรดา'] } },
  { id: 'a22', type: 'fd', name: 'ฝากประจำปลอดภาษี 24 เดือน · ธ.ออมสิน', owners: ['ชัย'], amount: 600000, rate: 2.40, due: '2027-09-01', acctNo: '534-99812-4410', iAcct: { bank: 'ธ.ไทยพาณิชย์', no: '101-553-9921', owners: ['ชัย'] } },
  { id: 'a23', type: 'fd', name: 'ฝากประจำ 6 เดือน · ธ.กสิกร', owners: ['วิวัฒน์', 'ชัย'], amount: 4000000, rate: 1.60, due: '2026-08-28', acctNo: '777-1-30022-8', iAcct: { bank: 'ธ.กรุงเทพ', no: '122-4423-121334', owners: ['วิวัฒน์'] } },
  { id: 'a24', type: 'bond', name: 'หุ้นกู้ TRUE รุ่น 268A', owners: ['วิวัฒน์'], amount: 2000000, rate: 4.50, due: '2026-11-10', acctNo: 'TH-TRUE268A', iAcct: { bank: 'ธ.กรุงเทพ', no: '122-4423-121334', owners: ['วิวัฒน์'] } },
  { id: 'a25', type: 'bond', name: 'หุ้นกู้ BDMS รุ่น 279A', owners: ['ธีรดา'], amount: 1500000, rate: 3.75, due: '2027-09-15', acctNo: 'TH-BDMS279A', iAcct: { bank: 'ธ.กสิกร', no: '777-26443-28881', owners: ['ธีรดา'] } },
  { id: 'a26', type: 'bond', name: 'หุ้นกู้ PTTGC รุ่น 285A', owners: ['ชัย', 'ธีรดา'], amount: 3000000, rate: 4.10, due: '2028-05-12', acctNo: 'TH-PTTGC285A', iAcct: { bank: 'ธ.ออมสิน', no: '534-21213-2311', owners: ['ชัย', 'ธีรดา'] } },
  { id: 'a27', type: 'bond', name: 'หุ้นกู้ LH รุ่น 271A', owners: ['ชัย'], amount: 2500000, rate: 3.95, due: '2026-10-05', acctNo: 'TH-LH271A', iAcct: { bank: 'ธ.ไทยพาณิชย์', no: '101-553-9921', owners: ['ชัย'] } },
  { id: 'a28', type: 'bond', name: 'หุ้นกู้ BAM รุ่น 263A', owners: ['วิวัฒน์'], amount: 1800000, rate: 4.35, due: '2027-03-22', acctNo: 'TH-BAM263A', iAcct: { bank: 'ธ.กรุงเทพ', no: '122-4423-121334', owners: ['วิวัฒน์'] } },
  { id: 'a29', type: 'fund', name: 'กองทุนหุ้นโลก · ONE-UGG', owners: ['วิวัฒน์'], units: 180000, navBuy: 18.20, navNow: 21.40, rate: 0, due: null, acctNo: 'ONEUGG-2231' },
  { id: 'a30', type: 'fund', name: 'กองทุนหุ้นเทคโนโลยี · B-INNOTECH', owners: ['ธีรดา'], units: 150000, navBuy: 22.00, navNow: 19.80, rate: 0, due: null, acctNo: 'BINNO-5510' },
  { id: 'a31', type: 'fund', name: 'กองทุนอสังหาฯ · KKP-PROP', owners: ['ชัย'], units: 300000, navBuy: 9.80, navNow: 10.55, rate: 4.50, due: null, acctNo: 'KKPPROP-0098', iAcct: { bank: 'ธ.ไทยพาณิชย์', no: '101-553-9921', owners: ['ชัย'] } },
  { id: 'a32', type: 'fund', name: 'กองทุนทองคำ · SCBGOLD', owners: ['ครอบครัว'], units: 120000, navBuy: 13.40, navNow: 15.10, rate: 0, due: null, acctNo: 'SCBGOLD-7781' },
  { id: 'a33', type: 'fund', name: 'กองทุนตราสารหนี้ระยะสั้น · K-SF', owners: ['วิวัฒน์', 'ธีรดา'], units: 500000, navBuy: 10.10, navNow: 10.32, rate: 2.10, due: null, acctNo: 'KSF-3340', iAcct: { bank: 'ธ.กรุงเทพ', no: '122-4423-121334', owners: ['วิวัฒน์'] } },
  { id: 'a34', type: 'stock', name: 'หุ้น AOT · ท่าอากาศยานไทย', owners: ['วิวัฒน์'], shares: 30000, priceBuy: 58.00, priceNow: 64.25, rate: 1.20, due: null, acctNo: 'พอร์ต KTBST-7783', iAcct: { bank: 'ธ.กรุงเทพ', no: '122-4423-121334', owners: ['วิวัฒน์'] } },
  { id: 'a35', type: 'stock', name: 'หุ้น KBANK · กสิกรไทย', owners: ['ชัย'], shares: 15000, priceBuy: 132.00, priceNow: 148.50, rate: 4.20, due: null, acctNo: 'พอร์ต KTBST-7784', iAcct: { bank: 'ธ.ไทยพาณิชย์', no: '101-553-9921', owners: ['ชัย'] } },
  { id: 'a36', type: 'stock', name: 'หุ้น DELTA · เดลต้า อีเลคโทรนิคส์', owners: ['ธีรดา'], shares: 8000, priceBuy: 92.00, priceNow: 78.50, rate: 0.80, due: null, acctNo: 'พอร์ต KTBST-7785', iAcct: { bank: 'ธ.กสิกร', no: '777-26443-28881', owners: ['ธีรดา'] } },
  { id: 'a37', type: 'stock', name: 'หุ้น PTTEP · ปตท.สผ.', owners: ['ชัย', 'ธีรดา'], shares: 25000, priceBuy: 148.00, priceNow: 162.00, rate: 5.10, due: null, acctNo: 'พอร์ต KTBST-7786', iAcct: { bank: 'ธ.ออมสิน', no: '534-21213-2311', owners: ['ชัย', 'ธีรดา'] } },
  { id: 'a38', type: 'stock', name: 'หุ้น BDMS · กรุงเทพดุสิตเวชการ', owners: ['วิวัฒน์'], shares: 60000, priceBuy: 24.50, priceNow: 27.75, rate: 2.40, due: null, acctNo: 'พอร์ต KTBST-7787', iAcct: { bank: 'ธ.กรุงเทพ', no: '122-4423-121334', owners: ['วิวัฒน์'] } },
  { id: 'a39', type: 'stock', name: 'หุ้น GULF · กัลฟ์ เอ็นเนอร์จี', owners: ['ครอบครัว'], shares: 40000, priceBuy: 42.00, priceNow: 51.50, rate: 1.80, due: null, acctNo: 'พอร์ต KTBST-7788', iAcct: { bank: 'ธ.กรุงเทพ', no: '122-4423-121334', owners: ['วิวัฒน์'] } },
  { id: 'a40', type: 'sav', name: 'ออมทรัพย์ · ธ.กสิกร', owners: ['ธีรดา'], amount: 1450000, rate: 0.50, due: null, acctNo: '777-26443-28881', receiving: true, expenses: [
    { label: 'ค่าผ่อนรถยนต์', cat: 'ยานพาหนะ', amount: 28000, date: '2026-06-05' },
    { label: 'ค่าเล่าเรียนพิเศษ', cat: 'การศึกษา', amount: 32000, date: '2026-06-12' },
    { label: 'ค่าใช้จ่ายในบ้าน', cat: 'ที่อยู่อาศัย', amount: 45000, date: '2026-06-20' },
  ] },
  { id: 'a41', type: 'sav', name: 'ออมทรัพย์ดอกเบี้ยสูง · ธ.ไทยพาณิชย์', owners: ['ชัย'], amount: 1800000, rate: 1.50, due: null, acctNo: '101-553-9921', receiving: true },
  { id: 'a42', type: 'sav', name: 'ออมทรัพย์ · ธ.กรุงไทย', owners: ['ครอบครัว'], amount: 720000, rate: 0.45, due: null, acctNo: '019-1-44820-2', receiving: true },
  { id: 'a43', type: 'gold', name: 'ทองรูปพรรณ 96.5%', owners: ['ธีรดา'], goldBaht: 15, rate: 0, due: null, acctNo: 'ตู้นิรภัย' },
  { id: 'a44', type: 'gold', name: 'ทองคำแท่ง 96.5% (ล็อต 2)', owners: ['วิวัฒน์'], goldBaht: 25, rate: 0, due: null, acctNo: 'ธ.ทิสโก้ Gold Wallet' },
  { id: 'a45', type: 'land', name: 'ที่ดินจัดสรร · ต.หนองปรือ บางละมุง', owners: ['วิวัฒน์'], deedNo: 'น.ส.4จ. 33471', rai: 2, ngan: 0, wa: 0, appraisal: 12000000, due: null, rate: 0, acctNo: 'โฉนด 33471' },
  { id: 'a46', type: 'land', name: 'คอนโด · The Base ศรีราชา', owners: ['ธีรดา'], deedNo: 'อ.ช.2 5521/118', rai: 0, ngan: 0, wa: 9, appraisal: 3200000, due: null, rate: 0, acctNo: 'ห้องชุด 118' },
  { id: 'a47', type: 'land', name: 'อาคารพาณิชย์ 3 ชั้น · ตลาดอ่างศิลา', owners: ['ชัย', 'ธีรดา'], deedNo: 'น.ส.4จ. 67120', rai: 0, ngan: 0, wa: 24, appraisal: 8500000, due: null, rate: 0, acctNo: 'โฉนด 67120' },
  { id: 'a48', type: 'other', name: 'รถยนต์ · Mercedes-Benz E-Class', owners: ['วิวัฒน์'], otherCat: 'ยานพาหนะ', otherVal: 2800000, due: null, rate: 0, acctNo: 'ทะเบียน ชบ 9 กข' },
  { id: 'a49', type: 'other', name: 'พระเครื่อง · ชุดเบญจภาคี', owners: ['ชัย'], otherCat: 'ของสะสม', otherVal: 3500000, due: null, rate: 0, acctNo: 'ตู้นิรภัย' },
  { id: 'a50', type: 'other', name: 'ภาพวาดสะสม · ศิลปินไทย', owners: ['ครอบครัว'], otherCat: 'งานศิลปะ', otherVal: 950000, due: null, rate: 0, acctNo: 'บ้านพักหลัก' },
];

export const rawAssets: RawAsset[] = baseAssets.concat(genMore());
