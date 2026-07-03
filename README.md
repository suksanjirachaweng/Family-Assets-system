# ระบบจัดเก็บสินทรัพย์ครอบครัว · Family Asset Registry

แอปติดตามสินทรัพย์ครอบครัว สร้างด้วย **React + Vite + TypeScript** จากดีไซน์ Claude Design
(handoff bundle อยู่ในโฟลเดอร์ `handoff/`)

## รันโปรเจกต์

```bash
npm install
npm run dev      # เปิด http://localhost:5173
npm run build    # type-check + build production
npm run preview  # ดู production build
```

## โครงสร้าง

```
src/
├── api/         # client เรียก backend (Apps Script); fallback เป็น mock เมื่อไม่ตั้งค่า
├── data/        # ชุดข้อมูล mock 100 รายการ, ผังเส้นทางเงิน, type ต่างๆ
├── lib/         # format ตัวเลข/วันที่ไทย, สี, คำนวณสินทรัพย์, auto-layout ผังเส้นทางเงิน
├── store/       # zustand store (data slice + loadData, view, filter, theme, ฟอร์ม ฯลฯ)
├── components/  # layout (header/nav/footer), common, detail, form
├── views/       # 8 หน้า: ภาพรวม สินทรัพย์ ขาย/ย้ายเงิน เส้นทางเงิน ปฏิทิน ประวัติ รายละเอียด ตั้งค่า LINE
└── styles/      # global.css (4 ธีม + print + responsive)

backend/         # Google Apps Script (Sheets + API + แจ้งเตือน LINE) — ดู backend/README.md
```

## ฟีเจอร์

- **8 หน้า**: ภาพรวมพอร์ต, รายการสินทรัพย์ (ค้นหา/กรอง), ขาย-ย้ายเงิน (จัดสรร FIFO),
  เส้นทางเงิน (ผัง auto-layout คลิกดูเฉพาะเส้นทาง), ปฏิทินครบกำหนด, ประวัติพอร์ต (กราฟแท่งซ้อน),
  รายละเอียดบัญชี (แผงเฉพาะประเภท), ตั้งค่าแจ้งเตือน LINE
- **8 ประเภทสินทรัพย์**: ฝากประจำ ออมทรัพย์ กองทุน หุ้นกู้ ทองคำ หุ้นสามัญ อสังหาฯ อื่นๆ
- **4 ธีม** (ดิน/มืด/กรมท่า/เทา-เขียวน้ำทะเล) + สลับภาษาไทย/อังกฤษ + พิมพ์/บันทึก PDF

## Backend (Google Sheets + LINE)

- ตั้งค่า `VITE_API_URL` ใน `.env` ให้ชี้ไปที่ Apps Script Web App แล้วแอปจะใช้ข้อมูลจริงจาก Sheet
- ถ้าเว้นว่าง แอปจะทำงานด้วย **mock data** ในเครื่อง (ใช้พัฒนา/เดโมได้ทันที)
- วิธีตั้งค่าครบทุกขั้น (สร้าง Sheet, deploy API, ต่อ LINE bot, ตั้งเวลาแจ้งเตือน): ดู [`backend/README.md`](backend/README.md)

## หมายเหตุ

- ปุ่มบันทึก (เพิ่มสินทรัพย์ / ตั้งค่า LINE / โยกย้ายเงิน) เรียก backend จริงเมื่อมี `VITE_API_URL`
  มิฉะนั้นจะปิดหน้าต่างเฉยๆ (โหมด mock)
- "วันนี้" ถูกตรึงไว้ที่ **26 มิ.ย. 2569 (2026-06-26)** ใน `src/lib/format.ts`
  เพื่อให้ตัวเลขวันครบกำหนดตรงกับดีไซน์ต้นฉบับ
- ราคาทองคำ (`GOLD_PRICE_PER_BAHT`) และอัตราภาษี ณ ที่จ่าย (`WHT_RATE`) อยู่ใน `src/lib/format.ts`
