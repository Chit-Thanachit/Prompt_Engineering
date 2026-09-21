/* ============================================================
   engine.js
   "Prompt Engine" จำลองการทำงานของ LLM ฝั่ง Client
   ประกอบพร้อมต์จาก System Prompt + Few-shot + ฐานความรู้ + ประวัติการสนทนา + คำถามลูกค้า
   แล้วประเมิน Confidence Score เพื่อตัดสินใจตอบอัตโนมัติ หรือส่งต่อพนักงาน
   (FR-02, FR-03, FR-04)

   สองโหมดการตอบ:
   1) Rule-based Engine (matchKnowledgeBase + composeAnswer) — ทำงานได้ 100% บน
      GitHub Pages โดยไม่ต้องมี Backend/API Key แต่เสริมให้ "ดูเป็น AI" มากขึ้นด้วย
      การจับคู่แบบยืดหยุ่น, การรวมหลายหัวข้อ, การจดจำบริบทsubject, และการสลับสำนวน
   2) Real LLM Engine (callRealLLM) — เรียก LLM จริงจากฝั่งเบราว์เซอร์ (Gemini ฟรี
      หรือ OpenAI-compatible) เพื่อให้ AI ใช้ Prompt Engineering เต็มรูปแบบ ตอบได้
      หลากหลายและเป็นธรรมชาติกว่ามาก — มี fallback กลับไป rule-based อัตโนมัติ
      หากเรียก API ไม่สำเร็จ
   ============================================================ */

/* ---------------- ข้อความเสริมสำนวน (สาธิตความ "เป็นธรรมชาติ" ของ Prompt Engineering) --------- */
const OPENERS = ["", "ได้เลยค่ะ ", "รับทราบค่ะ ", "แจ้งข้อมูลให้เลยนะคะ ", "โอเคค่ะ "];
const CLOSERS = [
  "",
  " มีอะไรให้ช่วยเพิ่มเติมอีกไหมคะ 😊",
  " สอบถามเพิ่มเติมได้เลยนะคะ",
  " หากต้องการรายละเอียดเพิ่มเติมแจ้งได้เลยค่ะ",
];

function pickVariant(list, seedText) {
  // เลือกสำนวนแบบกึ่งสุ่มแต่ยึดตาม hash ของข้อความ เพื่อให้ผลลัพธ์เดา/ทดสอบซ้ำได้
  let hash = 0;
  for (let i = 0; i < seedText.length; i++) hash = (hash * 31 + seedText.charCodeAt(i)) >>> 0;
  return list[hash % list.length];
}

/**
 * ประกอบพร้อมต์แบบเต็มตามแนวทาง Prompt Engineering
 * (System Prompt + Few-shot Examples + Retrieved Knowledge + ประวัติการสนทนา + คำถามลูกค้า)
 */
function buildComposedPrompt(customerMessage, { systemPrompt, fewshot, retrieved, history }) {
  const fewshotText = fewshot
    .map((ex) => `ลูกค้า: ${ex.user}\nผู้ช่วย: ${ex.assistant}`)
    .join("\n\n");

  const retrievedText = retrieved
    .map((r) => `- [${r.category}] ${r.question} => ${r.answer}`)
    .join("\n");

  const historyText = (history || [])
    .map((h) => `ลูกค้า: ${h.question}\nผู้ช่วย: ${h.answer}`)
    .join("\n\n");

  return [
    `### System Prompt (บทบาท + กฎ)`,
    systemPrompt,
    ``,
    `### Few-shot Examples (ตัวอย่างสำนวนที่ต้องการ)`,
    fewshotText || "(ไม่มี)",
    ``,
    `### ประวัติการสนทนาล่าสุด (Conversation Memory)`,
    historyText || "(เริ่มบทสนทนาใหม่)",
    ``,
    `### ฐานความรู้ที่เกี่ยวข้อง (Retrieved Context)`,
    retrievedText || "(ไม่พบข้อมูลที่เกี่ยวข้องในฐานความรู้)",
    ``,
    `### คำถามล่าสุดของลูกค้า`,
    customerMessage,
  ].join("\n");
}

/** normalize แบบยืดหยุ่น: ตัวพิมพ์เล็ก, ตัดช่องว่าง/วรรคตอนออกทั้งหมด เพื่อทนต่อการเว้นวรรค/พิมพ์ติดกันต่างกัน */
function normalize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[\s.,!?๐-๙0-9()"'“”‘’ๆฯ]/g, "")
    .trim();
}

const REFERENT_WORDS = ["แล้ว", "อันนี้", "อีก", "เพิ่ม", "ด้วย", "งั้น", "ล่ะ", "มั้ย", "ไหม"];

/* ---------------- Small talk (ทักทาย/ขอบคุณ/ลาก่อน) ----------------
   เพื่อให้แชทบอทรู้สึก "เป็น AI" ตั้งแต่คำแรกที่คุย แม้ยังไม่ได้เปิด LLM จริง
   ไม่ต้องพึ่งฐานความรู้สินค้าเลย เพราะเป็นมารยาทการสนทนาพื้นฐาน ไม่ใช่ข้อเท็จจริง
   ที่ต้องล็อกกับฐานความรู้ (จึงไม่เข้าเงื่อนไข Hallucination guardrail) */
const SMALL_TALK = [
  {
    triggers: ["สวัสดี", "หวัดดี", "หวัดดีครับ", "หวัดดีค่ะ", "hello", "hi ", "hi", "ดีครับ", "ดีค่ะ"],
    replies: [
      "สวัสดีค่ะ 👋 มีอะไรให้น้องช่วยดีช่วยได้บ้างคะ ถามเรื่องสินค้า การจัดส่ง หรือโปรโมชันได้เลยค่ะ",
      "สวัสดีค่ะ ยินดีต้อนรับนะคะ 😊 วันนี้สนใจเรื่องไหนเป็นพิเศษไหมคะ",
    ],
  },
  {
    triggers: ["ขอบคุณ", "ขอบใจ", "thank", "thanks", "ขอบคุณค่ะ", "ขอบคุณครับ"],
    replies: [
      "ยินดีค่ะ 🙏 มีอะไรให้ช่วยเพิ่มเติมอีกไหมคะ",
      "ด้วยความยินดีค่ะ หากมีคำถามอื่นถามมาได้เลยนะคะ",
    ],
  },
  {
    triggers: ["บาย", "ลาก่อน", "แล้วเจอกัน", "bye"],
    replies: ["ขอบคุณที่แวะมาคุยนะคะ 👋 แล้วกลับมาช้อปใหม่นะคะ", "บายค่ะ ไว้กลับมาคุยกันใหม่นะคะ 😊"],
  },
  {
    triggers: ["เป็นไงบ้าง", "สบายดีไหม", "สบายดีมั้ย", "how are you"],
    replies: ["สบายดีค่ะ ขอบคุณที่ถามนะคะ 😊 มีอะไรให้ช่วยเรื่องร้านค้าไหมคะ"],
  },
];

function matchSmallTalk(customerMessage) {
  const msg = normalize(customerMessage);
  // จำกัดเฉพาะข้อความสั้น ๆ เพื่อไม่ให้ไปทับคำถามจริงจังที่บังเอิญมีคำว่า "ขอบคุณ" ปนอยู่
  if (msg.length > 20) return null;
  for (const group of SMALL_TALK) {
    if (group.triggers.some((t) => msg.includes(normalize(t)))) {
      return pickVariant(group.replies, customerMessage);
    }
  }
  return null;
}

/**
 * จับคู่คำถามลูกค้ากับฐานความรู้ด้วยการนับ keyword ที่ตรงกัน (substring match แบบ normalize)
 * คืนค่ารายการที่เรียงจากคะแนนมากไปน้อย พร้อม confidence (0-1)
 */
function matchKnowledgeBase(customerMessage, kb, lastCategory) {
  const msg = normalize(customerMessage);
  const isShortFollowup =
    msg.length > 0 &&
    msg.length <= 40 &&
    REFERENT_WORDS.some((w) => customerMessage.includes(w));

  const scored = kb.map((entry) => {
    const keywords = entry.keywords || [];
    const matched = keywords.filter((kw) => kw && msg.includes(normalize(kw)));
    let score = 0;
    if (matched.length === 1) score = 0.6;
    else if (matched.length >= 2) score = Math.min(1, 0.8 + 0.1 * matched.length);

    // Context carry: ถ้าเป็นคำถามสั้น ๆ ที่พาดพิงถึงเรื่องก่อนหน้า (เช่น "แล้วค่าส่งล่ะ")
    // และยังไม่พบ keyword ตรง ๆ ให้ดึงหัวข้อ (category) ที่คุยค้างไว้กลับมาช่วยตอบต่อ
    if (score === 0 && isShortFollowup && lastCategory && entry.category === lastCategory) {
      score = 0.55;
    }
    return { entry, score, matched };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

/**
 * ประกอบคำตอบจากฐานความรู้ 1 รายการ (หรือมากกว่า หากคำถามพาดพิงหลายหัวข้อ) โดยแต่งสำนวน
 * ให้เป็นธรรมชาติขึ้นด้วย Opener/Closer แทนการตอบคำเดิมซ้ำ ๆ ทุกครั้ง
 */
function composeAnswer(customerMessage, matchedEntries) {
  const opener = pickVariant(OPENERS, customerMessage);
  const closer = pickVariant(CLOSERS, customerMessage + "x");

  if (matchedEntries.length === 1) {
    return `${opener}${matchedEntries[0].answer}${closer}`;
  }
  // รวมหลายหัวข้อเข้าด้วยกัน (เช่น ลูกค้าถามทั้งเรื่องจัดส่งและการชำระเงินในข้อความเดียว)
  const combined = matchedEntries
    .map((e) => `• ${e.answer}`)
    .join("\n");
  return `${opener}สรุปให้เลยนะคะ\n${combined}${closer}`;
}

/**
 * ฟังก์ชันหลัก (Rule-based Engine): รับคำถามลูกค้า + ประวัติ + หัวข้อล่าสุด
 * -> คืนค่า { answer, confidence, retrieved, escalate, composedPrompt, category }
 */
function runPromptEngine(customerMessage, history = [], lastCategory = null) {
  const systemPrompt = getSystemPrompt();
  const fewshot = getFewshot();
  const kb = getKB();
  const config = getConfig();

  // เช็ค small talk ก่อนเสมอ (ทักทาย/ขอบคุณ) — ตอบได้ทันทีแบบมั่นใจสูงสุด
  const smallTalkReply = matchSmallTalk(customerMessage);
  if (smallTalkReply) {
    const composedPrompt = buildComposedPrompt(customerMessage, {
      systemPrompt,
      fewshot,
      retrieved: [],
      history,
    });
    return {
      answer: smallTalkReply,
      confidence: 100,
      retrieved: [],
      escalate: false,
      composedPrompt,
      kbMatch: null,
      category: "small_talk",
    };
  }

  const ranked = matchKnowledgeBase(customerMessage, kb, lastCategory);
  const top = ranked[0];
  const second = ranked[1];

  // ตรวจว่าควรรวมคำตอบจาก 2 หัวข้อหรือไม่ (คำถามยาว มีคะแนนสูงทั้งคู่ และคนละหมวด)
  const shouldCombine =
    top &&
    second &&
    top.score >= 0.6 &&
    second.score >= 0.6 &&
    top.entry.category !== second.entry.category &&
    customerMessage.length >= 12;

  const matchedForAnswer = shouldCombine ? [top.entry, second.entry] : top && top.score > 0 ? [top.entry] : [];

  const confidence = top ? Math.round(top.score * 100) : 0;
  const retrieved = ranked
    .filter((r) => r.score > 0)
    .slice(0, 3)
    .map((r) => r.entry);

  const composedPrompt = buildComposedPrompt(customerMessage, {
    systemPrompt,
    fewshot,
    retrieved,
    history,
  });

  const escalate = confidence < config.confidenceThreshold;

  let answer;
  let category = null;
  if (!escalate && matchedForAnswer.length > 0) {
    answer = composeAnswer(customerMessage, matchedForAnswer);
    category = matchedForAnswer[0].category;
  } else {
    answer =
      "ขออภัยค่ะ คำถามนี้ต้องขอส่งต่อให้พนักงานเป็นผู้ดูแลต่อเพื่อความถูกต้อง รบกวนรอสักครู่นะคะ 🙏";
  }

  return { answer, confidence, retrieved, escalate, composedPrompt, kbMatch: top, category };
}

/* ================= Real LLM Integration (ทางเลือกเสริม) ================= */

/**
 * เรียก LLM API จริงจากฝั่งเบราว์เซอร์ — รองรับ 2 รูปแบบ:
 * - "gemini": Google Gemini API (มี Free Tier, ขอ API Key ฟรีได้ที่ aistudio.google.com/apikey
 *   และเรียกตรงจากเบราว์เซอร์ได้โดยไม่ติด CORS) — เป็นค่าเริ่มต้นที่แนะนำ
 * - "openai": รูปแบบ OpenAI-compatible (OpenAI, Groq, Together ฯลฯ) ใช้ทดสอบส่วนตัวเท่านั้น
 *   เพราะ API Key ถูกเรียกจาก Client โดยตรง
 */
async function callRealLLM(customerMessage, { systemPrompt, fewshot, retrieved, history }) {
  const config = getConfig();
  if (!config.apiKey) {
    throw new Error("real-api-not-configured");
  }

  const retrievedText = retrieved.map((r) => `- ${r.question}: ${r.answer}`).join("\n");
  const fullSystem = `${systemPrompt}\n\nฐานความรู้ที่เกี่ยวข้องกับคำถามนี้:\n${retrievedText || "(ไม่พบ — หากคำถามไม่เกี่ยวกับร้าน ให้แจ้งว่าจะส่งต่อพนักงาน)"}`;

  if (config.apiProvider === "gemini") {
    return callGemini(customerMessage, fullSystem, fewshot, history, config);
  }
  return callOpenAICompatible(customerMessage, fullSystem, fewshot, history, config);
}

async function callGemini(customerMessage, fullSystem, fewshot, history, config) {
  const model = config.apiModel || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(config.apiKey)}`;

  const contents = [];
  fewshot.forEach((ex) => {
    contents.push({ role: "user", parts: [{ text: ex.user }] });
    contents.push({ role: "model", parts: [{ text: ex.assistant }] });
  });
  (history || []).forEach((h) => {
    contents.push({ role: "user", parts: [{ text: h.question }] });
    contents.push({ role: "model", parts: [{ text: h.answer }] });
  });
  contents.push({ role: "user", parts: [{ text: customerMessage }] });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: fullSystem }] },
      contents,
      generationConfig: { temperature: 0.6, maxOutputTokens: 400 },
    }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const errJson = await res.json();
      detail = errJson?.error?.message || "";
    } catch (_) {
      /* ignore parse error */
    }
    throw new Error(`Gemini API ${res.status}${detail ? ": " + detail : ""}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("");
  if (!text) {
    const blockReason = data?.promptFeedback?.blockReason;
    throw new Error(blockReason ? `Gemini ปฏิเสธคำตอบ (${blockReason})` : "Gemini ตอบว่างเปล่า");
  }
  return text.trim();
}

async function callOpenAICompatible(customerMessage, fullSystem, fewshot, history, config) {
  const messages = [
    { role: "system", content: fullSystem },
    ...fewshot.flatMap((ex) => [
      { role: "user", content: ex.user },
      { role: "assistant", content: ex.assistant },
    ]),
    ...(history || []).flatMap((h) => [
      { role: "user", content: h.question },
      { role: "assistant", content: h.answer },
    ]),
    { role: "user", content: customerMessage },
  ];

  const res = await fetch(config.apiBaseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.apiModel,
      messages,
      temperature: 0.6,
      max_tokens: 400,
    }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const errJson = await res.json();
      detail = errJson?.error?.message || "";
    } catch (_) {
      /* ignore parse error */
    }
    throw new Error(`API ${res.status}${detail ? ": " + detail : ""}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("ได้คำตอบว่างเปล่าจาก API");
  return text.trim();
}

/**
 * ทดสอบการเชื่อมต่อ LLM API จริงด้วยข้อความสั้น ๆ — ใช้ในหน้าแอดมิน (ปุ่ม "ทดสอบการเชื่อมต่อ")
 * เพื่อให้เห็น error จริงทันที แทนที่จะต้องเดาว่าทำไมแชทบอทถึงยังตอบแบบเดิม ๆ
 */
async function testRealLLMConnection() {
  const config = getConfig();
  if (!config.apiKey) {
    return { ok: false, message: "ยังไม่ได้ใส่ API Key" };
  }
  try {
    const reply = await callRealLLM("สวัสดีค่ะ นี่คือข้อความทดสอบการเชื่อมต่อ ช่วยทักทายกลับสั้น ๆ", {
      systemPrompt: getSystemPrompt(),
      fewshot: [],
      retrieved: [],
      history: [],
    });
    return { ok: true, message: "เชื่อมต่อสำเร็จ ✅", reply };
  } catch (err) {
    return { ok: false, message: err.message || String(err) };
  }
}
