# Backend — Google Apps Script + Google Sheets + LINE

backend นี้ทำหน้าที่ 3 อย่างในที่เดียว (ฟรี ไม่ต้อง host เซิร์ฟเวอร์เอง):

1. **ฐานข้อมูล** — เก็บสินทรัพย์/ค่าใช้จ่าย/การโยกย้าย/ตั้งค่า บน Google Sheets
2. **API (Web App)** — ให้เว็บแอป React เรียก `GET`/`POST`
3. **แจ้งเตือน LINE** — ส่งข้อความเข้ากลุ่ม LINE ตามเวลาที่ตั้ง (time-trigger ในตัว)

ไฟล์: `Code.gs` (ตรรกะหลัก), `seed.gs` (ข้อมูลตัวอย่าง 50 รายการ), `appsscript.json` (manifest)

---

## ขั้นตอนที่ 1 — สร้าง Sheet + วางสคริปต์

1. ไปที่ <https://sheets.new> สร้าง Google Sheet ใหม่ (ตั้งชื่ออะไรก็ได้ เช่น "สินทรัพย์ครอบครัว DB")
2. เมนู **Extensions → Apps Script** จะเปิดหน้าต่าง Apps Script
3. ลบโค้ดตัวอย่างใน `Code.gs` ออก แล้ว **คัดลอกเนื้อหาจาก `backend/Code.gs`** มาวาง
4. กด **+ → Script** สร้างไฟล์ใหม่ชื่อ `seed` แล้ววางเนื้อหาจาก `backend/seed.gs`
5. (ไม่บังคับ) เปิด `appsscript.json`: เมนู ⚙️ **Project Settings → ติ๊ก "Show appsscript.json"**
   แล้ววางเนื้อหาจาก `backend/appsscript.json` ทับ — ช่วยตั้ง scope + timezone ให้ครบ

## ขั้นตอนที่ 2 — สร้างชีต + ใส่ข้อมูลตัวอย่าง

1. ในแถบฟังก์ชันด้านบน เลือก **`setup`** แล้วกด **Run** ▶
2. ครั้งแรกจะขออนุญาตเข้าถึง Sheets/External request → กด **Review permissions → เลือกบัญชี → Allow**
3. กลับไปดู Google Sheet จะเห็น 4 ชีต: `Assets`, `Expenses`, `Moves`, `Settings` พร้อมข้อมูลตัวอย่าง

> ลบ/แก้รายการตัวอย่างได้ตามต้องการเมื่อเริ่มกรอกข้อมูลจริง

## ขั้นตอนที่ 3 — Deploy เป็น Web App (API)

1. กด **Deploy → New deployment**
2. ไอคอนเฟือง ⚙️ → เลือก **Web app**
3. ตั้งค่า:
   - **Description**: family-asset-api
   - **Execute as**: **Me** (บัญชีคุณ)
   - **Who has access**: **Anyone**  ← สำคัญ เพื่อให้เว็บแอปเรียกได้
4. กด **Deploy** → คัดลอก **Web app URL** (ลงท้ายด้วย `/exec`)

> ทุกครั้งที่แก้ `Code.gs` แล้วอยากให้มีผลกับ API ต้อง **Deploy → Manage deployments → ✏️ → New version**
> (หรือใช้ URL `/dev` ระหว่างพัฒนา ซึ่งใช้โค้ดล่าสุดเสมอแต่จำกัดสิทธิ์เข้าถึง)

## ขั้นตอนที่ 4 — ต่อกับเว็บแอป React

1. ที่โฟลเดอร์โปรเจกต์ คัดลอก `.env.example` เป็น `.env`
2. ใส่ URL ที่ได้:
   ```
   VITE_API_URL=https://script.google.com/macros/s/XXXXX/exec
   ```
3. รีสตาร์ท `npm run dev` — เว็บจะดึงข้อมูลจาก Sheet แทน mock อัตโนมัติ
   (ถ้าเว้น `VITE_API_URL` ว่าง เว็บจะกลับไปใช้ mock ในเครื่อง)

---

## ขั้นตอนที่ 5 — ตั้งค่า LINE (ทำทีหลังได้)

ใช้ **LINE Messaging API** ส่งข้อความเข้ากลุ่ม

1. ไปที่ <https://developers.line.biz/console/> → สร้าง **Provider** → สร้าง **Messaging API channel**
2. ในแท็บ **Messaging API**:
   - คัดลอก **Channel access token (long-lived)** (กด Issue ถ้ายังไม่มี)
   - ปิด *Auto-reply*/*Greeting* ได้ตามต้องการ
3. **เพิ่มบอทเข้ากลุ่ม**: สแกน QR ของบอท แล้วเชิญเข้ากลุ่ม "การเงินครอบครัว"
4. **หา Group ID**: วิธีง่ายสุดคือตั้ง webhook ชั่วคราวเพื่ออ่าน `source.groupId` จาก event
   (หรือใช้เครื่องมือช่วยอย่าง LINE webhook tester) — Group ID จะขึ้นต้นด้วย `C...`
5. กลับมาที่ Apps Script → ⚙️ **Project Settings → Script Properties → Add script property** ใส่ 2 ค่า:
   | Property | Value |
   |---|---|
   | `LINE_CHANNEL_ACCESS_TOKEN` | (token จากข้อ 2) |
   | `LINE_GROUP_ID` | (group id จากข้อ 4) |

   > ส่งเข้าได้มากกว่า 1 กลุ่ม: ใส่หลาย group id คั่นด้วยจุลภาคใน `LINE_GROUP_ID` เดียวกัน
   > เช่น `C111...,C222...` — เชิญบอทเข้าแต่ละกลุ่มแล้วหา group id ด้วยวิธีในข้อ 4 ก่อน
6. ทดสอบ: เลือกฟังก์ชัน **`sendDailyNotifications`** กด Run แล้วดูว่ามีข้อความเข้ากลุ่มไหม
   (หรือ POST `{"action":"sendTest"}` มาที่ Web App URL)

## ขั้นตอนที่ 6 — ตั้งเวลาแจ้งเตือนอัตโนมัติ

1. เลือกฟังก์ชัน **`installTriggers`** กด **Run** ▶ ครั้งเดียว
2. ระบบจะสร้าง trigger รายวันตามเวลาใน Settings (`lineTime`, ค่าเริ่มต้น 09:00)
   - แจ้งเตือนครบกำหนดตามช่วงที่ตั้ง (30/7/1 วัน) เฉพาะประเภทที่เปิด
   - สรุปพอร์ตทุกวันที่ 1 ของเดือน
   - การโยกย้ายเงิน > 1 ล้านบาท จะแจ้งทันทีตอนกดบันทึก
3. ถ้าเปลี่ยนเวลาส่ง ให้บันทึกการตั้งค่าจากหน้าเว็บ แล้วรัน `installTriggers` ใหม่อีกครั้ง

---

## โครงสร้างข้อมูลใน Sheet

- **Assets**: `id, type, name, owners(คั่นด้วย ·), acctNo, amount, rate, due, units, navBuy, navNow,
  goldBaht, shares, priceBuy, priceNow, deedNo, rai, ngan, wa, appraisal, otherCat, otherVal,
  receiving, iAcctBank, iAcctNo, iAcctOwners`
- **Expenses**: `assetId, label, cat, amount, date` (ผูกกับบัญชีออมทรัพย์)
- **Moves**: `id, date, title, detail` (ประวัติการโยกย้าย)
- **Settings**: `key, value` (ค่า JSON สำหรับ lineLead/lineTypes ฯลฯ + goldPricePerBaht, whtRate)

## API ที่มี

| Method | ตัวอย่าง | ผลลัพธ์ |
|---|---|---|
| `GET ?resource=all` | โหลด assets + moves + settings | `{ ok, data }` |
| `POST {action:'createAsset', payload}` | เพิ่มสินทรัพย์ | `{ ok, data:{id} }` |
| `POST {action:'updateAsset', payload}` | แก้ไข (payload มี id) | `{ ok }` |
| `POST {action:'deleteAsset', payload:{id}}` | ลบ | `{ ok }` |
| `POST {action:'recordMove', payload}` | บันทึกการโยกย้าย | `{ ok }` |
| `POST {action:'saveSettings', payload}` | บันทึกตั้งค่า LINE | `{ ok }` |

> หมายเหตุ: เว็บส่ง POST แบบ `text/plain` เพื่อเลี่ยง CORS preflight ที่ Apps Script ตอบไม่ได้
