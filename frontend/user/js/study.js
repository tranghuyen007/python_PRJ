// ===== study.js – trang học 1 bài (mở bằng index.html#study/<mã bài>[/<bước>]) =====
//
// 3 bước:
//   1. Khám phá từ   : loại từ, phiên âm, nghe phát âm, nghĩa tiếng Việt, câu ngữ cảnh
//   2. Flashcard     : nhớ nghĩa trước rồi lật thẻ để kiểm tra
//   3. Nối từ & nghĩa: ghép hết các cặp rồi bấm Kiểm tra. Từ nối ĐÚNG mới được tính vào tiến độ.
// Nối đúng tất cả từ -> làm bài kiểm tra bài học (của lesson.js) để mở bài tiếp theo.
//
// Dữ liệu & tiến độ dùng chung với lesson.js qua LessonPage.api.

const StudyPage = (() => {
  const api = () => LessonPage.api;

  const STEPS = [
    { n: 1, label: "Khám phá từ" },
    { n: 2, label: "Flashcard" },
    { n: 3, label: "Nối từ & nghĩa" }
  ];
  const POS = {
    noun: "Danh từ · noun", verb: "Động từ · verb", adj: "Tính từ · adjective",
    adv: "Trạng từ · adverb", phrase: "Cụm từ · phrase"
  };
  const SAVED_KEY = "vocabbit_saved_words"; // từ được đánh dấu (bookmark) ở flashcard

  let ctx = null;      // { lv, t, ti, lesson, li }
  let step = 1;
  let wIdx = 0;        // từ đang xem ở bước 1
  let cIdx = 0;        // thẻ đang xem ở bước 2
  let flipped = false;
  let match = null;    // trạng thái bước 3
  let bound = false;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const onPage = () => !!$("studyRoot");
  const words = () => ctx.lesson.words;
  const st = () => api().getLesson(ctx.lesson.id);

  const I = {
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
    left: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>`,
    right: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
    sound: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
    x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M7 7l10 10M17 7 7 17"/></svg>`,
    target: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/></svg>`,
    bulb: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>`,
    brain: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 3A2.5 2.5 0 0 0 7 5.5v.3A3 3 0 0 0 4.5 9a3 3 0 0 0 .4 4.6A3 3 0 0 0 7 18.5 2.5 2.5 0 0 0 12 19V5.5A2.5 2.5 0 0 0 9.5 3z"/><path d="M14.5 3A2.5 2.5 0 0 1 17 5.5v.3A3 3 0 0 1 19.5 9a3 3 0 0 1-.4 4.6 3 3 0 0 1-2.1 4.9A2.5 2.5 0 0 1 12 19"/></svg>`,
    bookmark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-6-4-6 4z"/></svg>`,
    hand: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l7 17 2.5-7.5L21 11z"/></svg>`,
    flip: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/></svg>`,
    heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/></svg>`,
    trophy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3a3 3 0 0 1-3 4M7 5H4a3 3 0 0 0 3 4"/></svg>`
  };

  // ---------------------------------------------------------------
  // Tiện ích
  // ---------------------------------------------------------------
  function speak(text) {
    if (!("speechSynthesis" in window)) {
      api().toast("Trình duyệt chưa hỗ trợ phát âm.");
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  }

  // Tô màu từ đang học trong câu ví dụ
  function highlight(sentence, word) {
    const safe = esc(sentence);
    const re = new RegExp(`\\b(${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "i");
    return safe.replace(re, `<mark>$1</mark>`);
  }

  function readSaved() {
    try { return JSON.parse(localStorage.getItem(SAVED_KEY)) || []; } catch (e) { return []; }
  }
  function toggleSaved(en) {
    const list = readSaved();
    const i = list.indexOf(en);
    if (i >= 0) list.splice(i, 1); else list.push(en);
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(list)); } catch (e) {}
    api().toast(i >= 0 ? `Đã bỏ “${en}” khỏi Bộ từ của tôi` : `Đã lưu “${en}” vào Bộ từ của tôi`);
  }

  function setCrumb() {
    const el = document.querySelector(".topbar-title");
    if (el) el.textContent = `Học từ mới / ${STEPS[step - 1].label}`;
  }

  // ---------------------------------------------------------------
  // Router gọi
  // ---------------------------------------------------------------
  function render() {
    return `<div class="learn study" id="studyRoot"><p class="st-loading">Đang tải unit…</p></div>`;
  }

  async function mount(param = "") {
    await api().ready();
    bindOnce();
    if (!onPage()) return;

    const [id, s] = param.split("/");
    const found = api().findLesson(id);
    if (!found) { $("studyRoot").innerHTML = messageView("Không tìm thấy unit", "Unit này không tồn tại hoặc đã bị xoá."); return; }
    if (!api().isLessonOpen(id)) { $("studyRoot").innerHTML = messageView("Unit đang khóa", "Hoàn thành unit trước (học đủ từ + qua bài kiểm tra) để mở unit này nhé."); return; }

    const isNew = !ctx || ctx.lesson.id !== id;
    ctx = found;
    if (isNew) {
      const saved = st();
      step = Number(s) || saved.step || 1;
      wIdx = 0; cIdx = 0; flipped = false; match = null;
    } else if (s) {
      step = Number(s);
    }
    step = Math.min(3, Math.max(1, step));
    draw();
  }

  function messageView(title, text) {
    return `
      <div class="st-message">
        <div class="st-msg-icon">🔒</div>
        <h2>${title}</h2>
        <p>${text}</p>
        <a href="#learn" class="btn btn-primary">${I.left} Về danh sách section</a>
      </div>`;
  }

  // ---------------------------------------------------------------
  // Vẽ toàn trang
  // ---------------------------------------------------------------
  function draw() {
    if (!onPage() || !ctx) return;
    api().update(ctx.lesson.id, { step });
    setCrumb();
    let body = "";
    if (step === 1) body = stepExplore();
    if (step === 2) body = stepFlash();
    if (step === 3) body = stepMatch();
    $("studyRoot").innerHTML = headHTML() + tabsHTML() + body;
  }

  function headHTML() {
    const { t, ti, lesson } = ctx;
    const n = st().learned.length;
    const total = words().length;
    const p = pct(n, total);
    return `
      <div class="st-head">
        <div class="st-title">
          <p class="st-crumb">${esc(t.icon)} Section ${ti + 1}: ${esc(t.name)} · ${esc(t.tag)} <span>/</span> Unit ${lesson.no}</p>
          <h1 class="page-title">${esc(lesson.title)}</h1>
        </div>
        <div class="st-progress">
          <div class="st-progress-top"><b>${p}%</b></div>
          <div class="bar"><span style="width:${p}%"></span></div>
        </div>
        <a href="#learn" class="btn st-text-btn st-exit">${I.close} Lưu &amp; thoát</a>
      </div>`;
  }

  function tabsHTML() {
    const s = st();
    const total = words().length;
    const done = {
      1: s.seen.length >= total,
      2: s.flips.length >= total,
      3: s.learned.length >= total
    };
    return `
      <div class="st-steps">
        ${STEPS.map((x) => `
          <button type="button" class="st-step ${x.n === step ? "active" : ""} ${done[x.n] ? "done" : ""}" data-st="goto" data-step="${x.n}">
            <span class="st-step-no">${done[x.n] && x.n !== step ? I.check : x.n}</span>
            ${x.label}
          </button>`).join("")}
      </div>`;
  }

  // ---------------------------------------------------------------
  // BƯỚC 1 – Khám phá từ
  // ---------------------------------------------------------------
  function stepExplore() {
    const list = words();
    const w = list[wIdx];
    const s = st();
    if (!s.seen.includes(wIdx)) api().update(ctx.lesson.id, { seen: [...s.seen, wIdx] });
    const seen = new Set([...st().seen]);
    const isLast = wIdx === list.length - 1;

    const meta = [
      w.pos ? `<span class="st-pos">${POS[w.pos] || esc(w.pos)}</span>` : "",
      w.ipa ? `<span class="st-ipa">${esc(w.ipa)}</span>` : "",
      `<button type="button" class="st-sound" data-st="speak" data-text="${esc(w.en)}">${I.sound} Nghe phát âm</button>`
    ].join("");

    const context = w.ex ? `
      <div class="st-context">
        <p class="st-label">Đặt từ vào ngữ cảnh</p>
        <p class="st-ex">${highlight(w.ex, w.en)}
          <button type="button" class="st-mini-sound" data-st="speak" data-text="${esc(w.ex)}" aria-label="Nghe câu ví dụ">${I.sound}</button>
        </p>
        ${w.exVi ? `<p class="st-ex-vi">${esc(w.exVi)}</p>` : ""}
      </div>` : "";

    const wordList = list.map((x, i) => {
      const cls = i === wIdx ? "current" : seen.has(i) ? "seen" : "";
      const icon = i === wIdx ? I.target : seen.has(i) ? I.check : "";
      return `<button type="button" class="st-word ${cls}" data-st="word" data-i="${i}"><span class="st-word-ic">${icon}</span>${esc(x.en)}</button>`;
    }).join("");

    return `
      <div class="st-grid">
        <div class="st-col">
          <section class="st-card st-explore">
            <div class="st-card-top">
              <span class="st-chip">Từ ${wIdx + 1} / ${list.length}</span>
            </div>
            <h2 class="st-word-big">${esc(w.en)}</h2>
            <div class="st-meta">${meta}</div>
            <hr>
            <p class="st-label">Nghĩa tiếng Việt</p>
            <p class="st-meaning">${esc(w.vi)}</p>
            ${w.note ? `<p class="st-note">${esc(w.note)}</p>` : ""}
            ${context}
          </section>

          <div class="st-foot">
            <button type="button" class="btn btn-outline" data-st="prev-word" ${wIdx === 0 ? "disabled" : ""}>${I.left} Từ trước</button>
            ${isLast
              ? `<button type="button" class="btn btn-primary" data-st="goto" data-step="2">Sang bước Flashcard ${I.right}</button>`
              : `<button type="button" class="btn btn-primary" data-st="next-word">${I.right} Từ tiếp theo</button>`}
          </div>
        </div>


        <aside class="st-aside">
          <div class="st-card st-list-card">
            <h3>${list.length} từ của unit</h3>
            <div class="st-word-list">${wordList}</div>
          </div>
        </aside>
      </div>`;
  }

  // ---------------------------------------------------------------
  // BƯỚC 2 – Flashcard
  // ---------------------------------------------------------------
  function stepFlash() {
    const list = words();
    const w = list[cIdx];
    const saved = readSaved().includes(w.en);
    const isLast = cIdx === list.length - 1;

    const front = `
      <div class="fc-face fc-front">
        <div class="fc-top">
          <span class="st-chip">Thẻ ${cIdx + 1} / ${list.length}</span>
          <button type="button" class="fc-save ${saved ? "on" : ""}" data-st="save" aria-label="Lưu từ">${I.bookmark}</button>
        </div>
        <p class="fc-word">${esc(w.en)}</p>
        <button type="button" class="fc-sound" data-st="speak" data-text="${esc(w.en)}" aria-label="Nghe phát âm">${I.sound}</button>
        <p class="fc-hint">${I.hand} Nhấp vào thẻ để xem nghĩa</p>
      </div>`;

    const back = `
      <div class="fc-face fc-back">
        <div class="fc-top">
          <span class="st-chip">Thẻ ${cIdx + 1} / ${list.length}</span>
          <button type="button" class="fc-save ${saved ? "on" : ""}" data-st="save" aria-label="Lưu từ">${I.bookmark}</button>
        </div>
        <p class="fc-word sm">${esc(w.en)}</p>
        <p class="fc-sub">${[w.pos ? POS[w.pos] : "", w.ipa ? esc(w.ipa) : ""].filter(Boolean).join(" · ")}</p>
        <p class="fc-meaning">${esc(w.vi)}</p>
        ${w.ex ? `<p class="fc-ex">${highlight(w.ex, w.en)}</p>` : ""}
        <div class="fc-actions">
          <button type="button" class="st-sound" data-st="speak" data-text="${esc(w.en)}">${I.sound} Nghe lại</button>
          <span class="st-muted">Nhấp vào thẻ để lật về mặt trước</span>
        </div>
      </div>`;

    const dots = list.map((_, i) => `<span class="fc-dot ${i === cIdx ? "on" : ""}"></span>`).join("");

    return `
      <div class="fc-wrap">
          <div class="fc-card ${flipped ? "flipped" : ""}" data-st="flip" role="button" tabindex="0" aria-label="Lật thẻ">
            <div class="fc-inner">${front}${back}</div>
          </div>
          <div class="fc-nav">
            <button type="button" class="btn btn-outline" data-st="prev-card" ${cIdx === 0 ? "disabled" : ""}>${I.left} Thẻ trước</button>
            <div class="fc-dots">${dots}</div>
            ${flipped
              ? (isLast
                ? `<button type="button" class="btn btn-primary" data-st="goto" data-step="3">Sang bước nối từ ${I.right}</button>`
                : `<button type="button" class="btn btn-primary" data-st="next-card">Thẻ tiếp theo ${I.right}</button>`)
              : `<button type="button" class="btn btn-primary" data-st="flip">${I.flip} Lật thẻ</button>`}
          </div>
      </div>

      <div class="st-foot end">
        <button type="button" class="btn st-text-btn" data-st="goto" data-step="3">${I.right} Đến bước nối từ</button>
      </div>`;
  }

  function flipCard() {
    flipped = !flipped;
    if (flipped) {
      const s = st();
      if (!s.flips.includes(cIdx)) api().update(ctx.lesson.id, { flips: [...s.flips, cIdx] });
    }
    draw();
  }

  // ---------------------------------------------------------------
  // BƯỚC 3 – Nối từ & nghĩa
  // ---------------------------------------------------------------
  // match = { sel, pairs: {iTừ: iNghĩa}, result: {iTừ: true/false}, checked, order: [thứ tự cột nghĩa] }
  function initMatch() {
    const learned = st().learned;
    match = { sel: null, pairs: {}, result: {}, checked: false, order: shuffle(words().map((_, i) => i)) };
    learned.forEach((i) => { match.pairs[i] = i; match.result[i] = true; }); // từ đã đúng trước đó: khoá xanh
  }

  const isLocked = (i) => match.result[i] === true;
  const sameMeaning = (a, b) => words()[a].vi === words()[b].vi;

  function stepMatch() {
    if (!match) initMatch();
    const list = words();
    const total = list.length;
    const pairedCount = Object.keys(match.pairs).length;
    const learnedN = st().learned.length;
    const allDone = learnedN >= total;
    const wrong = Object.keys(match.result).filter((k) => match.result[k] === false).map(Number);
    const viOwner = {}; // iNghĩa -> iTừ đang ghép
    Object.entries(match.pairs).forEach(([en, vi]) => (viOwner[vi] = Number(en)));

    // Cột trái: từ tiếng Anh
    const left = list.map((w, i) => {
      let cls = "", ic = "";
      if (isLocked(i)) { cls = "ok"; ic = I.check; }
      else if (match.checked && match.result[i] === false) { cls = "bad"; ic = I.x; }
      else if (match.sel === i) cls = "sel";
      else if (match.pairs[i] !== undefined) cls = "paired";
      const tag = !match.checked && !isLocked(i) && match.pairs[i] !== undefined
        ? `<small>→ ${esc(list[match.pairs[i]].vi)}</small>` : "";
      return `<button type="button" class="m-item ${cls}" data-st="pick-en" data-i="${i}" ${isLocked(i) || match.checked ? "disabled" : ""}>
                <span>${esc(w.en)}${tag}</span><span class="m-ic">${ic}</span></button>`;
    }).join("");

    // Cột phải: sau khi kiểm tra -> xếp thẳng hàng theo cột trái; trước đó -> thứ tự xáo trộn
    let right;
    if (match.checked) {
      right = list.map((_, i) => {
        const j = match.pairs[i];
        const ok = match.result[i] === true;
        return `<div class="m-item ${ok ? "ok" : "bad"}"><span>${esc(list[j].vi)}</span><span class="m-ic">${ok ? I.check : I.x}</span></div>`;
      }).join("");
    } else {
      right = match.order.map((j) => {
        const owner = viOwner[j];
        let cls = "";
        if (owner !== undefined && isLocked(owner)) cls = "ok";
        else if (owner !== undefined) cls = "used";
        return `<button type="button" class="m-item ${cls}" data-st="pick-vi" data-j="${j}" ${owner !== undefined && isLocked(owner) ? "disabled" : ""}>
                  <span>${esc(list[j].vi)}</span><span class="m-ic">${cls === "ok" ? I.check : owner !== undefined ? `<small>${esc(list[owner].en)}</small>` : ""}</span></button>`;
      }).join("");
    }

    // Hàng nút dưới bảng nối từ (thay cho khung bên phải)
    const s = st();
    const next = api().nextLessonOf(ctx.lesson.id);
    const canCheck = !match.checked && pairedCount === total && Object.keys(match.result).length < total;
    let actions;
    if (allDone && s.passed) {
      actions = `
        <span class="st-muted">Đã qua bài kiểm tra · ${Math.round(s.best * 100)}%</span>
        <div class="m-btns">
          <button type="button" class="btn btn-ghost btn-sm" data-st="replay">Luyện ghép lại</button>
          <button type="button" class="btn btn-outline" data-st="quiz">Làm lại bài kiểm tra</button>
          ${next ? `<a href="#study/${next.id}/1" class="btn btn-primary">Học Unit ${next.no} ${I.right}</a>` : `<a href="#learn" class="btn btn-primary">Về danh sách section</a>`}
        </div>`;
    } else if (allDone) {
      actions = `
        <span class="st-muted">Đã nối đúng cả ${total} từ · đúng từ ${api().config.LESSON_PASS * 100}% bài kiểm tra để mở unit tiếp theo</span>
        <div class="m-btns">
          <button type="button" class="btn btn-ghost btn-sm" data-st="replay">Luyện ghép lại</button>
          <button type="button" class="btn btn-primary" data-st="quiz">Làm bài kiểm tra unit</button>
        </div>`;
    } else if (match.checked && wrong.length) {
      actions = `
        <span class="st-muted">Sai ${wrong.length} cặp · các cặp đúng đã được lưu vào tiến độ</span>
        <button type="button" class="btn btn-primary" data-st="retry">Ghép lại câu sai</button>`;
    } else {
      actions = `
        <span class="st-muted">Đã ghép ${pairedCount}/${total} cặp</span>
        <button type="button" class="btn btn-primary" data-st="check" ${canCheck ? "" : "disabled"}>${I.check} Kiểm tra</button>`;
    }

    const legend = match.checked || learnedN ? `
      <div class="m-legend">
        <span class="m-leg ok">${I.check} Đúng · Đã hoàn thành</span>
        ${wrong.length ? `<span class="m-leg bad">${I.x} Sai · Thử lại</span>` : ""}
      </div>` : "";

    return `
      <div class="st-section-head row">
        <span class="st-badge">${I.check} ${learnedN}/${total} đã đúng</span>
      </div>

      <section class="st-card m-card">
          ${legend}
          <div class="m-cols">
            <div><p class="st-label">Từ tiếng Anh</p><div class="m-list">${left}</div></div>
            <div><p class="st-label">Nghĩa tiếng Việt</p><div class="m-list">${right}</div></div>
          </div>
          <div class="m-actions">${actions}</div>
      </section>`;
  }

  function pickEn(i) {
    match.sel = i; // chọn từ (kể cả từ đã ghép -> chọn lại nghĩa khác)
    draw();
  }

  function pickVi(j) {
    const owner = Object.keys(match.pairs).map(Number).find((k) => match.pairs[k] === j);
    if (match.sel === null) {
      // chưa chọn từ: bấm vào nghĩa đã ghép -> gỡ cặp đó
      if (owner !== undefined && !isLocked(owner)) delete match.pairs[owner];
    } else {
      if (owner !== undefined && !isLocked(owner)) delete match.pairs[owner];
      match.pairs[match.sel] = j;
      // tự chọn từ tiếp theo chưa ghép để thao tác nhanh hơn
      const next = words().findIndex((_, k) => match.pairs[k] === undefined);
      match.sel = next >= 0 ? next : null;
    }
    draw();
  }

  function checkMatch() {
    const correct = [];
    words().forEach((_, i) => {
      if (isLocked(i)) return;
      const ok = sameMeaning(match.pairs[i], i);
      match.result[i] = ok;
      if (ok) correct.push(i);
    });
    match.checked = true;
    match.sel = null;
    const added = api().markLearned(ctx.lesson.id, correct);
    if (added) api().toast(`+${added * 5} điểm · ${added} từ mới được ghi nhận`);
    draw();
  }

  function retryWrong() {
    Object.keys(match.result).forEach((k) => {
      if (match.result[k] === false) { delete match.result[k]; delete match.pairs[k]; }
    });
    match.checked = false;
    match.order = shuffle(match.order);
    match.sel = words().findIndex((_, k) => match.pairs[k] === undefined);
    draw();
  }

  // ---------------------------------------------------------------
  // Sự kiện (gắn một lần)
  // ---------------------------------------------------------------
  function bindOnce() {
    if (bound) return;
    bound = true;

    document.addEventListener("click", (e) => {
      const el = e.target.closest(".study [data-st]");
      if (!el || el.disabled || !ctx) return;
      const a = el.dataset.st;

      // (bấm nút nhỏ trong thẻ như loa, lưu từ -> closest() trả về nút đó nên thẻ không bị lật)
      if (a === "goto") { step = Number(el.dataset.step); flipped = false; draw(); window.scrollTo({ top: 0 }); }
      else if (a === "speak") speak(el.dataset.text);
      else if (a === "word") { wIdx = Number(el.dataset.i); draw(); }
      else if (a === "prev-word") { wIdx = Math.max(0, wIdx - 1); draw(); }
      else if (a === "next-word") { wIdx = Math.min(words().length - 1, wIdx + 1); draw(); }
      else if (a === "flip") flipCard();
      else if (a === "prev-card") { cIdx = Math.max(0, cIdx - 1); flipped = false; draw(); }
      else if (a === "next-card") { cIdx = Math.min(words().length - 1, cIdx + 1); flipped = false; draw(); }
      else if (a === "save") { toggleSaved(words()[cIdx].en); draw(); }
      else if (a === "pick-en") pickEn(Number(el.dataset.i));
      else if (a === "pick-vi") pickVi(Number(el.dataset.j));
      else if (a === "check") checkMatch();
      else if (a === "retry") retryWrong();
      else if (a === "replay") { match = { sel: 0, pairs: {}, result: {}, checked: false, order: shuffle(words().map((_, i) => i)) }; draw(); }
      else if (a === "quiz") api().startLessonQuiz(ctx.lesson.id);
    });

    // Phím tắt: ← → chuyển từ/thẻ, Space/Enter lật thẻ
    document.addEventListener("keydown", (e) => {
      if (!onPage() || !ctx || !document.getElementById("quizModal")?.hidden) return;
      if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
      if (step === 1 && e.key === "ArrowRight") { wIdx = Math.min(words().length - 1, wIdx + 1); draw(); }
      if (step === 1 && e.key === "ArrowLeft") { wIdx = Math.max(0, wIdx - 1); draw(); }
      if (step === 2 && e.key === "ArrowRight") { cIdx = Math.min(words().length - 1, cIdx + 1); flipped = false; draw(); }
      if (step === 2 && e.key === "ArrowLeft") { cIdx = Math.max(0, cIdx - 1); flipped = false; draw(); }
      if (step === 2 && (e.key === " " || e.key === "Enter")) { e.preventDefault(); flipCard(); }
    });

    // Bài kiểm tra xong (lesson.js lưu tiến độ) -> vẽ lại để hiện trạng thái mới
    document.addEventListener("vocabbit:progress", () => { if (onPage() && ctx) draw(); });
  }

  return { render, mount };
})();