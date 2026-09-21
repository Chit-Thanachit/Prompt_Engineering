/* ============================================================
   admin.js
   Logic ของแผงควบคุมแอดมิน (หน้าจอที่ 2 ตามใบงานที่ 4)
   FR-05, FR-06, FR-07 + สถิติภาพรวม
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  renderStats();
  renderSystemPromptTab();
  renderFewshotTab();
  renderKBTab();
  renderLogsTab();
  renderSettingsTab();
});

/* ---------------- Tabs ---------------- */
function initTabs() {
  const tabs = document.querySelectorAll(".admin-tabs button");
  const panels = document.querySelectorAll(".panel");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.target).classList.add("active");
    });
  });
}

/* ---------------- Stats ---------------- */
function renderStats() {
  const conversations = getConversations();
  const today = new Date().toDateString();
  const todayConvos = conversations.filter(
    (c) => new Date(c.time).toDateString() === today
  );
  const answered = todayConvos.filter((c) => !c.escalated).length;
  const escalated = todayConvos.filter((c) => c.escalated).length;
  const rate = todayConvos.length
    ? Math.round((answered / todayConvos.length) * 100)
    : 0;

  document.getElementById("stat-total").textContent = todayConvos.length;
  document.getElementById("stat-auto").textContent = `${rate}%`;
  document.getElementById("stat-escalated").textContent = escalated;
  document.getElementById("stat-kb").textContent = getKB().length;
}

/* ---------------- System Prompt Tab ---------------- */
function renderSystemPromptTab() {
  const textarea = document.getElementById("system-prompt-input");
  textarea.value = getSystemPrompt();

  document.getElementById("save-system-prompt").addEventListener("click", () => {
    setSystemPrompt(textarea.value);
    flashSaved("save-system-prompt");
  });

  document.getElementById("reset-system-prompt").addEventListener("click", () => {
    if (confirm("รีเซ็ต System Prompt กลับเป็นค่าเริ่มต้นหรือไม่?")) {
      textarea.value = DEFAULT_SYSTEM_PROMPT;
      setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    }
  });
}

/* ---------------- Few-shot Tab ---------------- */
function renderFewshotTab() {
  const list = getFewshot();
  const container = document.getElementById("fewshot-list");
  container.innerHTML = "";

  if (list.length === 0) {
    container.innerHTML = `<div class="empty-note">ยังไม่มีตัวอย่าง Few-shot</div>`;
  }

  list.forEach((ex, idx) => {
    const div = document.createElement("div");
    div.className = "fewshot-item";
    div.innerHTML = `
      <div class="top-row">
        <strong>ตัวอย่างที่ ${idx + 1}</strong>
        <button class="btn danger sm" data-idx="${idx}">ลบ</button>
      </div>
      <label>คำถามลูกค้า (ตัวอย่าง)</label>
      <input type="text" class="fs-user" value="${escapeAttr(ex.user)}" />
      <label>คำตอบที่ต้องการ (ตัวอย่าง)</label>
      <textarea class="fs-assistant" style="min-height:60px">${escapeHtml(ex.assistant)}</textarea>
    `;
    div.querySelector("button.danger").addEventListener("click", () => {
      const arr = getFewshot();
      arr.splice(idx, 1);
      setFewshot(arr);
      renderFewshotTab();
    });
    container.appendChild(div);
  });

  document.getElementById("add-fewshot").onclick = () => {
    const arr = getFewshot();
    arr.push({ user: "", assistant: "" });
    setFewshot(arr);
    renderFewshotTab();
  };

  document.getElementById("save-fewshot").onclick = () => {
    const items = Array.from(container.querySelectorAll(".fewshot-item")).map((el) => ({
      user: el.querySelector(".fs-user").value.trim(),
      assistant: el.querySelector(".fs-assistant").value.trim(),
    }));
    setFewshot(items.filter((i) => i.user || i.assistant));
    flashSaved("save-fewshot");
  };
}

/* ---------------- Knowledge Base Tab ---------------- */
function renderKBTab() {
  const list = getKB();
  const container = document.getElementById("kb-list");
  container.innerHTML = "";

  if (list.length === 0) {
    container.innerHTML = `<div class="empty-note">ยังไม่มีข้อมูลในฐานความรู้</div>`;
  }

  list.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = "kb-item";
    div.innerHTML = `
      <div class="top-row">
        <strong>${escapeHtml(item.category || "ทั่วไป")}</strong>
        <button class="btn danger sm" data-idx="${idx}">ลบ</button>
      </div>
      <div class="row">
        <div>
          <label>หมวดหมู่</label>
          <input type="text" class="kb-category" value="${escapeAttr(item.category)}" />
        </div>
        <div>
          <label>คำสำคัญ (คั่นด้วย , )</label>
          <input type="text" class="kb-keywords" value="${escapeAttr((item.keywords || []).join(", "))}" />
        </div>
      </div>
      <label>คำถามตัวอย่าง</label>
      <input type="text" class="kb-question" value="${escapeAttr(item.question)}" />
      <label>คำตอบ</label>
      <textarea class="kb-answer" style="min-height:70px">${escapeHtml(item.answer)}</textarea>
    `;
    div.querySelector("button.danger").addEventListener("click", () => {
      const arr = getKB();
      arr.splice(idx, 1);
      setKB(arr);
      renderKBTab();
      renderStats();
    });
    container.appendChild(div);
  });

  document.getElementById("add-kb").onclick = () => {
    const arr = getKB();
    arr.push({ id: uid("kb"), category: "", keywords: [], question: "", answer: "" });
    setKB(arr);
    renderKBTab();
  };

  document.getElementById("save-kb").onclick = () => {
    const items = Array.from(container.querySelectorAll(".kb-item")).map((el, idx) => ({
      id: list[idx]?.id || uid("kb"),
      category: el.querySelector(".kb-category").value.trim(),
      keywords: el
        .querySelector(".kb-keywords")
        .value.split(",")
        .map((k) => k.trim())
        .filter(Boolean),
      question: el.querySelector(".kb-question").value.trim(),
      answer: el.querySelector(".kb-answer").value.trim(),
    }));
    setKB(items);
    flashSaved("save-kb");
    renderStats();
  };
}

/* ---------------- Logs Tab ---------------- */
function renderLogsTab() {
  const filterSel = document.getElementById("log-filter");
  const container = document.getElementById("logs-table-wrap");

  function draw() {
    const conversations = getConversations();
    const filter = filterSel.value;
    const rows = conversations.filter((c) => {
      if (filter === "escalated") return c.escalated;
      if (filter === "answered") return !c.escalated;
      return true;
    });

    if (rows.length === 0) {
      container.innerHTML = `<div class="empty-note">ยังไม่มีประวัติการสนทนา ลองเปิดหน้าร้าน (index.html) แล้วพิมพ์คุยกับแชทบอทดูค่ะ</div>`;
      return;
    }

    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>เวลา</th>
            <th>คำถามลูกค้า</th>
            <th>คำตอบ / สถานะ</th>
            <th>ความมั่นใจ</th>
            <th>ประเภท</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) => `
            <tr data-id="${r.id}">
              <td>${new Date(r.time).toLocaleString("th-TH")}</td>
              <td>${escapeHtml(r.question)}</td>
              <td>${escapeHtml(r.answer)}</td>
              <td>${r.confidence !== null && r.confidence !== undefined ? r.confidence + "%" : "-"}</td>
              <td>
                ${
                  r.escalated
                    ? `<span class="badge escalated">ส่งต่อพนักงาน</span> <span class="badge ${r.status === "resolved" ? "resolved" : "pending"}">${r.status === "resolved" ? "ดำเนินการแล้ว" : "รอดำเนินการ"}</span>`
                    : `<span class="badge auto">ตอบอัตโนมัติ</span>`
                }
                ${r.usedRealApi ? `<span class="badge resolved">AI จริง</span>` : ""}
              </td>
              <td>
                ${
                  r.escalated && r.status !== "resolved"
                    ? `<button class="btn ghost sm resolve-btn">ปิดงาน</button>`
                    : ""
                }
              </td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    `;

    container.querySelectorAll(".resolve-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = e.target.closest("tr").dataset.id;
        const list = getConversations();
        const target = list.find((c) => c.id === id);
        if (target) target.status = "resolved";
        setConversations(list);
        draw();
      });
    });
  }

  filterSel.addEventListener("change", draw);
  document.getElementById("clear-logs").addEventListener("click", () => {
    if (confirm("ล้างประวัติการสนทนาทั้งหมด (เฉพาะในเบราว์เซอร์นี้) หรือไม่?")) {
      setConversations([]);
      draw();
      renderStats();
    }
  });

  draw();
}

/* ---------------- Settings Tab ---------------- */
function renderSettingsTab() {
  const cfg = getConfig();
  document.getElementById("cfg-shop-name").value = cfg.shopName;
  document.getElementById("cfg-threshold").value = cfg.confidenceThreshold;
  document.getElementById("cfg-threshold-val").textContent = cfg.confidenceThreshold + "%";
  document.getElementById("cfg-use-real-api").checked = cfg.useRealApi;
  document.getElementById("cfg-api-provider").value = cfg.apiProvider || "gemini";
  document.getElementById("cfg-api-base").value = cfg.apiBaseUrl;
  document.getElementById("cfg-api-key").value = cfg.apiKey;
  document.getElementById("cfg-api-model").value = cfg.apiModel;

  toggleProviderFields();

  document.getElementById("cfg-threshold").addEventListener("input", (e) => {
    document.getElementById("cfg-threshold-val").textContent = e.target.value + "%";
  });

  document.getElementById("cfg-api-provider").addEventListener("change", () => {
    toggleProviderFields();
    // เปลี่ยนโมเดลเริ่มต้นให้เหมาะกับผู้ให้บริการที่เลือก (ถ้ายังไม่ได้พิมพ์เอง)
    const modelInput = document.getElementById("cfg-api-model");
    const provider = document.getElementById("cfg-api-provider").value;
    if (!modelInput.value || modelInput.value === "gemini-2.0-flash" || modelInput.value === "gpt-4o-mini") {
      modelInput.value = provider === "gemini" ? "gemini-2.0-flash" : "gpt-4o-mini";
    }
  });

  function toggleProviderFields() {
    const provider = document.getElementById("cfg-api-provider").value;
    document.getElementById("gemini-hint").style.display = provider === "gemini" ? "block" : "none";
    document.getElementById("openai-fields").style.display = provider === "openai" ? "flex" : "none";
  }

  document.getElementById("save-settings").addEventListener("click", () => {
    const newCfg = {
      ...getConfig(),
      shopName: document.getElementById("cfg-shop-name").value.trim() || DEFAULT_CONFIG.shopName,
      confidenceThreshold: Number(document.getElementById("cfg-threshold").value),
      useRealApi: document.getElementById("cfg-use-real-api").checked,
      apiProvider: document.getElementById("cfg-api-provider").value,
      apiBaseUrl: document.getElementById("cfg-api-base").value.trim(),
      apiKey: document.getElementById("cfg-api-key").value.trim(),
      apiModel: document.getElementById("cfg-api-model").value.trim(),
    };
    setConfig(newCfg);
    flashSaved("save-settings");
  });

  document.getElementById("reset-all-data").addEventListener("click", () => {
    if (confirm("รีเซ็ตข้อมูลสาธิตทั้งหมด (System Prompt, Few-shot, ฐานความรู้, ประวัติแชท) กลับเป็นค่าเริ่มต้นหรือไม่?")) {
      resetAllDemoData();
      location.reload();
    }
  });

  document.getElementById("test-connection").addEventListener("click", async () => {
    // บันทึกค่าปัจจุบันในฟอร์มก่อนทดสอบ เผื่อผู้ใช้ยังไม่ได้กดบันทึก
    const testCfg = {
      ...getConfig(),
      apiProvider: document.getElementById("cfg-api-provider").value,
      apiBaseUrl: document.getElementById("cfg-api-base").value.trim(),
      apiKey: document.getElementById("cfg-api-key").value.trim(),
      apiModel: document.getElementById("cfg-api-model").value.trim(),
    };
    setConfig(testCfg);

    const btn = document.getElementById("test-connection");
    const resultBox = document.getElementById("test-connection-result");
    btn.disabled = true;
    btn.textContent = "⏳ กำลังทดสอบ...";
    resultBox.innerHTML = "";

    const result = await testRealLLMConnection();

    btn.disabled = false;
    btn.textContent = "🔌 ทดสอบการเชื่อมต่อ";

    if (result.ok) {
      resultBox.innerHTML = `
        <div style="background:#dcfce7;border:1px solid #86efac;border-radius:8px;padding:10px 12px;font-size:13px;color:#15803d;">
          ✅ ${escapeHtml(result.message)}<br/>
          <span style="color:#166534;">ตัวอย่างคำตอบ: “${escapeHtml(result.reply)}”</span>
        </div>`;
    } else {
      resultBox.innerHTML = `
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 12px;font-size:13px;color:#b91c1c;">
          ❌ เชื่อมต่อไม่สำเร็จ: ${escapeHtml(result.message)}<br/>
          <span style="color:#7f1d1d;">ลองตรวจสอบ: API Key ถูกต้องหรือไม่ (คัดลอกจาก aistudio.google.com/apikey ให้ครบ),
          ชื่อ Model ถูกต้องหรือไม่ (เช่น gemini-2.0-flash), หรือยังไม่ได้เปิดใช้งาน Gemini API ในโปรเจกต์ Google Cloud ของคุณ</span>
        </div>`;
    }
  });
}

/* ---------------- Helpers ---------------- */
function flashSaved(btnId) {
  const btn = document.getElementById(btnId);
  const original = btn.textContent;
  btn.textContent = "✅ บันทึกแล้ว";
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = original;
    btn.disabled = false;
  }, 1200);
}

function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, "&quot;");
}
