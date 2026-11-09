// ===== review.js – Trung tâm ôn tập =====
//
// index.html#review                              -> chọn cấp độ -> chủ đề -> chế độ ôn
// index.html#review-session/<mã chủ đề>/quick    -> Ôn nhanh 15 từ
// index.html#review-session/<mã chủ đề>/full     -> Ôn toàn bộ chủ đề
//
// LUẬT
// - Cấp độ: giống Học từ mới (cấp độ nào đang khóa ở Học từ mới thì ở đây cũng khóa).
// - "Từ đã học" = từ thuộc các bài ĐÃ HOÀN THÀNH (nối đúng hết + qua bài kiểm tra bài học).
// - Ôn nhanh   : cần hoàn thành ít nhất 2 bài trong chủ đề. Lấy ngẫu nhiên 15 từ đã học.
// - Ôn toàn bộ : ôn tất cả từ của chủ đề -> cần hoàn thành TẤT CẢ bài của chủ đề
//                (đảm bảo chỉ ôn từ đã học). Kết thúc hiển thị % câu đúng.
// - Mỗi lượt ôn trộn 3 dạng: Chọn nghĩa · Điền từ còn thiếu · Viết từ tiếng Anh.
//
// Dữ liệu & tiến độ dùng chung với lesson.js qua LessonPage.api.

const ReviewPage = (() => {
  const api = () => LessonPage.api;

  const CONFIG = {
    QUICK_SIZE: 15,          // số câu ôn nhanh
    QUICK_MIN_LESSONS: 2,    // số bài phải hoàn thành để mở ôn nhanh
    FULL_NEEDS_ALL: true,    // ôn toàn bộ cần xong tất cả bài của chủ đề
    POINTS_PER_CORRECT: 2
  };

  const TYPES = {
    choose: { label: "Chọn nghĩa", icon: "list" },
    fill:   { label: "Điền từ còn thiếu", icon: "cloze" },
    write:  { label: "Viết từ tiếng Anh", icon: "pen" }
  };
  const POS = { noun: "Danh từ", verb: "Động từ", adj: "Tính từ", adv: "Trạng từ", phrase: "Cụm từ" };

  let activeLevel = null;
  let session = null;   // lượt ôn đang làm
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
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const norm = (s) => String(s).trim().toLowerCase().replace(/\s+/g, " ");

  const I = {
    lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
    checkCircle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/></svg>`,
    xCircle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>`,
    x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M7 7l10 10M17 7 7 17"/></svg>`,
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
    right: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
    bolt: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    layers: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 8l10 5 10-5-10-5z"/><path d="M2 13l10 5 10-5"/><path d="M2 18l10 5 10-5" opacity=".5"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>`,
    sound: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>`,
    bulb: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>`,
    list: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 6h11M10 12h11M10 18h11"/><path d="M3 6l1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17"/></svg>`,
    cloze: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="10" rx="2"/><path d="M8 12h8" stroke-dasharray="2 2"/></svg>`,
    pen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>`,
    sparkle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/></svg>`
  };

  function speak(text) {
    if (!("speechSynthesis" in window)) return api().toast("Trình duyệt chưa hỗ trợ phát âm.");
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  }
  function setCrumb(text) {
    const el = document.querySelector(".topbar-title");
    if (el) el.textContent = text;
  }

  // ---------------------------------------------------------------
  // Thống kê một chủ đề
  // ---------------------------------------------------------------
  function findTopic(topicId) {
    for (const lv of api().levels()) {
      const t = lv.topics.find((x) => x.id === topicId);
      if (t) return { lv, t };
    }
    return null;
  }

  function topicInfo(lv, t) {
    const levelOpen = api().isLevelOpen(lv.code);
    const doneLessons = t.lessons.filter((l) => api().lessonDoneObj(l));
    const learnedWords = doneLessons.flatMap((l) => l.words.map((w) => ({ w, lesson: l })));
    const allWords = t.lessons.flatMap((l) => l.words.map((w) => ({ w, lesson: l })));
    const quickOpen = levelOpen && doneLessons.length >= CONFIG.QUICK_MIN_LESSONS && learnedWords.length >= 4;
    const fullOpen = levelOpen && (CONFIG.FULL_NEEDS_ALL ? doneLessons.length === t.lessons.length : quickOpen);
    return {
      levelOpen, doneLessons, learnedWords, allWords, quickOpen, fullOpen,
      quickSize: Math.min(CONFIG.QUICK_SIZE, learnedWords.length),
      fullSize: CONFIG.FULL_NEEDS_ALL ? allWords.length : learnedWords.length,
      review: api().getReview(t.id)
    };
  }

  // ===============================================================
  // MÀN 1 – CHỌN CHỦ ĐỀ (#review)
  // ===============================================================
  function render() {
    return `
      <div class="learn study review" id="reviewRoot">
        <div class="rv-types">
          <b>Các dạng ôn tập:</b>
          <span>${I.list} Chọn nghĩa</span>
          <span>${I.cloze} Điền từ còn thiếu</span>
          <span>${I.pen} Viết từ tiếng Anh</span>
        </div>
        <p class="section-label">Chọn cấp độ</p>
        <div class="level-tabs" id="rvTabs"></div>
        <div id="rvTopics" class="rv-topics"><p class="st-loading">Đang tải…</p></div>
      </div>`;
  }

  async function mount() {
    await api().ready();
    bindOnce();
    if (!$("reviewRoot")) return;
    if (!activeLevel || !api().levels().some((l) => l.code === activeLevel)) activeLevel = api().pickActiveLevel();
    drawCenter();
  }

  function drawCenter() {
    const levels = api().levels();
    $("rvTabs").innerHTML = levels.map((lv) => {
      const open = api().isLevelOpen(lv.code);
      return `
        <button type="button" class="level-tab ${lv.code === activeLevel ? "active" : ""} ${open ? "" : "locked"}" data-rv="tab" data-level="${lv.code}">
          <b>${lv.code}</b><span>${open ? "" : I.lock}${lv.topics.length} chủ đề</span>
        </button>`;
    }).join("");

    const lv = levels.find((l) => l.code === activeLevel);
    const open = api().isLevelOpen(lv.code);
    const lockNote = open ? "" : `
      <div class="locked-panel">
        <span class="locked-icon">${I.lock}</span>
        <div><b>Cấp độ ${lv.code} đang khóa</b><p>${api().lockReason(lv.code)}</p></div>
        <a href="#learn" class="btn btn-sm btn-outline">Đến Học từ mới</a>
      </div>`;

    $("rvTopics").innerHTML = lockNote + lv.topics.map((t) => topicCard(lv, t)).join("");
  }

  function topicCard(lv, t) {
    const info = topicInfo(lv, t);
    const r = info.review;
    const open = info.quickOpen || info.fullOpen;
    const total = t.lessons.length;
    const badge = open
      ? `<span class="rv-badge open">${I.check} Đã mở khóa</span>`
      : `<span class="rv-badge">${I.lock} Chưa mở khóa</span>`;

    const meta = `${info.doneLessons.length}/${total} bài hoàn thành • ${info.learnedWords.length} từ đã học • ${info.allWords.length} từ trong chủ đề`;

    let body;
    if (!info.levelOpen) {
      body = `<div class="rv-locked"><span class="rv-lock-ic">${I.lock}</span><div><b>Cấp độ ${lv.code} chưa mở</b><p>Mở khóa cấp độ ở Học từ mới để ôn chủ đề này.</p></div></div>`;
    } else if (!info.quickOpen) {
      const need = Math.max(0, CONFIG.QUICK_MIN_LESSONS - info.doneLessons.length);
      const next = api().nextLessonInTopic(t.id);
      body = `
        <div class="rv-locked">
          <span class="rv-lock-ic">${I.lock}</span>
          <div>
            <b>Hoàn thành ít nhất ${CONFIG.QUICK_MIN_LESSONS} bài để mở ôn tập chủ đề</b>
            <p>Bạn cần hoàn thành thêm ${need} bài.</p>
          </div>
          ${next ? `<a href="#study/${next.id}" class="btn btn-outline">${I.right} ${info.doneLessons.length || next.no > 1 ? "Học bài tiếp theo" : "Bắt đầu bài 1"}</a>`
                 : `<a href="#learn" class="btn btn-outline">${I.right} Đến Học từ mới</a>`}
        </div>
        <div class="rv-chips">
          <span class="rv-chip">${I.lock} Ôn nhanh ${CONFIG.QUICK_SIZE} từ • Đã khóa</span>
          <span class="rv-chip">${I.lock} Ôn toàn bộ chủ đề • Đã khóa</span>
        </div>`;
    } else {
      const remainLessons = total - info.doneLessons.length;
      const quickLast = r.quick ? `<span class="rv-last">Lần gần nhất: ${r.quick.last}%</span>` : "";
      const fullLast = r.full ? `<span class="rv-last">Cao nhất: ${r.full.best}% · Gần nhất: ${r.full.last}%</span>` : "";
      body = `
        <div class="rv-modes">
          <div class="rv-mode primary">
            <h4>${I.bolt} Ôn nhanh ${info.quickSize} từ</h4>
            <p>Chọn ngẫu nhiên ${info.quickSize} từ bạn đã học.</p>
            <div class="rv-mode-foot">
              <span>${info.quickSize} câu • khoảng ${Math.max(3, Math.round(info.quickSize / 3))} phút ${quickLast}</span>
              <a href="#review-session/${t.id}/quick" class="btn btn-primary">${I.right} Bắt đầu ôn nhanh</a>
            </div>
          </div>
          <div class="rv-mode ${info.fullOpen ? "" : "locked"}">
            <h4>${I.layers} Ôn toàn bộ chủ đề</h4>
            <p>${info.fullOpen
              ? `Ôn trọn bộ ${info.fullSize} từ của ${total} bài trong chủ đề. Xem tỷ lệ trả lời đúng khi kết thúc.`
              : `Hoàn thành ${total} bài của chủ đề. Còn ${remainLessons} bài nữa.`}</p>
            <div class="rv-mode-foot">
              <span>${info.fullSize} câu • khoảng ${Math.max(5, Math.round(info.fullSize / 3))} phút ${fullLast}</span>
              ${info.fullOpen
                ? `<a href="#review-session/${t.id}/full" class="btn btn-outline">${I.right} Ôn toàn bộ</a>`
                : `<button type="button" class="btn btn-ghost" disabled>${I.lock} Đã khóa</button>`}
            </div>
          </div>
        </div>`;
    }

    return `
      <article class="rv-topic ${open ? "" : "locked"}">
        <div class="rv-topic-head">
          <span class="rv-topic-ic" style="background:${t.color}">${t.icon}</span>
          <div class="rv-topic-info">
            <h3>${esc(t.name)} <span class="tag tag-soft">${esc(t.tag)}</span></h3>
            <p>${meta}</p>
          </div>
          ${badge}
        </div>
        ${body}
      </article>`;
  }

  // ===============================================================
  // MÀN 2 – LÀM BÀI (#review-session/<topic>/<quick|full>)
  // ===============================================================
  function sessionRender() {
    return `<div class="learn study review" id="sessionRoot"><p class="st-loading">Đang chuẩn bị lượt ôn…</p></div>`;
  }

  async function sessionMount(param = "") {
    await api().ready();
    bindOnce();
    if (!$("sessionRoot")) return;

    const [topicId, mode = "quick"] = param.split("/");
    const found = findTopic(topicId);
    if (!found) return message("Không tìm thấy chủ đề", "Chủ đề này không tồn tại.");
    const info = topicInfo(found.lv, found.t);

    // lượt "ôn lại từ sai" được tạo từ màn kết quả, giữ nguyên nếu đúng chủ đề
    if (mode === "retry" && session && session.topic.id === topicId && session.retryItems) {
      session = newSession(found, "retry", session.retryItems);
    } else if (mode === "full") {
      if (!info.fullOpen) return message("Ôn toàn bộ đang khóa", `Hoàn thành tất cả bài của chủ đề ${found.t.name} ở Học từ mới để mở chế độ này.`);
      session = newSession(found, "full", CONFIG.FULL_NEEDS_ALL ? info.allWords : info.learnedWords);
    } else {
      if (!info.quickOpen) return message("Ôn nhanh đang khóa", `Hoàn thành ít nhất ${CONFIG.QUICK_MIN_LESSONS} bài của chủ đề ${found.t.name} để mở ôn tập.`);
      session = newSession(found, "quick", shuffle(info.learnedWords).slice(0, CONFIG.QUICK_SIZE));
    }
    drawSession();
  }

  function message(title, text) {
    $("sessionRoot").innerHTML = `
      <div class="st-message">
        <div class="st-msg-icon">🔒</div>
        <h2>${title}</h2><p>${text}</p>
        <a href="#review" class="btn btn-primary">Về trung tâm ôn tập</a>
      </div>`;
    setCrumb("Ôn tập");
  }

  function newSession(found, mode, items) {
    const { lv, t } = found;
    // pool để tạo đáp án nhiễu: từ của chủ đề, thiếu thì lấy thêm cả cấp độ
    let pool = t.lessons.flatMap((l) => l.words);
    if (pool.length < 8) pool = lv.topics.flatMap((x) => x.lessons.flatMap((l) => l.words));

    const picked = shuffle(items);
    const typeCycle = shuffle(picked.map((_, i) => ["choose", "fill", "write"][i % 3]));
    const questions = picked.map((it, i) => makeQuestion(it, typeCycle[i], pool));

    return {
      lv, topic: t, mode, questions, pool,
      i: 0, answered: false, startedAt: Date.now(), finished: false,
      retryItems: null
    };
  }

  function canFill(w) {
    return !!w.ex && new RegExp(`\\b${reEsc(w.en)}\\b`, "i").test(w.ex);
  }

  function makeQuestion(item, type, pool) {
    const { w, lesson } = item;
    if (type === "fill" && !canFill(w)) type = Math.random() < 0.5 ? "choose" : "write";
    const q = { type, w, lesson, correct: null, given: null, hints: 0 };

    if (type === "choose") {
      const wrong = shuffle([...new Set(pool.map((x) => x.vi))].filter((v) => v !== w.vi)).slice(0, 3);
      q.options = shuffle([w.vi, ...wrong]);
      q.answer = w.vi;
    } else if (type === "fill") {
      // ưu tiên đáp án nhiễu cùng loại từ để câu khó hơn một chút
      const others = pool.filter((x) => x.en !== w.en);
      const samePos = shuffle(others.filter((x) => x.pos && x.pos === w.pos));
      const rest = shuffle(others.filter((x) => !samePos.includes(x)));
      const wrong = [...new Set([...samePos, ...rest].map((x) => x.en))].slice(0, 3);
      q.options = shuffle([w.en, ...wrong]);
      q.answer = w.en;
    } else {
      q.answer = w.en;
    }
    return q;
  }

  // ---------------------------------------------------------------
  // Vẽ màn làm bài
  // ---------------------------------------------------------------
  function drawSession() {
    if (!$("sessionRoot") || !session) return;
    if (session.finished) return drawResult();

    const s = session;
    const q = s.questions[s.i];
    const n = s.questions.length;
    setCrumb(`Ôn tập / ${TYPES[q.type].label}`);

    const modeLabel = s.mode === "full" ? `Ôn toàn bộ • ${n} từ` : s.mode === "retry" ? `Ôn từ sai • ${n} từ` : `Ôn nhanh • ${n} từ`;
    let main = "";
    if (q.type === "choose") main = viewChoose(q);
    if (q.type === "fill") main = viewFill(q);
    if (q.type === "write") main = viewWrite(q);

    $("sessionRoot").innerHTML = `
      <div class="rs-head">
        <div>
          <p class="st-crumb">Ôn tập / ${esc(s.topic.name)} · ${esc(s.topic.tag)}</p>
          <h1 class="page-title">Nhớ lâu hơn, dùng tự tin hơn</h1>
        </div>
        <button type="button" class="btn btn-outline" data-rv="exit">${I.close} Thoát ôn tập</button>
      </div>
      <div class="rs-progress-row">
        <span class="rs-mode">${I.refresh} ${modeLabel}</span>
        <span class="st-muted">Câu ${s.i + 1}/${n} • ${TYPES[q.type].label}</span>
      </div>
      <div class="bar rs-bar"><span style="width:${pct(s.i + (s.answered ? 1 : 0), n)}%"></span></div>

      <div class="st-grid rs-grid">
        <section class="st-card rs-card">${main}</section>
        <aside class="st-aside">${asideFor(q)}</aside>
      </div>

      ${s.answered ? feedbackBar(q) : `<p class="rv-footnote">Từ trả lời sai sẽ được gợi ý trong danh sách cần ôn lại khi kết thúc.</p>`}`;

    if (q.type === "write" && !s.answered) {
      const inp = $("rsInput");
      if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
    }
  }

  function viewChoose(q) {
    const letters = ["A", "B", "C", "D"];
    const done = session.answered;
    return `
      <h3 class="rs-q">Chọn nghĩa đúng của từ này</h3>
      <div class="rs-word-box">
        <p class="rs-word">${esc(q.w.en)}</p>
        <p class="rs-ipa">${q.w.ipa ? esc(q.w.ipa) : ""}
          <button type="button" class="rs-sound" data-rv="speak" data-text="${esc(q.w.en)}" aria-label="Nghe phát âm">${I.sound}</button></p>
      </div>
      <div class="rs-options">
        ${q.options.map((o, i) => {
          let cls = "";
          if (done && o === q.answer) cls = "ok";
          else if (done && o === q.given) cls = "bad";
          return `<button type="button" class="rs-opt ${cls}" data-rv="choose" data-val="${esc(o)}" ${done ? "disabled" : ""}>
                    <span class="rs-letter">${letters[i]}</span><span class="rs-opt-text">${esc(o)}</span>
                    <span class="rs-opt-ic">${cls === "ok" ? I.checkCircle : cls === "bad" ? I.xCircle : ""}</span></button>`;
        }).join("")}
      </div>`;
  }

  function viewFill(q) {
    const done = session.answered;
    const re = new RegExp(`\\b${reEsc(q.w.en)}\\b`, "i");
    const m = q.w.ex.match(re);
    const before = esc(q.w.ex.slice(0, m.index));
    const after = esc(q.w.ex.slice(m.index + m[0].length));
    const blank = done
      ? `<span class="rs-blank filled ${q.correct ? "ok" : "bad"}">${esc(q.given)}</span>`
      : `<span class="rs-blank"></span>`;
    return `
      <h3 class="rs-q">Điền từ thích hợp vào chỗ trống</h3>
      <p class="st-muted">Chọn một từ bên dưới để hoàn thành câu.</p>
      <div class="rs-sentence-box">
        <p class="rs-sentence">${before}${blank}${after}</p>
        ${q.w.exVi ? `<p class="rs-sentence-vi">${esc(q.w.exVi)}</p>` : ""}
      </div>
      <div class="rs-chips">
        ${q.options.map((o) => {
          let cls = "";
          if (done && o === q.answer) cls = "ok";
          else if (done && o === q.given) cls = "bad";
          return `<button type="button" class="rs-chip ${cls}" data-rv="fill" data-val="${esc(o)}" ${done ? "disabled" : ""}>
                    ${esc(o)} ${cls === "ok" ? I.check : cls === "bad" ? I.x : ""}</button>`;
        }).join("")}
      </div>
      ${done && !q.correct ? `<div class="rs-tags"><span class="rs-tag bad">Bạn chọn: ${esc(q.given)}</span><span class="rs-tag ok">Đáp án: ${esc(q.answer)}</span></div>` : ""}`;
  }

  function viewWrite(q) {
    const done = session.answered;
    const hintText = q.hints
      ? q.answer.split("").map((ch, i) => (i < q.hints || ch === " " ? ch : "_")).join(" ")
      : "";
    return `
      <h3 class="rs-q">Viết từ tiếng Anh tương ứng</h3>
      <p class="st-muted">Đọc nghĩa tiếng Việt, rồi nhập từ tiếng Anh.</p>
      <div class="rs-word-box">
        ${q.w.pos ? `<p class="rs-pos">${POS[q.w.pos] || esc(q.w.pos)}</p>` : ""}
        <p class="rs-word vi">${esc(q.w.vi)}</p>
        ${q.w.exVi ? `<p class="rs-ipa">Ngữ cảnh: ${esc(q.w.exVi)}</p>` : ""}
      </div>
      <label class="rs-input-label" for="rsInput">Câu trả lời của bạn</label>
      <input id="rsInput" class="rs-input ${done ? (q.correct ? "ok" : "bad") : ""}" type="text" autocomplete="off" autocapitalize="off" spellcheck="false"
             placeholder="Nhập từ tiếng Anh…" value="${esc(q.given ?? session.draft ?? "")}" ${done ? "disabled" : ""}>
      <div class="rs-input-foot">
        <span>Nhấn Enter để kiểm tra • Không phân biệt hoa thường</span>
        ${hintText ? `<span class="rs-hint-text">Gợi ý: ${esc(hintText)}</span>` : ""}
      </div>
      ${done ? "" : `
      <div class="rs-write-actions">
        <button type="button" class="btn btn-outline" data-rv="hint" ${q.hints >= q.answer.length - 1 ? "disabled" : ""}>${I.bulb} Cho tôi gợi ý</button>
        <button type="button" class="btn btn-primary" data-rv="submit-write">${I.check} Kiểm tra đáp án</button>
      </div>`}`;
  }

  function asideFor(q) {
    const tips = {
      choose: ["Nhìn nghĩa, nhớ ngữ cảnh", "Sau mỗi đáp án, hãy đọc câu mẫu để nhớ cách dùng từ."],
      fill: ["Nhớ theo cụm từ", "Đọc cả câu và nghĩ xem hành động nào hợp ngữ cảnh. Nhớ cả cụm giúp bạn dùng từ tự nhiên hơn."],
      write: ["Hãy thử trước khi xem gợi ý", "Tự viết lại từ giúp bạn nhớ chính tả tốt hơn. Gợi ý sẽ mở từng chữ cái."]
    };
    const desc = {
      choose: `Lượt ôn chỉ dùng những từ trong các bài bạn đã hoàn thành.`,
      fill: `Thử hình dung hành động trong câu trước khi chọn từ.`,
      write: `Viết đúng chính tả là bước nhớ sâu nhất.`
    };
    const [tTitle, tText] = tips[q.type];
    return `
      <div class="st-card st-side">
        <span class="rv-learned">Từ bạn đã học</span>
        <h3>${esc(q.lesson.title)}</h3>
        <p class="st-muted">Bài ${q.lesson.no} • ${esc(session.topic.name)}</p>
        <p>${desc[q.type]}</p>
      </div>
      <div class="st-tip">
        <span class="st-tip-ic">${I.bulb}</span>
        <div><b>${tTitle}</b><p>${tText}</p></div>
      </div>
      <p class="st-small">Thanh trên cùng là tiến độ lượt ôn, không phải tỷ lệ trả lời đúng.</p>`;
  }

  function feedbackBar(q) {
    const isLast = session.i === session.questions.length - 1;
    const ex = q.w.ex ? `<p>${esc(q.w.ex)}</p>` : q.w.exVi ? `<p>${esc(q.w.exVi)}</p>` : "";
    let title;
    if (q.correct) {
      title = `Chính xác! ${esc(q.w.en)} = ${esc(q.w.vi)}${q.hints ? ` <small>(dùng ${q.hints} gợi ý)</small>` : ""}`;
    } else if (q.type === "choose") {
      title = `Chưa đúng. “${esc(q.w.en)}” nghĩa là “${esc(q.w.vi)}”.`;
    } else if (q.type === "fill") {
      title = `Chưa đúng. Câu này cần từ “${esc(q.answer)}” (${esc(q.w.vi)}).`;
    } else {
      title = `Chưa đúng. Đáp án là “${esc(q.answer)}”${q.given ? `, bạn viết “${esc(q.given)}”` : ""}.`;
    }
    return `
      <div class="rs-feedback ${q.correct ? "ok" : "bad"}">
        <span class="rs-fb-ic">${q.correct ? I.checkCircle : I.xCircle}</span>
        <div class="rs-fb-text"><b>${title}</b>${ex}</div>
        <button type="button" class="btn btn-primary" data-rv="next" id="rsNext">${I.right} ${isLast ? "Xem kết quả" : q.correct ? "Câu tiếp theo" : "Đã hiểu, tiếp tục"}</button>
      </div>`;
  }

  // ---------------------------------------------------------------
  // Trả lời
  // ---------------------------------------------------------------
  function answer(given) {
    const s = session;
    if (s.answered) return;
    const q = s.questions[s.i];
    q.given = given;
    q.correct = q.type === "choose" ? given === q.answer : norm(given) === norm(q.answer);
    s.answered = true;
    s.draft = "";
    if (q.correct) api().addPoints(CONFIG.POINTS_PER_CORRECT);
    drawSession();
    setTimeout(() => $("rsNext")?.focus(), 0);
  }

  function next() {
    const s = session;
    if (s.i + 1 < s.questions.length) {
      s.i++;
      s.answered = false;
      drawSession();
      window.scrollTo({ top: 0 });
    } else {
      finish();
    }
  }

  function finish() {
    const s = session;
    s.finished = true;
    s.endedAt = Date.now();
    const correct = s.questions.filter((q) => q.correct).length;
    s.score = pct(correct, s.questions.length);
    if (s.mode === "quick") {
      api().saveReview(s.topic.id, { quick: { last: s.score, at: s.endedAt } });
    } else if (s.mode === "full") {
      const prev = api().getReview(s.topic.id).full;
      api().saveReview(s.topic.id, { full: { last: s.score, best: Math.max(prev?.best || 0, s.score), at: s.endedAt } });
    }
    drawResult();
    window.scrollTo({ top: 0 });
  }

  // ===============================================================
  // MÀN 3 – KẾT QUẢ
  // ===============================================================
  function drawResult() {
    const s = session;
    const n = s.questions.length;
    const correct = s.questions.filter((q) => q.correct).length;
    const wrongQs = s.questions.filter((q) => !q.correct);
    const minutes = Math.max(1, Math.round((s.endedAt - s.startedAt) / 60000));
    setCrumb("Ôn tập / Kết quả lượt ôn");

    // gộp các câu sai theo từ
    const wrongWords = [];
    wrongQs.forEach((q) => {
      const ex = wrongWords.find((x) => x.w.en === q.w.en);
      if (ex) ex.types.push(q.type); else wrongWords.push({ w: q.w, lesson: q.lesson, types: [q.type] });
    });

    const msg = s.score >= 90 ? ["Xuất sắc!", "Bạn nhớ gần như trọn vẹn. Giữ nhịp ôn đều để từ vựng thành phản xạ nhé."]
      : s.score >= 70 ? ["Bạn đã nhớ được rất nhiều!", "Chỉ cần ôn lại vài từ là bạn sẽ vững hơn nữa."]
      : s.score >= 50 ? ["Bạn đang tiến bộ!", "Hãy ôn lại các từ sai rồi thử thêm một lượt nhé."]
      : ["Mỗi lần sai là một lần nhớ!", "Đừng nản, quay lại bài học hoặc ôn từ sai ngay để nhớ chắc hơn."];

    const typeStats = Object.keys(TYPES).map((k) => {
      const qs = s.questions.filter((q) => q.type === k);
      const ok = qs.filter((q) => q.correct).length;
      return { k, total: qs.length, ok };
    }).filter((x) => x.total);

    const best = s.mode === "full" ? api().getReview(s.topic.id).full?.best : null;
    const modeName = s.mode === "full" ? "Ôn toàn bộ chủ đề" : s.mode === "retry" ? "Ôn lại từ sai" : "Ôn nhanh";

    $("sessionRoot").innerHTML = `
      <div class="rr-head">
        <div>
          <h1 class="page-title">Một lượt ôn, thêm một bước tiến!</h1>
          <p class="page-sub">${modeName} · ${esc(s.topic.name)} — bạn đã ôn ${n} từ. Đây là những gì bạn đã nhớ được hôm nay.</p>
        </div>
        <a href="#review" class="btn btn-outline btn-sm">Về trung tâm ôn tập</a>
      </div>

      <section class="st-card rr-summary">
        <div class="result-ring rr-ring ${s.score >= 70 ? "" : "low"}" style="--p:${s.score}">
          <b>${s.score}%<small>câu trả lời đúng</small></b>
        </div>
        <div class="rr-msg">
          <span class="rr-chip">${I.sparkle} ${s.mode === "full" ? "Tỷ lệ đúng toàn chủ đề" : "Kết quả lượt ôn"}</span>
          <h2>${msg[0]}</h2>
          <p>${msg[1]}${best !== null && best !== undefined ? ` Điểm cao nhất của chủ đề: <b>${best}%</b>.` : ""}</p>
        </div>
        <div class="rr-stats">
          <div><b>${correct}/${n}</b><span>Câu đúng</span></div>
          <div><b>${wrongWords.length}</b><span>Từ cần ôn</span></div>
          <div><b>${minutes} phút</b><span>Thời gian</span></div>
        </div>
      </section>

      <div class="st-grid rr-grid">
        <section class="st-card">
          <div class="rr-list-head">
            <h3>${wrongWords.length ? `${wrongWords.length} từ cần ôn lại` : "Không có từ nào sai 🎉"}</h3>
            ${wrongWords.length ? `<span class="rv-badge warn">Cần ôn</span>` : ""}
          </div>
          ${wrongWords.length ? `
          <div class="rr-words">
            ${wrongWords.map((x) => `
              <div class="rr-word">
                <div>
                  <b>${esc(x.w.en)}</b>
                  <p>${esc(x.w.vi)} • ${x.types.map((t) => TYPES[t].label).join(" • ")}</p>
                </div>
                <button type="button" class="rs-sound" data-rv="speak" data-text="${esc(x.w.en)}" aria-label="Nghe">${I.sound}</button>
              </div>`).join("")}
          </div>` : `<p class="st-muted">Bạn trả lời đúng tất cả các câu. Thử chế độ ôn toàn bộ hoặc học bài mới nhé!</p>`}
        </section>
        <aside class="st-card">
          <h3 class="rr-side-title">Theo dạng câu hỏi</h3>
          ${typeStats.map((x) => `
            <div class="rr-type">
              <div class="rr-type-top"><span>${TYPES[x.k].label}</span><b>${pct(x.ok, x.total)}%</b></div>
              <div class="bar ${pct(x.ok, x.total) >= 70 ? "green" : ""}"><span style="width:${pct(x.ok, x.total)}%"></span></div>
              <small>${x.ok}/${x.total} câu đúng</small>
            </div>`).join("")}
        </aside>
      </div>

      <div class="rr-foot">
        <p class="st-muted">Ôn lại từ sai ngay giúp bạn nhớ lâu hơn gấp nhiều lần.</p>
        <div>
          <a href="#review" class="btn btn-outline">Về trung tâm ôn tập</a>
          ${wrongWords.length
            ? `<button type="button" class="btn btn-primary" data-rv="retry">${I.refresh} Ôn từ sai ngay</button>`
            : `<button type="button" class="btn btn-primary" data-rv="again">${I.refresh} Ôn thêm lượt nữa</button>`}
        </div>
      </div>`;

    s.retryItems = wrongWords.map((x) => ({ w: x.w, lesson: x.lesson }));
  }

  // ---------------------------------------------------------------
  // Sự kiện (gắn một lần)
  // ---------------------------------------------------------------
  function bindOnce() {
    if (bound) return;
    bound = true;

    document.addEventListener("click", (e) => {
      const el = e.target.closest(".review [data-rv]");
      if (!el || el.disabled) return;
      const a = el.dataset.rv;

      if (a === "tab") {
        activeLevel = el.dataset.level;
        drawCenter();
        if (!api().isLevelOpen(activeLevel)) api().toast(api().lockReason(activeLevel));
      }
      else if (a === "speak") speak(el.dataset.text);
      else if (a === "choose" || a === "fill") answer(el.dataset.val);
      else if (a === "submit-write") submitWrite();
      else if (a === "hint") {
        const q = session.questions[session.i];
        session.draft = $("rsInput")?.value || "";
        q.hints = Math.min(q.answer.length - 1, q.hints + 1);
        drawSession();
      }
      else if (a === "next") next();
      else if (a === "exit") {
        if (session && !session.finished && session.i > 0 && !confirmExit()) return;
        window.location.hash = "#review";
      }
      else if (a === "retry") goSession(`${session.topic.id}/retry`);
      else if (a === "again") goSession(`${session.topic.id}/${session.mode === "retry" ? "quick" : session.mode}`);
    });

    document.addEventListener("keydown", (e) => {
      if (!$("sessionRoot") || !session || session.finished) return;
      if (e.key === "Enter") {
        if (e.target.id === "rsInput" && !session.answered) { e.preventDefault(); submitWrite(); }
        else if (session.answered && e.target.tagName !== "BUTTON") { e.preventDefault(); next(); }
      }
      // phím 1-4 để chọn đáp án
      const q = session.questions[session.i];
      if (!session.answered && q.options && ["1", "2", "3", "4"].includes(e.key) && e.target.id !== "rsInput") {
        answer(q.options[Number(e.key) - 1]);
      }
    });
  }

  // Hỏi lại trước khi bỏ dở lượt ôn (tránh dùng confirm() chặn trình duyệt: dùng toast 2 lần bấm)
  let exitArmed = 0;
  function confirmExit() {
    if (Date.now() - exitArmed < 3000) return true;
    exitArmed = Date.now();
    api().toast("Bấm “Thoát ôn tập” lần nữa để thoát. Lượt ôn đang làm sẽ không được lưu.");
    return false;
  }

  // Mở một lượt ôn mới; nếu địa chỉ không đổi (hashchange không chạy) thì tự vẽ lại
  function goSession(param) {
    const target = `#review-session/${param}`;
    if (window.location.hash === target) {
      $("sessionRoot").innerHTML = `<p class="st-loading">Đang chuẩn bị lượt ôn…</p>`;
      sessionMount(param);
      window.scrollTo({ top: 0 });
    } else {
      window.location.hash = target;
    }
  }

  function submitWrite() {
    const v = $("rsInput")?.value || "";
    if (!v.trim()) { api().toast("Nhập câu trả lời trước khi kiểm tra nhé."); return; }
    answer(v);
  }

  return { render, mount, sessionRender, sessionMount };
})();