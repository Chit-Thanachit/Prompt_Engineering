# AI Customer Service Assistant — ต้นแบบ (Prototype)

**รายวิชา:** BBAIS219 หัวข้อพิเศษในการพัฒนาซอฟต์แวร์
**ใบงานที่ 5:** พัฒนาต้นแบบ
**กรณีศึกษา:** ระบบผู้ช่วยตอบคำถามลูกค้าอัตโนมัติด้วย Prompt Engineering (AI Customer
Service Assistant) สำหรับร้านค้าออนไลน์ SME

ต้นแบบนี้พัฒนาต่อยอดจาก Business Problem, Functional/Non-Functional Requirements,
Use Case Diagram, Interface Design และ Workflow ที่ออกแบบไว้ในใบงานที่ 4

## Demo

- หน้าร้าน (มีวิดเจ็ตแชทลูกค้า): `index.html`
- แผงควบคุมแอดมิน: `admin.html`
- ทดลองใช้งานออนไลน์ผ่าน GitHub Pages: _ใส่ลิงก์หลัง deploy_ เช่น
  `https://<username>.github.io/<repo-name>/`

## เทคโนโลยีที่ใช้

- HTML5 / CSS3 / JavaScript (Vanilla, ไม่มี Framework และไม่ต้อง build)
- `localStorage` ของเบราว์เซอร์ ใช้จำลองฐานข้อมูลฝั่งแอดมิน (System Prompt, Few-shot,
  ฐานความรู้, ประวัติการสนทนา) เพื่อให้ต้นแบบทำงานได้จริงบน Static Hosting อย่าง
  GitHub Pages โดยไม่ต้องมี Backend/Database จริง

เหตุผลที่เลือก HTML/CSS/JavaScript ล้วน: ทดสอบและแก้ไขได้เร็ว, deploy ขึ้น GitHub
Pages ได้ทันทีโดยไม่ต้องตั้งค่า build pipeline, และเหมาะกับการสาธิตแนวคิด
(Proof of Concept) ของการนำ Prompt Engineering (System Prompt + Few-shot +
Retrieval-Augmented Context) มาออกแบบ Logic การตอบคำถาม ก่อนต่อยอดเป็นระบบ Production จริง

## โครงสร้างโปรเจกต์

```
prototype/
├── index.html          หน้าร้านตัวอย่าง + วิดเจ็ตแชทลูกค้า (หน้าจอที่ 1)
├── admin.html           แผงควบคุมแอดมิน (หน้าจอที่ 2)
├── css/
│   └── style.css        สไตล์ทั้งหมด (หน้าร้าน, แชท, แอดมิน)
├── js/
│   ├── data.js           ค่าเริ่มต้น + ฟังก์ชันจัดการ localStorage (จำลอง DB)
│   ├── engine.js          Prompt Engine: ประกอบพร้อมต์ / จับคู่ฐานความรู้ / คำนวณ confidence
│   ├── chat.js            Logic วิดเจ็ตแชทฝั่งลูกค้า
│   └── admin.js           Logic แผงควบคุมแอดมิน
├── .nojekyll             ปิดการประมวลผลผ่าน Jekyll บน GitHub Pages
└── README.md
```

## วิธีรันบนเครื่อง (Local)

ไม่ต้องติดตั้งอะไรเพิ่ม เปิดไฟล์ `index.html` ด้วยเบราว์เซอร์ได้ทันที หรือใช้ Live
Server / เว็บเซิร์ฟเวอร์เบา ๆ เพื่อประสบการณ์ที่ใกล้เคียงของจริงที่สุด เช่น

```bash
# python
python -m http.server 8000
# แล้วเปิด http://localhost:8000
```

## วิธี Deploy ขึ้น GitHub Pages

1. สร้าง Repository ใหม่บน GitHub (Public) เช่นชื่อ `ai-customer-service-prototype`
2. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ขึ้น Repository (หรือ `git push` ตามคำสั่งด้านล่าง)
3. ไปที่ **Settings → Pages**
4. ในหัวข้อ **Build and deployment** เลือก Source เป็น **Deploy from a branch**
5. เลือก Branch เป็น `main` และโฟลเดอร์เป็น `/ (root)` แล้วกด **Save**
6. รอสักครู่ ระบบจะให้ลิงก์เว็บไซต์ในรูปแบบ `https://<username>.github.io/<repo-name>/`

```bash
git init
git add .
git commit -m "AI Customer Service Assistant prototype (worksheet 5)"
git branch -M main
git remote add origin https://github.com/<username>/<repo-name>.git
git push -u origin main
```

## ฟังก์ชันที่ทำได้ (Implemented)

- ลูกค้าพิมพ์และส่งข้อความผ่านวิดเจ็ตแชทลอยมุมขวาล่างได้ (FR-01)
- ระบบประกอบพร้อมต์อัตโนมัติจาก System Prompt + Few-shot + ฐานความรู้ที่เกี่ยวข้อง +
  คำถามลูกค้า (FR-02)
- มี "AI Engine" แบบ rule-based/keyword matching ที่จำลองพฤติกรรมการตอบของ LLM
  ได้จริงโดยไม่ต้องพึ่งพา API ภายนอก ทำงานได้ 100% บน Static Hosting (FR-03 แบบจำลอง)
- ประเมินระดับความมั่นใจ (Confidence Score) ของคำตอบ และส่งต่อพนักงานจริงอัตโนมัติ
  เมื่อต่ำกว่าเกณฑ์ที่แอดมินกำหนดได้ (FR-04, NFR-03)
- แอดมินแก้ไข System Prompt และตัวอย่าง Few-shot ได้เองโดยไม่ต้องแก้โค้ด (FR-05)
- แอดมินเพิ่ม/แก้ไข/ลบฐานความรู้สินค้าและนโยบายร้านได้เอง (FR-06)
- แอดมินดูประวัติการสนทนาทั้งหมด กรองเฉพาะรายการที่ส่งต่อพนักงาน และกดปิดงานได้ (FR-07)
- แสดงสถานะ "กำลังพิมพ์..." ระหว่างรอคำตอบ (FR-08)
- ปุ่ม "คุยกับพนักงานจริง" ให้ลูกค้าขอความช่วยเหลือโดยตรงได้ทันที
- แดชบอร์ดสถิติภาพรวม: จำนวนข้อความวันนี้, อัตราตอบอัตโนมัติ, จำนวนที่ส่งต่อพนักงาน
- ข้อมูลทั้งหมด (System Prompt/Few-shot/ฐานความรู้/ประวัติ) บันทึกอยู่ใน `localStorage`
  ของเบราว์เซอร์ ทำให้การตั้งค่าคงอยู่แม้ปิด-เปิดเบราว์เซอร์ใหม่ (ในเครื่องเดียวกัน)
- ทางเลือกเสริม: เชื่อมต่อ LLM API จริง (รูปแบบ OpenAI-compatible) จากฝั่งแอดมิน
  เพื่อทดสอบการตอบด้วย Generative AI จริง (โดยมีระบบ fallback กลับไปใช้
  rule-based engine อัตโนมัติหากเรียก API ไม่สำเร็จ)

## ฟังก์ชันที่ยังทำไม่ได้ (Known Limitations)

- **ไม่มี Backend/Database จริง** ข้อมูลถูกเก็บใน `localStorage` ของเบราว์เซอร์
  แต่ละเครื่อง จึงไม่ได้ sync ข้ามอุปกรณ์ และไม่มีระบบสำรองข้อมูลส่วนกลาง
- **การเชื่อมต่อ LLM API จริงยังไม่เหมาะกับ Production** เพราะ API Key ถูกเรียกจาก
  ฝั่ง Client โดยตรง (เสี่ยงต่อการรั่วไหล) และบาง Provider อาจติดปัญหา CORS
  เมื่อเรียกจากเบราว์เซอร์โดยตรง
- **ยังไม่มีระบบยืนยันตัวตนผู้ดูแลระบบ (Admin Authentication)** ใครก็ตามที่เข้าถึง
  `admin.html` สามารถแก้ไขการตั้งค่าได้ทันที ยังไม่มี Login/สิทธิ์การเข้าถึง
- **ไม่มีการเชื่อมต่อช่องทางจริงของร้าน** เช่น LINE OA, Facebook Messenger หรือ
  ระบบแชทของพนักงานจริงแบบ Real-time (ปัจจุบันฝั่ง "ส่งต่อพนักงาน" เป็นเพียงการ
  บันทึก Log ไว้ให้แอดมินดู ยังไม่มีการแจ้งเตือนพนักงานแบบ Real-time)
- **ระบบจับคู่ความรู้เป็นแบบ Keyword Matching อย่างง่าย** ยังไม่ใช่ Semantic Search /
  Vector Embedding แบบ RAG ของจริง จึงอาจไม่แม่นยำเท่าที่ควรกับคำถามที่ใช้คำแตกต่าง
  จากที่ตั้งไว้ในฐานความรู้ (Synonym / รูปประโยคที่หลากหลาย)
- **ไม่รองรับหลายภาษาโดยอัตโนมัติ** (Multi-language detection) ต้นแบบออกแบบมาเพื่อ
  ภาษาไทยเป็นหลัก
- **ไม่มีการอัปโหลดไฟล์ฐานความรู้** (เช่น PDF นโยบายร้าน) ยังต้องพิมพ์/วางข้อความเอง
  ทีละรายการผ่านแบบฟอร์ม
- **ยังไม่มี Rate Limiting / มาตรการความปลอดภัยระดับ Production** เช่น การป้องกัน
  Prompt Injection จากผู้ใช้ปลายทาง หรือการจำกัดจำนวนคำขอต่อผู้ใช้

## แนวทางพัฒนาต่อ (Next Steps)

1. **สร้าง Backend กลาง** (เช่น Node.js/Express, Laravel หรือ Next.js API Routes)
   เพื่อเก็บ API Key ของ LLM ไว้ฝั่งเซิร์ฟเวอร์อย่างปลอดภัย และเป็นตัวกลางเรียก LLM
   API จริง (OpenAI, Claude, Gemini) แทนการเรียกจาก Client โดยตรง
2. **เปลี่ยนฐานข้อมูลจาก localStorage เป็นฐานข้อมูลจริง** (PostgreSQL/MySQL/Firebase)
   เพื่อให้ข้อมูลใช้งานร่วมกันได้หลายอุปกรณ์/หลายผู้ดูแล และสำรองข้อมูลได้
3. **ทำ RAG (Retrieval-Augmented Generation) แบบเต็มรูปแบบ** ด้วย Vector Database
   (เช่น pgvector, Pinecone) แทนการจับคู่ Keyword แบบง่าย เพื่อความแม่นยำที่สูงขึ้น
4. **เพิ่มระบบยืนยันตัวตน (Authentication/Authorization)** สำหรับแผงควบคุมแอดมิน
   พร้อมกำหนดสิทธิ์การเข้าถึงตามบทบาท (Role-based Access Control)
5. **เชื่อมต่อช่องทางจริงของร้าน** เช่น LINE Official Account API, Facebook
   Messenger Platform เพื่อให้ระบบตอบลูกค้าบนช่องทางที่ใช้งานจริง
6. **แจ้งเตือนพนักงานแบบ Real-time** เมื่อมีการส่งต่อคำถาม (เช่นผ่าน Web Socket,
   LINE Notify, หรือ Email/Push Notification)
7. **เพิ่มระบบวัดผลและปรับปรุงคุณภาพพร้อมต์อย่างต่อเนื่อง** เช่น เก็บ Feedback ความ
   พึงพอใจของลูกค้าหลังการตอบ เพื่อนำมาปรับ System Prompt/Few-shot ให้แม่นยำขึ้น
8. **เพิ่มการอัปโหลดเอกสาร** (PDF/Excel นโยบายร้าน) พร้อมระบบแยกข้อความอัตโนมัติ
   เข้าสู่ฐานความรู้ แทนการพิมพ์ทีละรายการ
9. **เสริมมาตรการความปลอดภัย** เช่น การตรวจจับและป้องกัน Prompt Injection,
   Rate Limiting, และการกรองข้อมูลอ่อนไหวตาม NFR-05

## หมายเหตุ

โปรเจกต์นี้จัดทำเพื่อการศึกษาในรายวิชา BBAIS219 หัวข้อพิเศษในการพัฒนาซอฟต์แวร์
ข้อมูลสินค้า ร้านค้า และบทสนทนาทั้งหมดเป็นข้อมูลสมมติสำหรับสาธิตแนวคิดเท่านั้น
