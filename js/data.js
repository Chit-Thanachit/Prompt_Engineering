/* ============================================================
   data.js
   ค่าเริ่มต้นของระบบ + ฟังก์ชันจัดการ localStorage
   (จำลองฐานข้อมูลฝั่งเซิร์ฟเวอร์ด้วย localStorage ของเบราว์เซอร์
    เพื่อให้ต้นแบบทำงานได้จริงบน GitHub Pages โดยไม่ต้องมี Backend)
   ============================================================ */

const STORAGE_KEYS = {
  CONFIG: "aics_config",
  SYSTEM_PROMPT: "aics_system_prompt",
  FEWSHOT: "aics_fewshot",
  KB: "aics_kb",
  CONVERSATIONS: "aics_conversations",
};

const DEFAULT_CONFIG = {
  shopName: "ร้าน Good Everyday (SME ตัวอย่าง)",
  confidenceThreshold: 55, // % ความมั่นใจขั้นต่ำก่อนตอบอัตโนมัติ (NFR-03)
  useRealApi: false,
  // apiProvider: "gemini" (แนะนำ — มี Free Tier เรียกตรงจากเบราว์เซอร์ได้เลย)
  //           หรือ "openai" (รูปแบบ OpenAI-compatible เช่น OpenAI, Groq, Together ฯลฯ)
  apiProvider: "gemini",
  apiBaseUrl: "https://api.openai.com/v1/chat/completions", // ใช้เฉพาะโหมด openai
  apiKey: "",
  apiModel: "gemini-2.0-flash", // โมเดลฟรีของ Gemini ที่เร็วและเพียงพอสำหรับแชทบอท
  // จำนวนคู่สนทนาก่อนหน้าที่จะส่งกลับเข้าไปเป็น context ให้ AI ต่อเนื่อง (multi-turn)
  historyTurns: 6,
};

const DEFAULT_SYSTEM_PROMPT =
`คุณคือ "น้องช่วยดี" ผู้ช่วยตอบคำถามลูกค้าประจำร้านค้าออนไลน์ SME

บทบาทของคุณ (Role Prompting):
- เป็นทั้งพนักงานต้อนรับ, พนักงานขาย และพนักงานบริการหลังการขายในคนเดียว
- ตอบคำถามลูกค้าด้วยน้ำเสียงสุภาพ เป็นกันเอง อบอุ่นเหมือนคุยกับคนจริง ไม่ตอบแบบท่องสคริปต์
- ปรับความยาวคำตอบตามความซับซ้อนของคำถาม: คำถามง่ายตอบกระชับ 1-2 ประโยค
  คำถามที่ต้องอธิบายหลายขั้นตอนสามารถตอบยาวขึ้นได้ พร้อมจัดลำดับให้อ่านง่าย
- จดจำบริบทของบทสนทนาก่อนหน้า หากลูกค้าถามคำถามต่อเนื่อง (เช่น "แล้วอันนี้ล่ะ")
  ให้เชื่อมโยงกับหัวข้อที่คุยค้างไว้แทนที่จะถามซ้ำ
- เมื่อเหมาะสม ให้เสนอความช่วยเหลือเพิ่มเติมหรือแนะนำสินค้า/โปรโมชันที่เกี่ยวข้อง (Upsell) อย่างไม่ยัดเยียด
- หากลูกค้าแสดงอารมณ์ไม่พอใจ ให้แสดงความเห็นใจก่อนเสมอ ก่อนเสนอทางแก้ไข

กฎการใช้ข้อมูล (Guardrails ป้องกัน Hallucination):
- ใช้ข้อเท็จจริง (ตัวเลข ราคา นโยบาย) จาก "ฐานความรู้สินค้าและนโยบายร้าน" เท่านั้น
  ห้ามสร้างตัวเลขหรือเงื่อนไขที่ไม่มีอยู่จริงขึ้นมาเอง
- สามารถใช้ภาษาของคุณเองในการอธิบาย เรียบเรียง หรือขยายความข้อมูลนั้นให้เป็นธรรมชาติได้
  ตราบใดที่เนื้อหาข้อเท็จจริงยังตรงกับฐานความรู้
- หากคำถามอยู่นอกเหนือฐานความรู้ หรือมีความซับซ้อน/อ่อนไหว (เช่น ร้องเรียน คืนเงินกรณีพิเศษ
  ต่อรองราคา) ให้แจ้งลูกค้าอย่างสุภาพว่าจะส่งต่อให้พนักงานดูแลต่อ อย่าคาดเดาคำตอบเอง
- ลงท้ายประโยคด้วยคำว่า "ค่ะ/ครับ" ให้เหมาะสมกับบริบทร้านค้าไทย`;

const DEFAULT_FEWSHOT = [
  {
    user: "พัสดุจะถึงกี่วันคะ",
    assistant:
      "ปกติจัดส่งภายใน 2-4 วันทำการหลังยืนยันคำสั่งซื้อค่ะ ถ้าต้องการเช็กสถานะพัสดุ ส่งเลขคำสั่งซื้อมาได้เลยนะคะ 😊",
  },
  {
    user: "อยากคืนสินค้าเพราะไซซ์ไม่พอดี ทำยังไงดี",
    assistant:
      "แจ้งคืน/เปลี่ยนสินค้าได้ภายใน 7 วันหลังได้รับสินค้า โดยสินค้าต้องไม่ผ่านการใช้งานค่ะ รบกวนแจ้งเลขคำสั่งซื้อ เดี๋ยวแอดมินจะช่วยดำเนินการต่อให้นะคะ",
  },
  {
    user: "แล้วค่าส่งล่ะคะ ถ้าซื้อเยอะ",
    assistant:
      "ค่าส่งเริ่มต้น 40 บาทค่ะ แต่ถ้าช้อปครบ 990 บาทขึ้นไปส่งฟรีทันทีเลยค่ะ คุ้มกว่าเยอะถ้าซื้อรวมกันในออเดอร์เดียว 🙌",
  },
  {
    user: "สินค้าที่ได้รับมามีตำหนิ ไม่พอใจมากเลย",
    assistant:
      "ขอโทษด้วยจริง ๆ ค่ะที่ทำให้ผิดหวังแบบนี้ 🙏 เรื่องนี้สำคัญ ขอส่งต่อให้พนักงานดูแลเคสให้โดยเฉพาะนะคะ รบกวนแจ้งเลขคำสั่งซื้อและรูปสินค้าที่มีตำหนิได้เลยค่ะ",
  },
];

const DEFAULT_KB = [
  {
    id: "kb1",
    category: "การจัดส่ง",
    keywords: ["จัดส่ง", "ส่งของ", "พัสดุ", "กี่วัน", "ส่งกี่วัน", "delivery"],
    question: "จัดส่งสินค้ากี่วันถึง / ค่าส่งเท่าไหร่",
    answer:
      "จัดส่งภายใน 2-4 วันทำการค่ะ ค่าส่งเริ่มต้น 40 บาท และฟรีค่าส่งเมื่อซื้อครบ 990 บาทขึ้นไปค่ะ",
  },
  {
    id: "kb2",
    category: "การชำระเงิน",
    keywords: ["ชำระเงิน", "จ่ายเงิน", "โอนเงิน", "บัตรเครดิต", "ผ่อน", "payment"],
    question: "ชำระเงินช่องทางไหนได้บ้าง",
    answer:
      "รับชำระผ่านโอนธนาคาร, พร้อมเพย์, บัตรเครดิต/เดบิต และเก็บเงินปลายทาง (COD) ค่ะ",
  },
  {
    id: "kb3",
    category: "การคืนสินค้า",
    keywords: ["คืนสินค้า", "เปลี่ยนสินค้า", "คืนเงิน", "ไซซ์ไม่พอดี", "return", "refund"],
    question: "นโยบายคืน/เปลี่ยนสินค้าเป็นอย่างไร",
    answer:
      "คืน/เปลี่ยนสินค้าได้ภายใน 7 วันหลังได้รับสินค้า สินค้าต้องอยู่ในสภาพเดิม ไม่ผ่านการใช้งานค่ะ รบกวนแจ้งเลขคำสั่งซื้อเพื่อดำเนินการต่อค่ะ",
  },
  {
    id: "kb4",
    category: "สินค้า",
    keywords: ["สต็อก", "มีของไหม", "ไซซ์", "สี", "ขนาด", "สินค้าหมด"],
    question: "เช็กสต็อกสินค้า / ไซซ์ / สี ที่มี",
    answer:
      "รบกวนแจ้งชื่อหรือรหัสสินค้าที่สนใจ แอดมินจะเช็กสต็อก ไซซ์ และสีที่มีให้ทันทีค่ะ",
  },
  {
    id: "kb5",
    category: "โปรโมชัน",
    keywords: ["โปรโมชัน", "ส่วนลด", "โค้ดส่วนลด", "ลดราคา", "promotion", "discount"],
    question: "มีโปรโมชันหรือโค้ดส่วนลดไหม",
    answer:
      "ตอนนี้มีโปรลดสูงสุด 15% สำหรับลูกค้าใหม่ ใช้โค้ด WELCOME15 ตอนชำระเงินได้เลยค่ะ",
  },
  {
    id: "kb6",
    category: "เวลาทำการ",
    keywords: ["เวลาทำการ", "เปิดกี่โมง", "ปิดกี่โมง", "ติดต่อพนักงาน", "แอดมิน"],
    question: "ร้านเปิด-ปิดกี่โมง / ติดต่อแอดมินได้เวลาไหน",
    answer:
      "แชทบอทตอบได้ตลอด 24 ชั่วโมงค่ะ ส่วนแอดมินตัวจริงพร้อมตอบเพิ่มเติมทุกวัน 09:00-21:00 น. ค่ะ",
  },
];

/* ---------------- Storage helpers ---------------- */

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn("loadJSON failed for", key, e);
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("saveJSON failed for", key, e);
  }
}

function getConfig() {
  return { ...DEFAULT_CONFIG, ...loadJSON(STORAGE_KEYS.CONFIG, {}) };
}
function setConfig(cfg) {
  saveJSON(STORAGE_KEYS.CONFIG, cfg);
}

function getSystemPrompt() {
  const v = localStorage.getItem(STORAGE_KEYS.SYSTEM_PROMPT);
  return v !== null ? v : DEFAULT_SYSTEM_PROMPT;
}
function setSystemPrompt(text) {
  localStorage.setItem(STORAGE_KEYS.SYSTEM_PROMPT, text);
}

function getFewshot() {
  return loadJSON(STORAGE_KEYS.FEWSHOT, DEFAULT_FEWSHOT);
}
function setFewshot(list) {
  saveJSON(STORAGE_KEYS.FEWSHOT, list);
}

function getKB() {
  return loadJSON(STORAGE_KEYS.KB, DEFAULT_KB);
}
function setKB(list) {
  saveJSON(STORAGE_KEYS.KB, list);
}

function getConversations() {
  return loadJSON(STORAGE_KEYS.CONVERSATIONS, []);
}
function setConversations(list) {
  saveJSON(STORAGE_KEYS.CONVERSATIONS, list);
}
function addConversation(entry) {
  const list = getConversations();
  list.unshift(entry); // ใหม่สุดอยู่บนสุด
  setConversations(list);
  return list;
}

function resetAllDemoData() {
  Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
}

function uid(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
