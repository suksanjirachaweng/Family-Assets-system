/**
 * ข้อมูลตัวอย่างเริ่มต้น (50 รายการที่จัดทำด้วยมือ) — ใช้ seed ลง Sheet ครั้งแรก
 * เรียกจาก setup() · ลบ/แก้รายการเหล่านี้ได้ตามต้องการเมื่อเริ่มใช้ข้อมูลจริง
 */
function seedData_() {
  var A = SEED_ASSETS();
  var assetSheet = sheet_(SHEETS.ASSETS);
  var expenseSheet = sheet_(SHEETS.EXPENSES);
  var rows = A.map(function (a) { return assetToRow_(a); });
  if (rows.length) assetSheet.getRange(2, 1, rows.length, ASSET_HEADERS.length).setValues(rows);
  var exRows = [];
  A.forEach(function (a) {
    (a.expenses || []).forEach(function (e) { exRows.push([a.id, e.label, e.cat, e.amount, e.date]); });
  });
  if (exRows.length) expenseSheet.getRange(2, 1, exRows.length, EXPENSE_HEADERS.length).setValues(exRows);
  Logger.log('seed ' + rows.length + ' สินทรัพย์ + ' + exRows.length + ' ค่าใช้จ่าย');
}

function SEED_ASSETS() {
  return [
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
      { label: 'ภาษีที่ดินประจำปี', cat: 'ภาษี', amount: 47000, date: '2026-06-25' }
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
      { label: 'ค่าใช้จ่ายในบ้าน', cat: 'ที่อยู่อาศัย', amount: 45000, date: '2026-06-20' }
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
    { id: 'a50', type: 'other', name: 'ภาพวาดสะสม · ศิลปินไทย', owners: ['ครอบครัว'], otherCat: 'งานศิลปะ', otherVal: 950000, due: null, rate: 0, acctNo: 'บ้านพักหลัก' }
  ];
}
