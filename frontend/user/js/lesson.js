// ===== lesson.js – trang "Học từ mới" (chạy bên trong index.html qua router.js) =====
//
// pages.js gọi:  LessonPage.render()  -> trả HTML để chèn vào <main id="content">
//                LessonPage.mount()   -> tải dữ liệu, vẽ nội dung, gắn sự kiện
// study.js dùng:  LessonPage.api       -> đọc/ghi tiến độ bài học, mở bài kiểm tra
//
// LUẬT MỞ KHÓA
// 1) Người mới (onboarding chọn A0 / A1 / A2):
//    - Học tuần tự: bài N+1 chỉ mở khi bài N đã lật đủ từ + qua bài kiểm tra bài học.
//    - Xong toàn bộ A1 -> mở A2.
//    - Xong toàn bộ A1 + A2 (Sơ cấp) -> "Bài kiểm tra tổng Sơ cấp"; đúng >= 90% -> mở B1.
//    - Xong toàn bộ B1 -> "Bài kiểm tra tổng B1"; đúng >= 90% -> mở B2.
// 2) Người đã có nền (onboarding chọn B1+):
//    - Làm "Bài kiểm tra xếp lớp B1" (từ vựng A1 -> B1). Đúng >= 90% -> mở TẤT CẢ bài
//      từ A1 đến B1 (học tự do). Sau đó lên B2 như trên.
//    - Chưa đạt / bỏ qua -> học theo lộ trình người mới từ A1, làm lại bài xếp lớp bất cứ lúc nào.

const LessonPage = (() => {
  // ---------------------------------------------------------------
  // 1) CẤU HÌNH
  // ---------------------------------------------------------------
  // DEMO_MODE = true  : dùng dữ liệu mẫu lesson-data.js, tiến độ lưu localStorage.
  // DEMO_MODE = false : tải bài học + tiến độ từ backend FastAPI.
  const DEMO_MODE = true;

  const CONFIG = {
    LESSON_PASS: 0.8,          // bài kiểm tra cuối mỗi bài học
    GATE_PASS: 0.9,            // bài kiểm tra tổng & bài xếp lớp
    LESSON_QUESTIONS: 10,      // số câu bài kiểm tra cuối mỗi bài học
    GATE_QUESTIONS: 40,        // số câu bài kiểm tra tổng / xếp lớp (exam.js)
    TOPICS_SEQUENTIAL: false,  // true: phải xong chủ đề trước mới mở chủ đề sau
    BEGINNER_LEVELS: ["A0", "A1", "A2"]
  };

  const ROUTES = {
    levels: "/api/learn/levels",
    progress: "/api/learn/progress"
  };

  const KEYS = {
    onboarding: "vocabbit_onboarding",
    progress: "vocabbit_progress",
    token: "vocabbit_token"
  };

  const GATES = [
    { id: "gate-elementary", title: "Bài kiểm tra tổng · Sơ cấp", requires: ["A1", "A2"], unlocks: "B1", showOn: "A2" },
    { id: "gate-b1",         title: "Bài kiểm tra tổng · B1",      requires: ["B1"],       unlocks: "B2", showOn: "B1" },
    { id: "gate-b2",         title: "Bài kiểm tra tổng · B2",      requires: ["B2"],       unlocks: null, showOn: "B2" }
  ];

  const PLACEMENT = { id: "placement-B1", title: "Bài kiểm tra xếp lớp B1", level: "B1", covers: ["A1", "A2", "B1"] };

  // ---------------------------------------------------------------
  // 2) TRẠNG THÁI (giữ nguyên khi chuyển qua lại giữa các trang)
  // ---------------------------------------------------------------
  let LEVELS = [];
  let state = null;
  let profile = null;
  let activeLevel = null;
  let openTopicId = null;
  let quiz = null;
  let shellReady = false;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const onPage = () => !!$("levelTabs"); // đang hiển thị trang Học từ mới?

  const ICON = {
    lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
    chevron: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`,
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`
  };

  // ---------------------------------------------------------------
  // 3) HTML KHUNG TRANG (router chèn vào #content)
  // ---------------------------------------------------------------
  function render() {
    return `
      <div class="learn">
        <div class="lp-head">
          <div class="lp-levels">
            <p class="section-label">Chọn cấp độ</p>
            <div class="level-tabs" id="levelTabs" role="tablist"></div>
          </div>
          <div class="total-card">
            <p>Tổng từ đã học</p>
            <b id="totalWords">0 / 0 từ</b>
            <div class="total-row">
              <div class="bar"><span id="totalBar"></span></div>
              <small id="totalPct">0%</small>
            </div>
          </div>
        </div>

        <div id="notice"></div>

        <section class="level-card" id="levelCard"></section>
        <div class="tp-list" id="topicList"></div>
        <div id="gateSlot"></div>

      </div>`;
  }

  // Modal bài kiểm tra + toast nằm ngoài #content (gắn vào <body> một lần) để không bị xoá khi đổi trang
  function shellHTML() {
    return `
      <div class="modal" id="quizModal" hidden>
        <div class="modal-box quiz-box" role="dialog" aria-modal="true" aria-labelledby="quizTitle">
          <div class="modal-head">
            <div>
              <p class="eyebrow" id="quizEyebrow"></p>
              <h2 id="quizTitle"></h2>
            </div>
            <button type="button" class="lp-icon-btn" data-close aria-label="Đóng">${ICON.close}</button>
          </div>
          <div id="quizBody"></div>
        </div>
      </div>

      <div class="toast" id="toast" role="status" hidden></div>`;
  }

  // ---------------------------------------------------------------
  // 4) LƯU / ĐỌC
  // ---------------------------------------------------------------
  function readJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (err) { return fallback; }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* bỏ qua */ }
  }
  function authHeader() {
    let t = null;
    try { t = localStorage.getItem(KEYS.token); } catch (err) {}
    return t ? { Authorization: `Bearer ${t}` } : {};
  }

  function emptyProgress() {
    return { lessons: {}, tests: {}, placement: null, points: 0, streak: 0 };
  }
  function loadProgress() {
    return Object.assign(emptyProgress(), readJSON(KEYS.progress, {}));
  }
  function saveProgress(silent) {
    writeJSON(KEYS.progress, state);
    renderTopbar();
    if (!silent) document.dispatchEvent(new CustomEvent("vocabbit:progress"));
    if (!DEMO_MODE) {
      fetch(ROUTES.progress, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(state)
      }).catch(() => {});
    }
  }

  function loadProfile() {
    const a = readJSON(KEYS.onboarding, {}) || {};
    const level = a.level || "A0";
    return { level, needsPlacement: !CONFIG.BEGINNER_LEVELS.includes(level) && level === PLACEMENT.level };
  }

  async function loadLevels() {
    if (DEMO_MODE) return VOCAB_LEVELS;
    try {
      const res = await fetch(ROUTES.levels, { headers: authHeader() });
      if (!res.ok) throw new Error(res.status);
      return await res.json();
    } catch (err) {
      return typeof VOCAB_LEVELS !== "undefined" ? VOCAB_LEVELS : [];
    }
  }

  async function loadServerProgress() {
    if (DEMO_MODE) return;
    try {
      const res = await fetch(ROUTES.progress, { headers: authHeader() });
      if (res.ok) state = Object.assign(emptyProgress(), await res.json());
    } catch (err) { /* dùng bản localStorage */ }
  }

  // ---------------------------------------------------------------
  // 5) TRA CỨU TIẾN ĐỘ
  // ---------------------------------------------------------------
  const idx = (code) => LEVELS.findIndex((l) => l.code === code);
  const getLevel = (code) => LEVELS[idx(code)];
  const allLessons = (lv) => lv.topics.flatMap((t) => t.lessons);
  const allWords = (codes) => codes.flatMap((c) => allLessons(getLevel(c)).flatMap((l) => l.words));

  function ls(id) {
    const s = state.lessons[id] || {};
    // learned: từ đã nối đúng (tính tiến độ) · seen: đã xem ở bước 1 · flips: đã lật ở bước 2
    return { ...s, learned: s.learned || [], seen: s.seen || [], flips: s.flips || [], best: s.best || 0, passed: !!s.passed };
  }
  function setLs(id, patch) {
    state.lessons[id] = Object.assign(ls(id), patch);
  }

  const learnedOf = (lesson) => Math.min(ls(lesson.id).learned.length, lesson.words.length);
  const lessonDone = (lesson) => learnedOf(lesson) >= lesson.words.length && ls(lesson.id).passed;
  const topicDone = (t) => t.lessons.every(lessonDone);
  const levelDone = (code) => allLessons(getLevel(code)).every(lessonDone);
  const countWords = (lessons) => lessons.reduce((s, l) => s + l.words.length, 0);
  const countLearned = (lessons) => lessons.reduce((s, l) => s + learnedOf(l), 0);

  function findLesson(id) {
    for (const lv of LEVELS) {
      for (let ti = 0; ti < lv.topics.length; ti++) {
        const t = lv.topics[ti];
        const li = t.lessons.findIndex((l) => l.id === id);
        if (li >= 0) return { lv, t, ti, lesson: t.lessons[li], li };
      }
    }
    return null;
  }

  // ---------------------------------------------------------------
  // 6) LUẬT MỞ KHÓA
  // ---------------------------------------------------------------
  function mode() {
    if (!profile.needsPlacement) return "beginner";
    if (state.placement === "passed") return "advanced";
    if (state.placement === "failed" || state.placement === "skipped") return "beginner";
    return "pending";
  }

  function isFreeAccess(code) {
    return mode() === "advanced" && idx(code) <= idx(PLACEMENT.level);
  }

  function isLevelUnlocked(code) {
    if (mode() === "pending") return false;
    if (isFreeAccess(code)) return true;
    const i = idx(code);
    if (i === 0) return true;
    const gate = GATES.find((g) => g.unlocks === code);
    if (gate) return !!state.tests[gate.id]?.passed;
    return isLevelUnlocked(LEVELS[i - 1].code) && levelDone(LEVELS[i - 1].code);
  }

  function isTopicUnlocked(code, ti) {
    if (!isLevelUnlocked(code)) return false;
    if (isFreeAccess(code) || !CONFIG.TOPICS_SEQUENTIAL || ti === 0) return true;
    return topicDone(getLevel(code).topics[ti - 1]);
  }

  function isLessonUnlocked(code, ti, li) {
    if (!isTopicUnlocked(code, ti)) return false;
    if (isFreeAccess(code) || li === 0) return true;
    return lessonDone(getLevel(code).topics[ti].lessons[li - 1]);
  }

  function lockReason() {
  return "Hoàn thành cấp độ trước để mở khóa.";
}

  function gateStatus(g) {
    if (state.tests[g.id]?.passed) return "passed";
    if (g.unlocks && isLevelUnlocked(g.unlocks)) return "hidden";
    const ready = g.requires.every((c) => isLevelUnlocked(c) && levelDone(c));
    return ready ? "ready" : "locked";
  }

  function nextLessonIn(code, t, ti) {
    for (let li = 0; li < t.lessons.length; li++) {
      const l = t.lessons[li];
      if (!lessonDone(l) && isLessonUnlocked(code, ti, li)) return l;
    }
    return null;
  }

  const unlockedLevels = () => LEVELS.filter((l) => isLevelUnlocked(l.code)).map((l) => l.code);

  function pickActiveLevel() {
    if (mode() === "pending") return PLACEMENT.level;
    const unlocked = LEVELS.filter((l) => isLevelUnlocked(l.code));
    if (!unlocked.length) return LEVELS[0].code;
    const working = [...unlocked].reverse().find((l) => !levelDone(l.code));
    return (working || unlocked[unlocked.length - 1]).code;
  }

  function defaultOpenTopic() {
    const lv = getLevel(activeLevel);
    if (!isLevelUnlocked(lv.code)) return null;
    const inProgress = lv.topics.find((t) => countLearned(t.lessons) > 0 && !topicDone(t));
    if (inProgress) return inProgress.id;
    const firstOpen = lv.topics.find((t, ti) => isTopicUnlocked(lv.code, ti) && !topicDone(t));
    return (firstOpen || lv.topics[0]).id;
  }

  // ---------------------------------------------------------------
  // 7) VẼ NỘI DUNG
  // ---------------------------------------------------------------
  function renderAll() {
    renderTopbar();
    if (!onPage()) return; // đang ở trang khác thì không vẽ
    renderTotals();
    renderNotice();
    renderTabs();
    renderLevelCard();
    renderTopics();
    renderGate();
  }

  // Điểm & chuỗi ngày trên topbar chung của index.html
  function renderTopbar() {
    if ($("streakText")) $("streakText").textContent = `${state.streak} ngày liên tiếp`;
    if ($("pointsText")) $("pointsText").textContent = `${state.points} điểm`;
  }

  function renderTotals() {
    const lessons = allLessons(getLevel(activeLevel));
    const total = countWords(lessons);
    const learned = countLearned(lessons);
    $("totalWords").textContent = `${learned} / ${total} từ`;
    $("totalBar").style.width = pct(learned, total) + "%";
    $("totalPct").textContent = pct(learned, total) + "%";
  }

  function renderNotice() {
    const box = $("notice");
    if (!profile.needsPlacement) { box.innerHTML = ""; return; }

    const best = state.tests[PLACEMENT.id]?.best;
    const bestText = best !== undefined ? ` Điểm cao nhất của bạn: <b>${Math.round(best * 100)}%</b>.` : "";
    const m = mode();

    if (m === "pending") {
      box.innerHTML = `
        <section class="placement-card">
          <div class="placement-icon">🚀</div>
          <div class="placement-info">
            <p class="eyebrow">Bạn đã chọn trình độ ${PLACEMENT.level}+</p>
            <h2>Làm nhanh ${PLACEMENT.title}</h2>
            <p>${CONFIG.GATE_QUESTIONS} câu từ vựng ${PLACEMENT.covers.join(" → ")}. Đúng từ <b>${CONFIG.GATE_PASS * 100}%</b> trở lên,
               Vocabbit mở khóa toàn bộ bài học từ ${PLACEMENT.covers[0]} đến ${PLACEMENT.level} để bạn học tự do.${bestText}</p>
          </div>
          <div class="placement-actions">
            <button type="button" class="btn btn-primary" data-action="start-placement">${resumeLabel(PLACEMENT.id) || "Làm bài xếp lớp"}</button>
            <button type="button" class="btn btn-ghost" data-action="skip-placement">Mình muốn học từ ${LEVELS[0].code}</button>
          </div>
        </section>`;
    } else if (m === "advanced") {
      box.innerHTML = `
        <div class="notice notice-green">
          <span>🎉</span>
          <p>Bạn đã đạt ${PLACEMENT.title} — toàn bộ bài học ${PLACEMENT.covers[0]} → ${PLACEMENT.level} đã mở. Học tiếp ${PLACEMENT.level} hoặc ôn lại bất kỳ bài nào nhé.</p>
        </div>`;
    } else {
      box.innerHTML = `
        <div class="notice">
          <span>🧭</span>
          <p>Bạn đang học theo lộ trình từ ${LEVELS[0].code}. Muốn nhảy thẳng lên ${PLACEMENT.level}? Làm lại bài xếp lớp bất cứ lúc nào.${bestText}</p>
          <button type="button" class="btn btn-sm btn-outline" data-action="start-placement">Làm bài xếp lớp</button>
        </div>`;
    }
  }

  function renderTabs() {
    $("levelTabs").innerHTML = LEVELS.map((lv) => {
      const locked = !isLevelUnlocked(lv.code);
      const done = !locked && levelDone(lv.code);
      const active = lv.code === activeLevel;
      return `
        <button type="button" role="tab" aria-selected="${active}"
                class="level-tab ${active ? "active" : ""} ${locked ? "locked" : ""} ${done ? "done" : ""}"
                data-action="tab" data-level="${lv.code}">
          <b>${lv.code}</b>
          <span>${locked ? ICON.lock : done ? ICON.check : ""}${lv.topics.length} chủ đề</span>
        </button>`;
    }).join("");
  }

  function renderLevelCard() {
    const lv = getLevel(activeLevel);
    const lessons = allLessons(lv);
    const words = countWords(lessons);
    const p = pct(countLearned(lessons), words);
    const locked = !isLevelUnlocked(lv.code);

    const card = $("levelCard");
    card.classList.toggle("locked", locked);
    card.innerHTML = `
      <div class="lv-badge">${locked ? ICON.lock : lv.code}</div>
      <div class="lv-info">
        <h2>Cấp độ ${lv.code} — ${lv.name}</h2>
        <p>${lv.topics.length} chủ đề • ${lessons.length} bài học • ${words} từ vựng • ${lv.desc}</p>
        <div class="bar"><span style="width:${p}%"></span></div>
      </div>
      <div class="lv-pct"><b>${p}%</b><small>hoàn thành</small></div>`;
  }

  function renderTopics() {
    const lv = getLevel(activeLevel);
    const lockedNote = !isLevelUnlocked(lv.code) ? `
      <div class="locked-panel">
        <span class="locked-icon">${ICON.lock}</span>
        <div>
          <b>Cấp độ ${lv.code} đang khóa</b>
          <p>${lockReason(lv.code)}</p>
        </div>
      </div>` : "";
    $("topicList").innerHTML = lockedNote + lv.topics.map((t, ti) => topicHTML(lv, t, ti)).join("");
  }

  function topicHTML(lv, t, ti) {
    const unlocked = isTopicUnlocked(lv.code, ti);
    const words = countWords(t.lessons);
    const learned = countLearned(t.lessons);
    const p = pct(learned, words);
    const doneCount = t.lessons.filter(lessonDone).length;
    const allDone = doneCount === t.lessons.length;
    const isOpen = unlocked && openTopicId === t.id;
    const next = unlocked ? nextLessonIn(lv.code, t, ti) : null;

    let status = "";
    if (unlocked && allDone) status = `<span class="tag tag-green">Hoàn thành</span>`;
    else if (unlocked && (learned > 0 || doneCount > 0)) status = `<span class="tag tag-blue">Đang học</span>`;

    let footer = "";
    if (!isOpen) {
      if (!unlocked) {
        const why = isLevelUnlocked(lv.code)
          ? `Hoàn thành chủ đề “${lv.topics[ti - 1].name}” để mở khóa`
          : `Mở khóa cấp độ ${lv.code} để học chủ đề này`;
        footer = `<div class="tp-foot"><span class="muted">${ICON.lock} ${why}</span></div>`;
      } else {
        let chip = `<span class="muted">Chưa bắt đầu</span>`;
        let btn = "";
        if (allDone) {
          chip = `<span class="tag tag-green">Đã xong cả chủ đề</span>`;
          btn = `<button type="button" class="btn btn-sm btn-outline" data-action="open-lesson" data-lesson="${t.lessons[0].id}">Ôn lại</button>`;
        } else if (next) {
          const n = learnedOf(next);
          if (n > 0) chip = `<span class="tag tag-blue">Bài ${next.no} đang học · ${pct(n, next.words.length)}%</span>`;
          const label = n > 0 ? `Tiếp tục bài ${next.no}` : `Bắt đầu bài ${next.no}`;
          btn = `<button type="button" class="btn btn-sm ${n > 0 || doneCount > 0 ? "btn-primary" : "btn-outline"}" data-action="open-lesson" data-lesson="${next.id}">${label}</button>`;
        }
        footer = `
          <div class="tp-foot">
            <span class="muted">${doneCount}/${t.lessons.length} bài hoàn thành</span>
            ${chip}
            <span class="spacer"></span>
            ${btn}
          </div>`;
      }
    }

    const body = isOpen
      ? `<div class="lesson-list">${t.lessons.map((l, li) => lessonHTML(lv, ti, l, li, next && next.id)).join("")}</div>`
      : "";

    return `
      <article class="tp ${isOpen ? "open" : ""} ${unlocked ? "" : "locked"}">
        <button type="button" class="tp-head" data-action="toggle-topic" data-topic="${t.id}" aria-expanded="${isOpen}">
          <span class="tp-icon" style="background:${t.color}">${t.icon}</span>
          <span class="tp-info">
            <span class="tp-title">${esc(t.name)} <span class="tag tag-soft">${esc(t.tag)}</span> ${status}</span>
            <span class="tp-meta">${t.lessons.length} bài học • ${words} từ vựng • ${learned} từ đã học</span>
            <span class="tp-progress"><span class="bar"><span style="width:${p}%"></span></span><small>${p}%</small></span>
          </span>
          <span class="tp-chev">${unlocked ? ICON.chevron : ICON.lock}</span>
        </button>
        ${body}
        ${footer}
      </article>`;
  }

  function lessonHTML(lv, ti, lesson, li, currentId) {
    const unlocked = isLessonUnlocked(lv.code, ti, li);
    const done = lessonDone(lesson);
    const s = ls(lesson.id);
    const total = lesson.words.length;
    const n = learnedOf(lesson);
    const p = pct(n, total);
    const isCurrent = lesson.id === currentId;
    const waitingQuiz = unlocked && n >= total && !s.passed;

    const mark = done
      ? `<span class="ls-mark done">${ICON.check}</span>`
      : !unlocked
        ? `<span class="ls-mark lock">${ICON.lock}</span>`
        : `<span class="ls-mark ${isCurrent ? "current" : ""}">${lesson.no}</span>`;

    let tag = "";
    if (done) tag = `<span class="tag tag-green">Kiểm tra ${Math.round(s.best * 100)}%</span>`;
    else if (waitingQuiz) tag = `<span class="tag tag-orange">Chờ kiểm tra</span>`;
    else if (isCurrent) tag = `<span class="tag tag-blue">${n > 0 ? "Đang học" : "Tiếp theo"}</span>`;


    let btn;
    if (!unlocked) btn = `<button type="button" class="btn btn-sm btn-ghost" disabled>${ICON.lock} Đã khóa</button>`;
    else if (done) btn = `<button type="button" class="btn btn-sm btn-outline" data-action="open-lesson" data-lesson="${lesson.id}">Học lại</button>`;
    else if (waitingQuiz) btn = `<button type="button" class="btn btn-sm btn-primary" data-action="lesson-quiz" data-lesson="${lesson.id}">Làm kiểm tra</button>`;
    else btn = `<button type="button" class="btn btn-sm ${isCurrent ? "btn-primary" : "btn-outline"}" data-action="open-lesson" data-lesson="${lesson.id}">${n > 0 ? "Tiếp tục" : "Bắt đầu"}</button>`;

    const hint = !unlocked && li > 0
      ? `<p class="ls-hint">Hoàn thành bài ${li} để mở</p>` : "";

    return `
      <div class="lesson ${isCurrent ? "current" : ""} ${done ? "done" : ""} ${unlocked ? "" : "locked"}">
        ${mark}
        <div class="ls-info">
          <p class="ls-title">Bài ${lesson.no} · ${esc(lesson.title)} ${tag}</p>
          <div class="ls-progress"><span class="bar ${done ? "green" : ""}"><span style="width:${p}%"></span></span><small>${p}% · ${n}/${total} từ</small></div>
          ${hint}
        </div>
        ${btn}
      </div>`;
  }

  // Bài kiểm tra lớn đang làm dở -> "Tiếp tục (15/40)"
  function resumeLabel(id) {
    const ex = (state.exams || {})[id];
    if (!ex || !ex.answers) return "";
    const done = ex.answers.filter((a) => a.submitted).length;
    return `Tiếp tục bài kiểm tra (${done}/${ex.answers.length})`;
  }

  function renderGate() {
    const g = GATES.find((x) => x.showOn === activeLevel);
    const slot = $("gateSlot");
    if (!g) { slot.innerHTML = ""; return; }
    const status = gateStatus(g);
    if (status === "hidden") { slot.innerHTML = ""; return; }

    const checklist = g.requires.map((c) => {
      const lessons = allLessons(getLevel(c));
      const d = lessons.filter(lessonDone).length;
      const ok = d === lessons.length;
      return `<li class="${ok ? "ok" : ""}">${ok ? ICON.check : "<i></i>"} Hoàn thành ${c}: ${d}/${lessons.length} bài</li>`;
    }).join("");

    const best = state.tests[g.id]?.best;
    const bestText = best !== undefined ? `<p class="gate-best">Điểm cao nhất: <b>${Math.round(best * 100)}%</b></p>` : "";
    const goal = g.unlocks ? `mở khóa cấp độ ${g.unlocks}` : `hoàn thành chương trình ${g.requires.join(", ")}`;

    let btn;
    if (status === "passed") btn = `<button type="button" class="btn btn-outline" data-action="start-gate" data-gate="${g.id}">Làm lại</button>`;
    else if (status === "ready") btn = `<button type="button" class="btn btn-primary" data-action="start-gate" data-gate="${g.id}">${resumeLabel(g.id) || "Làm bài kiểm tra"}</button>`;
    else btn = `<button type="button" class="btn btn-ghost" disabled>${ICON.lock} Chưa mở</button>`;

    slot.innerHTML = `
      <section class="gate-card ${status}">
        <div class="gate-icon">${status === "passed" ? "🏆" : status === "ready" ? "📝" : "🔒"}</div>
        <div class="gate-info">
          <p class="eyebrow">${status === "passed" ? "Đã vượt qua" : "Bài kiểm tra tổng"}</p>
          <h3>${g.title}</h3>
          <p>${CONFIG.GATE_QUESTIONS} câu từ vựng ${g.requires.join(" + ")} · cần đúng từ <b>${CONFIG.GATE_PASS * 100}%</b> để ${goal}.</p>
          <ul class="gate-check">${checklist}</ul>
          ${bestText}
        </div>
        ${btn}
      </section>`;
  }

  // ---------------------------------------------------------------
  // 8) MỞ TRANG HỌC (study.js) – #study/<mã bài>[/<bước>]
  // ---------------------------------------------------------------
  function openStudy(id, step) {
    const ctx = findLesson(id);
    if (!ctx) return;
    if (!isLessonUnlocked(ctx.lv.code, ctx.ti, ctx.li)) {
      toast("Bài này đang khóa. Hoàn thành bài trước nhé!");
      return;
    }
    window.location.hash = `#study/${id}${step ? "/" + step : ""}`;
  }

  // ---------------------------------------------------------------
  // 9) BÀI KIỂM TRA
  // ---------------------------------------------------------------
  // Các dạng câu hỏi (dùng chung cho bài kiểm tra bài học & bài kiểm tra tổng ở exam.js):
  //   choose    : "routine" nghĩa là gì?                 -> chọn 1 trong 4 nghĩa
  //   context   : nghĩa của từ trong câu ví dụ           -> chọn 1 trong 4 nghĩa
  //   translate : dịch ngữ cảnh – chọn bản dịch đúng của câu ví dụ
  //   type      : nhập từ tiếng Anh có nghĩa "..."       -> gõ đáp án
  // Từ không có câu ví dụ (ex/exVi) thì câu context/translate tự đổi sang choose.
  const QTYPE_LABEL = { choose: "Chọn nghĩa", context: "Nghĩa trong ngữ cảnh", translate: "Dịch ngữ cảnh", type: "Nhập từ" };
  const normAns = (s) => String(s).trim().toLowerCase().replace(/\s+/g, " ");
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const hasEx = (w) => !!w.ex && new RegExp(`\\b${reEsc(w.en)}`, "i").test(w.ex);
  const markWord = (sentence, word) =>
    esc(sentence).replace(new RegExp(`\\b(${reEsc(word)})`, "i"), "<mark>$1</mark>");

  // items: [{ w, level? }] – pool: danh sách từ để lấy đáp án nhiễu
  function buildQuestion(item, type, pool) {
    const w = item.w;
    const exPool = pool.filter((x) => x.exVi && x.exVi !== w.exVi);
    if ((type === "context" || type === "translate") && !hasEx(w)) type = "choose";
    if (type === "translate" && (!w.exVi || exPool.length < 3)) type = "context";

    const q = { type, w, level: item.level, lessonId: item.lessonId, idx: item.idx };
    const wrongVi = () => shuffle([...new Set(pool.map((x) => x.vi))].filter((v) => v !== w.vi)).slice(0, 3);

    if (type === "choose") {
      q.prompt = `“${w.en}” nghĩa là gì?`;
      q.answer = w.vi;
      q.options = shuffle([w.vi, ...wrongVi()]);
    } else if (type === "context") {
      q.prompt = `Chọn nghĩa phù hợp cho từ “${w.en}” trong câu sau.`;
      q.sentence = markWord(w.ex, w.en);
      q.answer = w.vi;
      q.options = shuffle([w.vi, ...wrongVi()]);
    } else if (type === "translate") {
      q.prompt = "Chọn bản dịch đúng cho câu sau.";
      q.sentence = markWord(w.ex, w.en);
      q.answer = w.exVi;
      q.options = shuffle([w.exVi, ...shuffle([...new Set(exPool.map((x) => x.exVi))]).slice(0, 3)]);
    } else {
      q.prompt = `Nhập từ tiếng Anh có nghĩa “${w.vi}”.`;
      q.answer = w.en;
      q.hint = `${w.en.length} chữ cái · bắt đầu bằng “${w.en.charAt(0)}”`;
    }
    return q;
  }
  const isCorrect = (q, given) => (q.type === "type" ? normAns(given) === normAns(q.answer) : given === q.answer);

  // Tạo `count` câu từ danh sách items, chia đều các dạng; thiếu từ thì lặp lại từ với dạng khác
  function buildQuestions(items, count, types, pool) {
    if (!items.length) return [];
    let list = shuffle(items);
    while (list.length < count) list = list.concat(shuffle(items));
    list = list.slice(0, count);
    const cycle = shuffle(list.map((_, i) => types[i % types.length]));
    // tránh 1 từ bị hỏi 2 lần cùng một dạng
    const used = new Set();
    return list.map((it, i) => {
      let type = cycle[i];
      for (let k = 0; k < types.length && used.has(it.w.en + type); k++) type = types[(types.indexOf(type) + 1) % types.length];
      used.add(it.w.en + type);
      return buildQuestion(it, type, pool);
    });
  }

  // ----- Bài kiểm tra cuối bài học (modal, có đáp án ngay sau mỗi câu) -----
  function startQuiz(opts) {
    quiz = { ...opts, i: 0, correct: 0, answered: false };
    $("quizEyebrow").textContent = opts.eyebrow;
    $("quizTitle").textContent = opts.title;
    renderQuestion();
    showModal("quizModal");
  }

  function renderQuestion() {
    const q = quiz.questions[quiz.i];
    const n = quiz.questions.length;
    quiz.answered = false;
    const body = q.type === "type" ? `
      <input id="quizInput" class="quiz-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false"
             placeholder="Nhập từ tiếng Anh…">
      <p class="quiz-hint">Gợi ý: ${esc(q.hint)} · Nhấn Enter để kiểm tra</p>` : `
      <div class="quiz-options ${q.type === "translate" ? "one-col" : ""}">
        ${q.options.map((o) => `<button type="button" class="quiz-opt" data-opt="${esc(o)}">${esc(o)}</button>`).join("")}
      </div>`;

    $("quizBody").innerHTML = `
      <div class="quiz-top">
        <div class="bar"><span style="width:${pct(quiz.i, n)}%"></span></div>
        <small>Câu ${quiz.i + 1} / ${n} · ${QTYPE_LABEL[q.type]}</small>
      </div>
      <h3 class="quiz-q">${esc(q.prompt)}</h3>
      ${q.sentence ? `<p class="quiz-sentence">${q.sentence}</p>` : ""}
      ${body}
      <p class="quiz-feedback" id="quizFeedback"></p>
      <div class="quiz-actions">
        ${q.type === "type" ? `<button type="button" class="btn btn-outline" id="quizSubmit">Kiểm tra</button>` : ""}
        <button type="button" class="btn btn-primary" id="quizNext" disabled>${quiz.i + 1 < n ? "Câu tiếp theo" : "Xem kết quả"}</button>
      </div>`;
    if (q.type === "type") setTimeout(() => $("quizInput")?.focus(), 30);
  }

  function answerQuestion(given, btn) {
    if (quiz.answered) return;
    const q = quiz.questions[quiz.i];
    if (q.type === "type" && !String(given).trim()) { toast("Nhập câu trả lời trước nhé."); return; }
    quiz.answered = true;
    const ok = isCorrect(q, given);
    if (ok) quiz.correct++;

    if (q.type === "type") {
      const inp = $("quizInput");
      inp.disabled = true;
      inp.classList.add(ok ? "correct" : "wrong");
      if ($("quizSubmit")) $("quizSubmit").disabled = true;
    } else {
      document.querySelectorAll(".quiz-opt").forEach((b) => {
        b.disabled = true;
        if (b.dataset.opt === q.answer) b.classList.add("correct");
      });
      if (!ok && btn) btn.classList.add("wrong");
    }

    const fb = $("quizFeedback");
    fb.className = `quiz-feedback ${ok ? "ok" : "bad"}`;
    fb.textContent = ok
      ? `Chính xác! ${q.w.en} = ${q.w.vi} 🎉`
      : `Chưa đúng. Đáp án: ${q.answer}${q.type === "translate" ? "" : ` (${q.w.en} = ${q.w.vi})`}`;
    $("quizNext").disabled = false;
    $("quizNext").focus();
  }

  function nextQuestion() {
    if (quiz.i + 1 < quiz.questions.length) {
      quiz.i++;
      renderQuestion();
    } else {
      finishQuiz();
    }
  }

  function finishQuiz() {
    const n = quiz.questions.length;
    const score = quiz.correct / n;
    const passed = score >= quiz.pass;
    const before = unlockedLevels();
    const result = quiz.onDone(score, passed);
    const newly = unlockedLevels().filter((c) => !before.includes(c));

    const actions = (result.actions || []).filter(Boolean);
    $("quizBody").innerHTML = `
      <div class="quiz-result ${passed ? "pass" : "fail"}">
        <div class="result-ring" style="--p:${Math.round(score * 100)}">
          <b>${Math.round(score * 100)}%</b>
        </div>
        <h3>${passed ? "Tuyệt vời, bạn đã đạt!" : "Chưa đạt rồi, thử lại nhé!"}</h3>
        <p class="muted">Đúng ${quiz.correct}/${n} câu · cần từ ${Math.round(quiz.pass * 100)}%</p>
        ${newly.length ? `<p class="unlock-msg">🔓 Đã mở khóa cấp độ ${newly.join(", ")}!</p>` : ""}
        <p>${result.text}</p>
        <div class="quiz-actions">
          ${actions.map((a, i) => `<button type="button" class="btn ${a.primary ? "btn-primary" : "btn-outline"}" data-result="${i}">${a.label}</button>`).join("")}
        </div>
      </div>`;
    quiz.resultActions = actions;
    renderAll();
  }

  function startLessonQuiz(id) {
    const ctx = findLesson(id);
    if (!ctx) return;
    const { lv, t, ti, lesson, li } = ctx;
    // đáp án nhiễu: ưu tiên từ cùng bài, thêm từ cùng chủ đề để đủ câu dịch ngữ cảnh
    const pool = [...lesson.words, ...t.lessons.flatMap((l) => l.words)];
    const items = lesson.words.map((w, idx) => ({ w, lessonId: lesson.id, idx }));

    startQuiz({
      eyebrow: `Kiểm tra bài học · ${t.name}`,
      title: `Bài ${lesson.no} · ${lesson.title}`,
      questions: buildQuestions(items, CONFIG.LESSON_QUESTIONS, ["type", "choose", "translate"], pool),
      pass: CONFIG.LESSON_PASS,
      onDone(score, passed) {
        const s = ls(id);
        const firstPass = passed && !s.passed;
        setLs(id, { best: Math.max(s.best, score), passed: s.passed || passed });
        if (firstPass) state.points += 20;
        saveProgress();

        if (!passed) {
          return {
            text: `Cần đúng ít nhất ${CONFIG.LESSON_PASS * 100}% để mở bài tiếp theo. Ôn lại flashcard rồi thử lại nhé.`,
            actions: [
              { label: "Ôn lại flashcard", fn: () => { closeAll(); openStudy(id, 2); } },
              { label: "Làm lại", primary: true, fn: () => startLessonQuiz(id) }
            ]
          };
        }
        const nxt = t.lessons[li + 1];
        const nxtOpen = nxt && isLessonUnlocked(lv.code, ti, li + 1);
        const topicFinished = t.lessons.every(lessonDone);
        const levelFinished = levelDone(lv.code);
        let extra = "";
        if (levelFinished) extra = " Bạn đã học xong cả cấp độ — bài kiểm tra tổng đang chờ bạn!";
        else if (topicFinished) extra = ` Bạn đã hoàn thành chủ đề ${t.name}!`;
        return {
          text: (firstPass
            ? (nxt ? `+20 điểm. Bài ${nxt.no} · ${nxt.title} đã sẵn sàng.` : "+20 điểm.")
            : "Bạn đã ôn lại bài này thật tốt.") + extra,
          actions: [
            { label: "Đóng", fn: closeAll },
            nxtOpen ? { label: `Học bài ${nxt.no}`, primary: true, fn: () => { closeAll(); openStudy(nxt.id); } } : null
          ]
        };
      }
    });
  }

  // ----- Bài kiểm tra tổng & xếp lớp: làm ở trang riêng #exam/<mã bài> (exam.js) -----
  function startGate(gateId) {
    const g = GATES.find((x) => x.id === gateId);
    if (!g || gateStatus(g) === "locked") {
      toast("Hoàn thành tất cả bài học trước khi làm bài kiểm tra tổng nhé!");
      return;
    }
    window.location.hash = `#exam/${g.id}`;
  }

  function startPlacement() {
    window.location.hash = `#exam/${PLACEMENT.id}`;
  }

  // Thông tin một bài kiểm tra lớn cho exam.js
  function testDef(id) {
    if (id === PLACEMENT.id) {
      return {
        id, kind: "placement", title: PLACEMENT.title, levels: PLACEMENT.covers, unlocks: PLACEMENT.level,
        available: profile.needsPlacement,
        reason: "Bài xếp lớp dành cho người chọn trình độ B1+ khi trả lời câu hỏi đầu tiên.",
        learnedOnly: false
      };
    }
    const g = GATES.find((x) => x.id === id);
    if (!g) return null;
    const st = gateStatus(g);
    return {
      id, kind: "gate", title: g.title, levels: g.requires, unlocks: g.unlocks,
      available: st === "ready" || st === "passed",
      reason: lockReason(g.unlocks || g.requires[0]),
      learnedOnly: true
    };
  }

  // Ghi kết quả bài kiểm tra lớn -> trả về { passed, newly: [cấp độ vừa mở] }
  function recordTest(id, score) {
    const passed = score >= CONFIG.GATE_PASS;
    const before = unlockedLevels();
    const prev = state.tests[id] || {};
    state.tests[id] = { best: Math.max(prev.best || 0, score), last: score, passed: !!prev.passed || passed, at: Date.now() };
    if (id === PLACEMENT.id) {
      state.placement = state.placement === "passed" || passed ? "passed" : "failed";
    } else if (passed && !prev.passed) {
      state.points += 100;
    }
    saveProgress();
    const newly = unlockedLevels().filter((c) => !before.includes(c));
    if (newly.length) { activeLevel = newly[newly.length - 1]; openTopicId = null; }
    return { passed, newly, firstPass: passed && !prev.passed };
  }

  // ---------------------------------------------------------------
  // 10) MODAL, TOAST, CHUYỂN CẤP ĐỘ
  // ---------------------------------------------------------------
  function showModal(id) { $(id).hidden = false; document.body.classList.add("no-scroll"); }
  function hideModal(id) {
    $(id).hidden = true;
    if ($("quizModal").hidden) document.body.classList.remove("no-scroll");
  }
  function closeAll() { if (shellReady) hideModal("quizModal"); renderAll(); }

  let toastTimer;
  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 2800);
  }

  function switchLevel(code) {
    activeLevel = code;
    openTopicId = defaultOpenTopic();
    renderAll();
  }

  // ---------------------------------------------------------------
  // 11) SỰ KIỆN – gắn MỘT lần (router có thể gọi mount() nhiều lần)
  // ---------------------------------------------------------------
  function ensureShell() {
    if (shellReady) return;
    shellReady = true;

    const shell = document.createElement("div");
    shell.className = "learn";
    shell.id = "learnShell";
    shell.innerHTML = shellHTML();
    document.body.appendChild(shell);

    // Bấm các nút trong trang (dùng ủy quyền sự kiện vì nội dung được vẽ lại liên tục)
    document.addEventListener("click", (e) => {
      const el = e.target.closest(".learn [data-action]");
      if (!el || el.disabled) return;
      const a = el.dataset.action;

      if (a === "tab") {
        switchLevel(el.dataset.level);
        if (!isLevelUnlocked(el.dataset.level)) toast(lockReason(el.dataset.level));
      } else if (a === "toggle-topic") {
        const lv = getLevel(activeLevel);
        const ti = lv.topics.findIndex((t) => t.id === el.dataset.topic);
        if (!isTopicUnlocked(lv.code, ti)) {
          toast(isLevelUnlocked(lv.code) ? "Hoàn thành chủ đề trước để mở khóa nhé!" : lockReason(lv.code));
          return;
        }
        openTopicId = openTopicId === el.dataset.topic ? null : el.dataset.topic;
        renderTopics();
      } else if (a === "open-lesson") {
        openStudy(el.dataset.lesson);
      } else if (a === "lesson-quiz") {
        startLessonQuiz(el.dataset.lesson);
      } else if (a === "start-gate") {
        startGate(el.dataset.gate);
      } else if (a === "start-placement") {
        startPlacement();
      } else if (a === "skip-placement") {
        state.placement = "skipped";
        saveProgress();
        switchLevel(LEVELS[0].code);
      }
    });

    $("quizBody").addEventListener("click", (e) => {
      const opt = e.target.closest(".quiz-opt");
      if (opt) return answerQuestion(opt.dataset.opt, opt);
      if (e.target.closest("#quizSubmit")) return answerQuestion($("quizInput").value);
      if (e.target.closest("#quizNext")) return nextQuestion();
      const r = e.target.closest("[data-result]");
      if (r) quiz.resultActions[Number(r.dataset.result)].fn();
    });

    shell.querySelectorAll(".modal").forEach((m) => {
      m.addEventListener("click", (e) => {
        if (e.target === m || e.target.closest("[data-close]")) closeAll();
      });
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("quizModal").hidden) closeAll();
      if (e.key === "Enter" && e.target.id === "quizInput" && quiz && !quiz.answered) {
        e.preventDefault();
        answerQuestion(e.target.value);
      }
    });

    // Rời sang trang khác (Ôn tập, Hồ sơ...) thì đóng modal
    window.addEventListener("hashchange", closeAll);
  }

  // ---------------------------------------------------------------
  // 12) MOUNT – router gọi mỗi lần mở trang Học từ mới
  // ---------------------------------------------------------------
  // Tải dữ liệu một lần (trang Học từ mới và trang học bài đều gọi)
  let loading = null;
  function ensureData() {
    ensureShell();
    if (!loading) {
      loading = (async () => {
        LEVELS = await loadLevels();
        state = loadProgress();
        await loadServerProgress();
      })();
    }
    return loading.then(() => { profile = loadProfile(); });
  }

  async function mount() {
    await ensureData();
    if (!LEVELS.length) return;
    if (!activeLevel) {
      activeLevel = pickActiveLevel();
      openTopicId = defaultOpenTopic();
    }
    renderAll();
  }

  // ---------------------------------------------------------------
  // 13) API cho study.js
  // ---------------------------------------------------------------
  const api = {
    ready: ensureData,
    config: CONFIG,
    findLesson,
    getLesson: (id) => ls(id),
    isLessonOpen(id) {
      const c = findLesson(id);
      return !!c && isLessonUnlocked(c.lv.code, c.ti, c.li);
    },
    isLessonDone: (id) => { const c = findLesson(id); return !!c && lessonDone(c.lesson); },
    // Lưu các thông tin phụ (bước đang học, từ đã xem...) – không cộng điểm
    update(id, patch) { setLs(id, patch); saveProgress(true); },
    // Từ được nối đúng ở bước 3 -> tăng tiến độ, +5 điểm mỗi từ mới
    markLearned(id, indexes) {
      const s = ls(id);
      const add = indexes.filter((i) => !s.learned.includes(i));
      if (!add.length) return 0;
      setLs(id, { learned: [...s.learned, ...add] });
      state.points += 5 * add.length;
      saveProgress(true);
      return add.length;
    },
    nextLessonOf(id) {
      const c = findLesson(id);
      if (!c) return null;
      const nxt = c.t.lessons[c.li + 1];
      return nxt && isLessonUnlocked(c.lv.code, c.ti, c.li + 1) ? nxt : null;
    },
    startLessonQuiz,
    toast,

    // ----- dùng cho review.js (Trung tâm ôn tập) -----
    levels: () => LEVELS,
    isLevelOpen: (code) => isLevelUnlocked(code),
    lockReason,
    pickActiveLevel,
    lessonDoneObj: (lesson) => lessonDone(lesson),
    // bài tiếp theo nên học trong 1 chủ đề (đã mở, chưa xong)
    nextLessonInTopic(topicId) {
      for (const lv of LEVELS) {
        const ti = lv.topics.findIndex((t) => t.id === topicId);
        if (ti >= 0) return nextLessonIn(lv.code, lv.topics[ti], ti);
      }
      return null;
    },
    getReview: (topicId) => (state.reviews || {})[topicId] || {},
    saveReview(topicId, patch) {
      state.reviews = state.reviews || {};
      state.reviews[topicId] = Object.assign(state.reviews[topicId] || {}, patch);
      saveProgress(true);
    },
    addPoints(n) { state.points += n; saveProgress(true); },

    // ----- dùng cho exam.js (bài kiểm tra tổng / xếp lớp) -----
    testDef,
    recordTest,
    buildQuestions,
    isCorrect,
    qTypeLabel: QTYPE_LABEL,
    getTestResult: (id) => state.tests[id] || null,
    getExam: (id) => (state.exams || {})[id] || null,
    saveExam(id, data) { state.exams = state.exams || {}; state.exams[id] = data; saveProgress(true); },
    clearExam(id) { if (state.exams) delete state.exams[id]; saveProgress(true); }
  };

  return { render, mount, api };
})();