/* ============================================================
   chat.js
   Logic ของ Customer Chat Widget (หน้าจอที่ 1 ตามใบงานที่ 4)
   FR-01, FR-02, FR-03(จำลอง/จริง), FR-04, FR-08
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const launcher = document.getElementById("chat-launcher");
  const widget = document.getElementById("chat-widget");
  const closeBtn = document.getElementById("chat-close");
  const body = document.getElementById("chat-body");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");
  const humanBtn = document.getElementById("chat-human-btn");
  const quickWrap = document.getElementById("chat-quick");

  const config = getConfig();
  document.getElementById("chat-shop-name").textContent = config.shopName;

  let opened = false;

  // ความจำระหว่างเปิดหน้าเว็บ (Conversation Memory) — ไม่ persist ข้ามการรีเฟรช
  // เพื่อให้ AI ใช้ตอบคำถามต่อเนื่อง (เช่น "แล้วค่าส่งล่ะ") ได้อย่างเป็นธรรมชาติ
  const conversationHistory = [];
  let lastCategory = null;

  launcher.addEventListener("click", () => {
    opened = !opened;
    widget.classList.toggle("open", opened);
    if (opened && body.childElementCount === 0) {
      pushBotMessage(
        `สวัสดีค่ะ ยินดีต้อนรับสู่ ${config.shopName} 👋\nมีอะไรให้น้องช่วยดีช่วยเหลือได้บ้างคะ?`
      );
    }
  });
  closeBtn.addEventListener("click", () => {
    opened = false;
    widget.classList.remove("open");
  });

  // ปุ่มคำถามยอดฮิต (คลิกแล้วส่งเลย)
  const quickQuestions = [
    "จัดส่งกี่วันถึง",
    "คืนสินค้าได้ไหม",
    "มีโปรโมชันอะไรบ้าง",
  ];
  quickQuestions.forEach((q) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = q;
    b.addEventListener("click", () => {
      input.value = q;
      form.requestSubmit();
    });
    quickWrap.appendChild(b);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    pushUserMessage(text);
    input.value = "";
    await handleCustomerMessage(text);
  });

  humanBtn.addEventListener("click", () => {
    pushSystemMessage("คุณขอคุยกับพนักงานจริง");
    logEscalation({
      question: "(ลูกค้ากดขอคุยกับพนักงานโดยตรง)",
      confidence: null,
      reason: "manual_request",
    });
    pushBotMessage(
      "รับเรื่องแล้วค่ะ ✅ แอดมินจะเข้ามาดูแลต่อในไม่ช้า สามารถฝากคำถามเพิ่มเติมไว้ได้เลยนะคะ"
    );
  });

  function pushUserMessage(text) {
    const div = document.createElement("div");
    div.className = "msg user";
    div.textContent = text;
    body.appendChild(div);
    scrollToBottom();
  }

  function pushBotMessage(text, meta, composedPrompt) {
    const div = document.createElement("div");
    div.className = "msg bot";
    div.textContent = text;

    if (meta) {
      const span = document.createElement("span");
      span.className = "meta";
      span.textContent = meta;
      div.appendChild(span);
    }

    if (composedPrompt) {
      const details = document.createElement("details");
      details.className = "prompt-debug";
      const summary = document.createElement("summary");
      summary.textContent = "🔍 ดูวิธีคิดของ AI (Prompt ที่ระบบประกอบขึ้น)";
      const pre = document.createElement("pre");
      pre.textContent = composedPrompt;
      details.appendChild(summary);
      details.appendChild(pre);
      div.appendChild(details);
    }

    body.appendChild(div);
    scrollToBottom();
  }

  function pushSystemMessage(text) {
    const div = document.createElement("div");
    div.className = "msg system";
    div.textContent = text;
    body.appendChild(div);
    scrollToBottom();
  }

  function showTyping() {
    const div = document.createElement("div");
    div.className = "typing-indicator";
    div.id = "typing-now";
    div.innerHTML = "<span></span><span></span><span></span>";
    body.appendChild(div);
    scrollToBottom();
  }
  function hideTyping() {
    const el = document.getElementById("typing-now");
    if (el) el.remove();
  }

  function scrollToBottom() {
    body.scrollTop = body.scrollHeight;
  }

  async function handleCustomerMessage(text) {
    showTyping();
    const cfg = getConfig();
    const systemPrompt = getSystemPrompt();
    const fewshot = getFewshot();
    const recentHistory = conversationHistory.slice(-(cfg.historyTurns || 6));

    // จำลองเวลาคิดของโมเดล (FR-08: แสดงสถานะ "กำลังพิมพ์...")
    const thinkDelay = 700 + Math.random() * 700;

    // ประเมินด้วย prompt engine (rule-based) เสมอ เพื่อคำนวณ confidence/escalation
    // และเป็น fallback หากเรียก LLM จริงไม่สำเร็จ
    let result = runPromptEngine(text, recentHistory, lastCategory);
    let usedRealApi = false;
    let apiError = null;

    if (cfg.useRealApi && cfg.apiKey) {
      try {
        const realAnswer = await callRealLLM(text, {
          systemPrompt,
          fewshot,
          retrieved: result.retrieved,
          history: recentHistory,
        });
        result = { ...result, answer: realAnswer, escalate: false };
        usedRealApi = true;
      } catch (err) {
        console.warn("Real LLM call failed, fallback to rule-based engine:", err.message);
        apiError = err.message || String(err);
        // fallback ใช้ผลจาก rule-based engine ที่คำนวณไว้แล้ว
      }
    }

    await new Promise((r) => setTimeout(r, thinkDelay));
    hideTyping();

    const providerLabel =
      cfg.apiProvider === "gemini" ? "Google Gemini (จริง)" : "LLM API จริง";
    let meta;
    if (usedRealApi) {
      meta = `ตอบโดย ${providerLabel}`;
    } else if (apiError) {
      // ไม่ได้ซ่อน error ไว้เงียบ ๆ อีกต่อไป — โชว์ให้เห็นเลยว่าทำไมถึง fallback มาโหมดจำลอง
      // (ช่วยดีบักตอนตั้งค่า API Key/Model ผิด แทนที่จะเข้าใจผิดว่า "AI ไม่ฉลาด")
      meta = `⚠️ เชื่อมต่อ AI จริงไม่สำเร็จ (${apiError}) — ใช้โหมดจำลองแทน | ความมั่นใจ: ${result.confidence}%`;
    } else {
      meta = `ความมั่นใจของระบบ: ${result.confidence}%`;
    }

    pushBotMessage(result.answer, meta, result.composedPrompt);

    if (result.category) lastCategory = result.category;
    conversationHistory.push({ question: text, answer: result.answer, category: result.category });

    logConversation({
      question: text,
      answer: result.answer,
      confidence: result.confidence,
      escalated: result.escalate,
      usedRealApi,
    });

    if (result.escalate) {
      logEscalation({
        question: text,
        confidence: result.confidence,
        reason: "low_confidence",
      });
    }
  }

  function logConversation({ question, answer, confidence, escalated, usedRealApi }) {
    addConversation({
      id: uid("conv"),
      time: new Date().toISOString(),
      question,
      answer,
      confidence,
      escalated,
      usedRealApi,
      status: escalated ? "pending" : "answered",
    });
  }

  function logEscalation({ question, confidence, reason }) {
    // escalation ถูกเก็บรวมในชุดข้อมูลเดียวกับ conversation (status=pending)
    // ฟังก์ชันนี้เผื่อไว้สำหรับ log เพิ่มเติมกรณีลูกค้ากดปุ่มขอพนักงานโดยตรง
    const list = getConversations();
    const already = list.find(
      (c) => c.question === question && Date.now() - new Date(c.time).getTime() < 2000
    );
    if (already) return; // กันการ log ซ้ำจาก handleCustomerMessage
    addConversation({
      id: uid("conv"),
      time: new Date().toISOString(),
      question,
      answer: "-",
      confidence,
      escalated: true,
      usedRealApi: false,
      status: "pending",
      reason,
    });
  }
});
