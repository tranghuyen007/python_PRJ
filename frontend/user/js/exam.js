// ===== exam.js – Bài kiểm tra tổng & bài xếp lớp (index.html#exam/<mã bài>) =====
//
//   #exam/gate-a1          : Bài kiểm tra tổng A1                -> đạt 90% mở A2
//   #exam/gate-elementary  : Bài kiểm tra tổng Sơ cấp (A1 + A2)  -> đạt 90% mở B1
//   #exam/gate-b1          : Bài kiểm tra tổng B1                -> đạt 90% mở B2
//   #exam/gate-b2          : Bài kiểm tra tổng B2
//   #exam/placement-B1     : Bài kiểm tra cấp độ (A1 -> B1)      -> xếp lớp theo số câu đúng:
//                            < 2/3 -> A1 · >= 2/3 -> A2 (mở A1, A2) · đúng hết -> B1 (mở A1..B1)
//
// - 40 câu ngẫu nhiên, chia đều theo cấp độ, lấy từ các bài đã học (bài xếp lớp: lấy toàn bộ từ).
// - 4 dạng: Chọn nghĩa · Nghĩa trong ngữ cảnh · Dịch ngữ cảnh · Nhập từ.
// - Chọn đáp án rồi bấm "Nộp câu trả lời". Đáp án đúng/sai chỉ hiện khi nộp hết.
// - Bài làm dở được lưu, thoát ra rồi quay lại vẫn làm tiếp.
//
// Câu hỏi được tạo bằng LessonPage.api.buildQuestions (dùng chung với bài kiểm tra bài học).

const ExamPage = (() => {
  const api = () => LessonPage.api;
  const TYPES = ["choose", "context", "translate", "type"];
  const LETTERS = ["A", "B", "C", "D"];

  let exam = null;   // { id, questions, answers: [{given, submitted}], cur, startedAt }
  let def = null;    // thông tin bài kiểm tra (từ api.testDef)
  let result = null; // kết quả sau khi nộp hết
  let bound = false;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const onPage = () => !!$("examRoot");

  const I = {
    right: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r=".6" fill="currentColor"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
    x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M7 7l10 10M17 7 7 17"/></svg>`,
    lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>`
  };

  function setCrumb(t) {
    const el = document.querySelector(".topbar-title");
    if (el) el.textContent = t;
  }
  const passNeed = () => Math.ceil(api().config.GATE_PASS * exam.questions.length);

  // ---------------------------------------------------------------
  // Router gọi
  // ---------------------------------------------------------------
  function render() {
    return `<div class="learn study exam" id="examRoot"><p class="st-loading">Đang chuẩn bị bài kiểm tra…</p></div>`;
  }

  async function mount(param = "") {
    await api().ready();
    bindOnce();
    if (!onPage()) return;

    const id = param.split("/")[0];
    def = api().testDef(id);
    result = null;
    if (!def) return message("Không tìm thấy bài kiểm tra", "Bài kiểm tra này không tồn tại.");
    if (!def.available) return message("Bài kiểm tra đang khóa", def.reason);

    const saved = api().getExam(id);
    exam = saved && Array.isArray(saved.questions) && saved.questions.length ? saved : createExam();
    if (!exam.questions.length) return message("Chưa đủ từ để kiểm tra", "Hãy hoàn thành các unit trước nhé.");
    persist();
    draw();
  }

  function message(title, text) {
    setCrumb("Học từ mới / Bài kiểm tra");
    $("examRoot").innerHTML = `
      <div class="st-message">
        <div class="st-msg-icon">🔒</div>
        <h2>${esc(title)}</h2><p>${esc(text)}</p>
        <a href="#learn" class="btn btn-primary">Về Học từ mới</a>
      </div>`;
  }

  // ---------------------------------------------------------------
  // Tạo đề: chia đều số câu cho các cấp độ, lấy ngẫu nhiên từ các chủ đề / bài đã học
  // ---------------------------------------------------------------
  function createExam() {
    const total = api().config.GATE_QUESTIONS;
    const levels = def.levels.map((c) => api().levels().find((l) => l.code === c)).filter(Boolean);
    const base = Math.floor(total / levels.length);
    const questions = [];

    levels.forEach((lv, k) => {
      const count = base + (k >= levels.length - (total % levels.length) ? 1 : 0);
      const items = lv.topics.flatMap((t) => t.lessons
        .filter((l) => !def.learnedOnly || api().lessonDoneObj(l))
        .flatMap((l) => l.words.map((w, idx) => ({ w, level: lv.code, lessonId: l.id, idx }))));
      const pool = lv.topics.flatMap((t) => t.lessons.flatMap((l) => l.words));
      questions.push(...api().buildQuestions(items, count, TYPES, pool));
    });

    return {
      id: def.id,
      questions,
      answers: questions.map(() => ({ given: null, submitted: false })),
      cur: 0,
      startedAt: Date.now()
    };
  }

  function persist() { api().saveExam(exam.id, exam); }

  // ---------------------------------------------------------------
  // Vẽ màn làm bài
  // ---------------------------------------------------------------
  function draw() {
    if (!onPage() || !exam) return;
    if (result) return drawResult();

    const n = exam.questions.length;
    const i = exam.cur;
    const q = exam.questions[i];
    const a = exam.answers[i];
    const submittedCount = exam.answers.filter((x) => x.submitted).length;
    setCrumb(`Học từ mới / ${def.kind === "placement" ? "Bài xếp lớp" : "Bài kiểm tra tổng"}`);

    // ----- khối câu hỏi -----
    let body;
    if (q.type === "type") {
      body = `
        <label class="ex-input-label" for="exInput">Câu trả lời của bạn</label>
        <input id="exInput" class="ex-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false"
               placeholder="Nhập từ tiếng Anh…" value="${esc(a.given ?? "")}" ${a.submitted ? "disabled" : ""}>
        <p class="ex-hint">Gợi ý: ${esc(q.hint)} · Không phân biệt hoa thường</p>`;
    } else {
      body = `
        <div class="ex-options">
          ${q.options.map((o, k) => `
            <button type="button" class="ex-opt ${a.given === o ? "sel" : ""}"
                    data-ex="pick" data-val="${esc(o)}" ${a.submitted ? "disabled" : ""}>
              <span class="ex-letter">${LETTERS[k]}</span>
              <span class="ex-opt-text">${esc(o)}</span>
              <span class="ex-radio"></span>
            </button>`).join("")}
        </div>`;
    }

    let status;
    if (a.submitted) status = "Đã nộp câu trả lời";
    else if (q.type === "type") status = a.given ? "Đã nhập · Chưa nộp câu trả lời" : "Chưa nhập câu trả lời";
    else status = a.given ? `Đã chọn ${LETTERS[q.options.indexOf(a.given)]} · Chưa nộp câu trả lời` : "Chưa chọn đáp án";

    const nextOpen = nextUnsubmitted(i);
    const actions = a.submitted ? `
        <span class="st-muted">Câu này đã nộp. Đáp án sẽ hiện khi bạn hoàn tất.</span>
        ${nextOpen >= 0 ? `<button type="button" class="btn btn-primary" data-ex="goto" data-i="${nextOpen}">Đến câu chưa làm ${I.right}</button>` : ""}` : `
        <button type="button" class="btn btn-primary" data-ex="submit" id="exSubmit" ${a.given && String(a.given).trim() ? "" : "disabled"}>Nộp câu trả lời ${I.right}</button>`;

    // ----- khối tiến trình -----
    const grid = exam.questions.map((_, k) => {
      const cls = k === i ? "cur" : exam.answers[k].submitted ? "done" : "";
      return `<button type="button" class="ex-cell ${cls}" data-ex="goto" data-i="${k}" aria-label="Câu ${k + 1}">${k + 1}</button>`;
    }).join("");

    $("examRoot").innerHTML = `
      <div class="ex-head">
        <div>
          <h1 class="page-title">${esc(def.title)}</h1>
        </div>
      </div>

      <div class="ex-grid">
        <section class="st-card ex-card">
          <div class="ex-card-top">
            <span class="st-chip">${esc(q.level)} · Câu ${i + 1} / ${n}</span>
          </div>
          <h2 class="ex-q">${esc(q.prompt)}</h2>
          ${q.sentence ? `<div class="ex-sentence">${q.sentence}</div>` : ""}
          ${body}
          <p class="ex-status">${I.info} ${status}</p>
          <div class="ex-actions">${actions}</div>
        </section>

        <aside class="st-aside">
          <div class="st-card ex-progress">
            <h3>Tiến trình kiểm tra</h3>
            <div class="ex-count"><b>${submittedCount}/${n}</b></div>
            <div class="bar"><span style="width:${pct(submittedCount, n)}%"></span></div>
            <div class="ex-cells">${grid}</div>
          </div>
          <button type="button" class="ex-exit" data-ex="exit">Lưu &amp; thoát kiểm tra</button>
        </aside>
      </div>`;

    if (q.type === "type" && !a.submitted) {
      const inp = $("exInput");
      inp.focus();
      inp.setSelectionRange(inp.value.length, inp.value.length);
    }
  }

  function nextUnsubmitted(from) {
    const n = exam.answers.length;
    for (let k = 1; k <= n; k++) {
      const j = (from + k) % n;
      if (!exam.answers[j].submitted) return j;
    }
    return -1;
  }

  // ---------------------------------------------------------------
  // Thao tác
  // ---------------------------------------------------------------
  function pick(val) {
    exam.answers[exam.cur].given = val;
    persist();
    draw();
  }

  function submit(skip) {
    const a = exam.answers[exam.cur];
    if (a.submitted) return;
    if (!skip && !(a.given && String(a.given).trim())) return;
    if (skip) a.given = null;
    a.submitted = true;
    api().logActivity();
    const nxt = nextUnsubmitted(exam.cur);
    if (nxt < 0) return finish();
    exam.cur = nxt;
    persist();
    draw();
    window.scrollTo({ top: 0 });
  }

  function finish() {
    const n = exam.questions.length;
    const marks = exam.questions.map((q, k) => {
      const given = exam.answers[k].given;
      return given !== null && given !== undefined && api().isCorrect(q, given);
    });
    const correct = marks.filter(Boolean).length;
    const score = correct / n;
    const rec = api().recordTest(exam.id, score, correct, n);
    api().clearExam(exam.id);
    result = { ...rec, correct, n, score, marks, endedAt: Date.now() };
    drawResult();
    window.scrollTo({ top: 0 });
  }

  // ---------------------------------------------------------------
  // Màn kết quả
  // ---------------------------------------------------------------
  function drawResult() {
    const r = result;
    const p = Math.round(r.score * 100);
    const minutes = Math.max(1, Math.round((r.endedAt - exam.startedAt) / 60000));
    setCrumb(`Học từ mới / Kết quả ${def.kind === "placement" ? "bài xếp lớp" : "bài kiểm tra tổng"}`);

    const byLevel = def.levels.map((c) => {
      const idx = exam.questions.map((q, k) => (q.level === c ? k : -1)).filter((k) => k >= 0);
      const ok = idx.filter((k) => r.marks[k]).length;
      return { label: c, ok, total: idx.length };
    });
    const byType = TYPES.map((t) => {
      const idx = exam.questions.map((q, k) => (q.type === t ? k : -1)).filter((k) => k >= 0);
      return { label: api().qTypeLabel[t], ok: idx.filter((k) => r.marks[k]).length, total: idx.length };
    }).filter((x) => x.total);

    const wrong = exam.questions.map((q, k) => ({ q, k, given: exam.answers[k].given })).filter((x) => !r.marks[x.k]);

    let headline, text, actions;
    if (def.kind === "placement") {
      const lv = r.placedBest || r.placed;
      const first = api().levels()[0].code;
      headline = `Bạn được xếp vào cấp độ ${r.placed}`;
      text = (r.placed === first
        ? `Bạn đúng ${r.correct}/${r.n} câu. Hãy bắt đầu từ ${first} để xây nền vững chắc nhé.`
        : `Bạn đúng ${r.correct}/${r.n} câu. Các unit từ ${first} đến ${r.placed} đã được mở để bạn học tự do.`)
        + (lv !== r.placed ? ` Bạn vẫn giữ mức xếp lớp cao nhất trước đó: ${lv}.` : "");
      actions = `
        <button type="button" class="btn btn-outline" data-ex="retake">${I.refresh} Làm lại bài kiểm tra</button>
        <a href="#learn" class="btn btn-primary">Học ${lv} ngay ${I.right}</a>`;
    } else if (r.passed) {
      headline = def.kind === "placement" ? "Chúc mừng, bạn đã xếp lớp thành công!" : "Chúc mừng, bạn đã vượt qua!";
      text = r.newly.length
        ? `Đã mở khóa cấp độ ${r.newly.join(", ")}. ${def.kind === "gate" && r.firstPass ? "+100 điểm. " : ""}Tiếp tục hành trình nhé!`
        : "Bạn đã đạt ngưỡng của bài kiểm tra này.";
      actions = `
        <a href="#review" class="btn btn-outline">Ôn tập các từ sai</a>
        <a href="#learn" class="btn btn-primary">${def.unlocks ? `Học ${def.unlocks} ngay` : "Về Học từ mới"} ${I.right}</a>`;
    } else {
      headline = "Chưa đạt lần này, cố thêm chút nữa!";
      text = def.kind === "placement"
        ? `Bạn cần đúng ít nhất ${passNeed()}/${r.n} câu. Vocabbit sẽ mở lộ trình từ ${def.levels[0]} cho bạn, bạn có thể làm lại bài xếp lớp bất cứ lúc nào.`
        : `Bạn cần đúng ít nhất ${passNeed()}/${r.n} câu (${api().config.GATE_PASS * 100}%). Ôn lại các từ sai ở Trung tâm ôn tập rồi thử lại nhé.`;
      actions = `
        <a href="#${def.kind === "placement" ? "learn" : "review"}" class="btn btn-outline">${def.kind === "placement" ? `Học từ ${def.levels[0]}` : "Đến Trung tâm ôn tập"}</a>
        <button type="button" class="btn btn-primary" data-ex="retake">${I.refresh} Làm lại bài kiểm tra</button>`;
    }

    const bars = (list) => list.map((x) => `
      <div class="rr-type">
        <div class="rr-type-top"><span>${esc(x.label)}</span><b>${pct(x.ok, x.total)}%</b></div>
        <div class="bar ${pct(x.ok, x.total) >= 90 ? "green" : ""}"><span style="width:${pct(x.ok, x.total)}%"></span></div>
        <small>${x.ok}/${x.total} câu đúng</small>
      </div>`).join("");

    $("examRoot").innerHTML = `
      <div class="ex-head">
        <div>
          <h1 class="page-title">Kết quả: ${esc(def.title)}</h1>
        </div>
      </div>

      <section class="st-card ex-summary ${r.passed || def.kind === "placement" ? "pass" : "fail"}">
        <div class="result-ring ex-ring ${r.passed || def.kind === "placement" ? "" : "low"}" style="--p:${p}"><b>${p}%<small>câu đúng</small></b></div>
        <div class="ex-sum-text">
          ${def.kind === "placement"
            ? `<span class="ex-sum-chip ok">${I.check} Xếp lớp: ${r.placed}</span>`
            : `<span class="ex-sum-chip ${r.passed ? "ok" : "bad"}">${r.passed ? `${I.check} Đạt` : `${I.x} Chưa đạt`} · cần ${passNeed()}/${r.n}</span>`}
          <h2>${headline}</h2>
          <p>${text}</p>
          ${r.newly.length ? `<p class="unlock-msg">🔓 Đã mở khóa cấp độ ${r.newly.join(", ")}!</p>` : ""}
        </div>
        <div class="ex-sum-stats">
          <div><b>${r.correct}/${r.n}</b><span>Câu đúng</span></div>
          <div><b>${wrong.length}</b><span>Câu sai</span></div>
          <div><b>${minutes} phút</b><span>Thời gian</span></div>
        </div>
      </section>

      <div class="ex-result-grid">
        <section class="st-card">
          <h3 class="ex-sec-title">${wrong.length ? `Xem lại ${wrong.length} câu sai` : "Bạn trả lời đúng tất cả 🎉"}</h3>
          <div class="ex-wrong-list">
            ${wrong.map((x) => `
              <div class="ex-wrong">
                <span class="ex-wrong-no">${x.k + 1}</span>
                <div>
                  <p class="ex-wrong-q"><b>${esc(x.q.w.en)}</b> · ${esc(x.q.w.vi)} <span class="tag tag-soft">${esc(x.q.level)} · ${api().qTypeLabel[x.q.type]}</span></p>
                  <p class="ex-wrong-a"><span class="bad">${x.given ? `Bạn trả lời: ${esc(x.given)}` : "Bạn chưa trả lời"}</span>
                  <span class="ok">Đáp án: ${esc(x.q.answer)}</span></p>
                </div>
              </div>`).join("")}
          </div>
        </section>
        <aside class="st-aside">
          <div class="st-card"><h3 class="ex-sec-title">Theo cấp độ</h3>${bars(byLevel)}</div>
          <div class="st-card"><h3 class="ex-sec-title">Theo dạng câu hỏi</h3>${bars(byType)}</div>
        </aside>
      </div>

      <div class="ex-result-foot">${actions}</div>`;
  }

  // ---------------------------------------------------------------
  // Sự kiện (gắn một lần)
  // ---------------------------------------------------------------
  function bindOnce() {
    if (bound) return;
    bound = true;

    document.addEventListener("click", (e) => {
      const el = e.target.closest(".exam [data-ex]");
      if (!el || el.disabled || !exam) return;
      const act = el.dataset.ex;
      if (act === "pick") pick(el.dataset.val);
      else if (act === "submit") submit(false);
      else if (act === "goto") { exam.cur = Number(el.dataset.i); persist(); draw(); }
      else if (act === "exit") { persist(); window.location.hash = "#learn"; }
      else if (act === "retake") {
        result = null;
        def = api().testDef(def.id);
        if (!def.available) return message("Bài kiểm tra đang khóa", def.reason);
        exam = createExam();
        persist();
        draw();
        window.scrollTo({ top: 0 });
      }
    });

    // gõ đáp án: lưu nháp + bật nút Nộp
    document.addEventListener("input", (e) => {
      if (e.target.id !== "exInput" || !exam || result) return;
      exam.answers[exam.cur].given = e.target.value;
      const btn = $("exSubmit");
      if (btn) btn.disabled = !e.target.value.trim();
      const st = document.querySelector(".ex-status");
      if (st) st.innerHTML = `${I.info} ${e.target.value.trim() ? "Đã nhập · Chưa nộp câu trả lời" : "Chưa nhập câu trả lời"}`;
    });
    document.addEventListener("change", (e) => { if (e.target.id === "exInput" && exam) persist(); });

    // Phím tắt: 1-4 chọn đáp án, Enter nộp
    document.addEventListener("keydown", (e) => {
      if (!onPage() || !exam || result) return;
      const q = exam.questions[exam.cur];
      const a = exam.answers[exam.cur];
      if (a.submitted) return;
      if (e.key === "Enter") { e.preventDefault(); submit(false); }
      else if (q.options && ["1", "2", "3", "4"].includes(e.key) && e.target.id !== "exInput") pick(q.options[Number(e.key) - 1]);
    });
  }

  return { render, mount };
})();