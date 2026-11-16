// ===== pronounce.js – Luyện phát âm =====
//
// index.html#pronounce                                  -> chọn cấp độ -> section -> Đọc từ / Đọc cả câu
// index.html#pronounce-session/<mã section>/word        -> đọc 10 từ đã học
// index.html#pronounce-session/<mã section>/sentence    -> đọc 10 câu ví dụ của từ đã học
// index.html#pronounce-session/<mã section>/retry       -> luyện lại các mục dưới 70% của lượt vừa xong
//
// LUẬT
// - Cấp độ khóa / mở giống Học từ mới và Ôn tập.
// - Chỉ luyện từ đã học = từ thuộc các unit ĐÃ HOÀN THÀNH (giống Ôn tập).
// - Section mở khi hoàn thành ít nhất CONFIG.MIN_LESSONS unit.
// - Mỗi lượt ưu tiên mục chưa luyện / điểm thấp, rồi tới mục ngẫu nhiên.
// - Nút micro giữ tối đa 60 giây. Không nói gì -> nút trở về như cũ, nhắc bấm lại.
// - Từ tục tĩu / không phù hợp bị bỏ qua: không hiện ra, không gửi đi, không tính điểm;
//   máy tiếp tục nghe và chỉ chấm phần còn lại (xem mục 1 – LỌC TỪ CẤM).
//
// Nhận dạng giọng nói: Web Speech API (Chrome / Edge, cần internet + quyền micro).
// Điểm & tiến độ lưu chung với lesson.js qua LessonPage.api (localStorage);
// khi tắt DEMO_MODE, mỗi lần đọc còn được gửi lên backend: POST /pronunciation/attempts.

const PronouncePage = (() => {
  const api = () => LessonPage.api;

  const CONFIG = {
    SESSION_SIZE: 10,          // số mục mỗi lượt
    MIN_LESSONS: 1,            // số unit phải hoàn thành để mở section
    LISTEN_LIMIT: 60,          // giây: nút ghi âm giữ tối đa
    SILENCE_AFTER_SPEECH: 1500,// ms: đọc câu xong, im lặng chừng này thì chấm
    GOOD: 80,                  // >= 80%: tốt (được cộng điểm)
    PASS: 70,                  // < 70%: đưa vào danh sách luyện lại
    POINTS_PER_GOOD: 2,
    API_ATTEMPTS: "http://127.0.0.1:8000/pronunciation/attempts"
  };

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const MODES = {
    word: { label: "Đọc từ", q: "Đọc to từ sau" },
    sentence: { label: "Đọc cả câu", q: "Đọc to cả câu sau" }
  };
  const POS = { noun: "Danh từ", verb: "Động từ", adj: "Tính từ", adv: "Trạng từ", phrase: "Cụm từ" };

  let activeLevel = null;
  let session = null;
  let recorder = null;
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
  const level = (score) => (score >= CONFIG.GOOD ? "ok" : score >= 50 ? "mid" : "bad");

  const I = {
    lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
    right: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>`,
    sound: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>`,
    slow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5"/></svg>`,
    mic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4"/></svg>`,
    word: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V5h16v2M9 19h6M12 5v14"/></svg>`,
    chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>`,
    sparkle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/></svg>`,
    gauge: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 14l4-4"/><path d="M3.3 19a10 10 0 1 1 17.4 0"/></svg>`
  };

  function setCrumb(text) {
    const el = document.querySelector(".topbar-title");
    if (el) el.textContent = text;
  }

  // ===============================================================
  // 1) LỌC TỪ CẤM
  // ===============================================================
  // Danh sách viết KHÔNG DẤU, chữ thường. Thêm / bớt từ ở đây.
  // Nhớ sửa giống hệt danh sách trong backend/services/content_filter.py.
  const BANNED_WORDS = new Set([
    // tiếng Anh
    "fuck", "fucks", "fucked", "fucker", "fuckers", "fucking", "fuckin", "motherfucker", "motherfucking",
    "shit", "shits", "shitty", "bullshit", "bitch", "bitches", "bitchy", "bastard", "bastards",
    "ass", "asses", "asshole", "assholes", "jackass", "dumbass", "dick", "dicks", "dickhead",
    "cock", "cocks", "pussy", "pussies", "cunt", "cunts", "whore", "whores", "slut", "sluts",
    "piss", "pissed", "wanker", "twat", "prick", "bollocks", "crap", "damn", "goddamn",
    "nigger", "niggers", "nigga", "niggas", "faggot", "faggots", "fag", "fags", "retard", "retarded",
    "porn", "sex", "sexy", "nude", "boobs", "tits",
    // tiếng Việt (không dấu, viết tắt)
    "dit", "dkm", "dmm", "dcm", "dm", "dcmm", "vcl", "vkl", "vl", "clgt", "cc", "cl", "lon", "buoi", "cac", "deo", "du"
  ]);
  // Từ bắt đầu bằng các gốc này cũng bị chặn (vd: fuuuck, shitload, motherfuckers)
  const BANNED_STEMS = ["fuck", "fuk", "fuuu", "motherf", "shit", "bitch", "cunt", "nigg", "fagg", "whor", "slut", "dickhead"];

  // Bỏ dấu tiếng Việt để so khớp: "địt" -> "dit"
  function plain(token) {
    return String(token || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9*']/g, "");
  }

  function isBanned(token, allowed) {
    const t = plain(token);
    if (!t) return false;
    if (t.includes("*")) return true;          // Chrome tự che từ tục thành "f***"
    const bare = t.replace(/'/g, "");
    if (allowed.has(bare)) return false;       // từ có trong từ / câu mẫu thì không chặn
    return BANNED_WORDS.has(bare) || BANNED_STEMS.some((p) => bare.startsWith(p));
  }

  // Các từ có trong từ / câu mẫu (để không chặn nhầm, vd bài học có từ "crap")
  function allowedSet(target) {
    return new Set(String(target || "").split(/[\s-]+/).map((w) => plain(w).replace(/'/g, "")).filter(Boolean));
  }

  // Xoá từ cấm khỏi câu nghe được. Trả về câu sạch + số từ đã bỏ qua.
  function cleanSpeech(text, allowed) {
    let removed = 0;
    const kept = String(text || "").split(/\s+/).filter((tok) => {
      if (!tok) return false;
      if (isBanned(tok, allowed)) { removed++; return false; }
      return true;
    });
    return { text: kept.join(" "), removed };
  }

  // ===============================================================
  // 2) CHẤM ĐIỂM
  // ===============================================================
  function normalize(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[’‘]/g, "'")
      .replace(/[^a-z0-9' ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Bảng khoảng cách chỉnh sửa (Levenshtein) – dùng cho chuỗi ký tự lẫn mảng từ
  function editTable(a, b) {
    const dp = [];
    for (let i = 0; i <= a.length; i++) {
      dp[i] = [i];
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = i === 0 ? j : Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
    }
    return dp;
  }

  function similarity(a, b) {
    if (!a.length && !b.length) return 1;
    return 1 - editTable(a, b)[a.length][b.length] / Math.max(a.length, b.length);
  }

  // Phần chính của điểm là "nói đúng chữ"; độ tự tin của máy chỉ chiếm 25%
  function finalScore(textScore, confidence) {
    const c = confidence > 0 ? confidence : 0.8; // Chrome đôi khi trả confidence = 0
    return Math.max(0, Math.min(100, Math.round(100 * textScore * (0.75 + 0.25 * c))));
  }

  // TỪ ĐƠN: so với tối đa 5 phương án máy đoán, lấy phương án giống nhất
  function scoreWord(target, alternatives, confidence) {
    const t = normalize(target);
    let best = 0;
    let heard = alternatives[0] || "";
    alternatives.forEach((alt, idx) => {
      const a = normalize(alt);
      const weight = idx === 0 ? 1 : 0.9; // phương án phụ bị trừ nhẹ
      [a, ...a.split(" ")].forEach((cand) => { // nghe ra "an apple" vẫn tính là "apple"
        const s = similarity(t, cand) * weight;
        if (s > best) { best = s; heard = alt; }
      });
    });
    return { score: finalScore(best, confidence), heard, words: null };
  }

  // CẢ CÂU: căn hàng từng từ của câu mẫu với câu nghe được
  function scoreSentence(target, transcript, confidence) {
    const pairs = String(target).split(/[\s-]+/).map((raw) => ({ raw, norm: normalize(raw) })).filter((p) => p.norm);
    const T = pairs.map((p) => p.norm);
    const S = normalize(transcript).split(" ").filter(Boolean);
    if (!T.length) return { score: 0, heard: transcript, words: [] };

    const dp = editTable(T, S);
    const status = new Array(T.length).fill("missing");
    let i = T.length, j = S.length;
    while (i > 0 && j > 0) {
      const same = T[i - 1] === S[j - 1];
      if (dp[i][j] === dp[i - 1][j - 1] + (same ? 0 : 1)) {
        status[i - 1] = same ? "ok" : similarity(T[i - 1], S[j - 1]) >= 0.6 ? "close" : "wrong";
        i--; j--;
      } else if (dp[i][j] === dp[i - 1][j] + 1) {
        status[i - 1] = "missing"; // bỏ sót từ này
        i--;
      } else {
        j--;                       // nói thừa từ
      }
    }
    const points = status.reduce((p, s) => p + (s === "ok" ? 1 : s === "close" ? 0.5 : 0), 0);
    return {
      score: finalScore(points / T.length, confidence),
      heard: transcript,
      words: pairs.map((p, k) => ({ text: p.raw, status: status[k] }))
    };
  }

  // ===============================================================
  // 3) BỘ GHI ÂM – giữ tối đa 60 giây (đã lọc từ cấm)
  // ===============================================================
  function createRecorder(h) {
    let rec = null, active = false, stopping = false, mode = "word";
    let finals = [], confs = [], firstAlts = null, allowed = new Set(), blocked = 0;
    let deadline = 0, tickTimer = null, silenceTimer = null;

    function build() {
      rec = new SR();
      rec.lang = "en-US";
      rec.continuous = true;      // nghe liên tục, không tự tắt sau câu đầu
      rec.interimResults = true;  // hiện chữ ngay khi đang nói
      rec.maxAlternatives = 5;

      rec.onresult = (e) => {
        if (!active) return;
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) {
            // lọc từ cấm ở mọi phương án máy đoán
            const alts = Array.from(r, (a) => cleanSpeech(a.transcript, allowed));
            blocked += alts[0].removed;
            if (alts[0].removed) h.onBlocked();
            if (!alts[0].text) continue;          // cả đoạn chỉ toàn từ cấm -> bỏ qua, nghe tiếp
            finals.push(alts[0].text);
            confs.push(r[0].confidence);
            if (!firstAlts) firstAlts = alts.map((a) => a.text).filter(Boolean);
          } else {
            interim += " " + cleanSpeech(r[0].transcript, allowed).text;
          }
        }
        h.onInterim((finals.join(" ") + " " + interim).replace(/\s+/g, " ").trim());

        if (mode === "word" && finals.length) return finish(); // từ đơn: nghe xong là chấm
        clearTimeout(silenceTimer);
        if (finals.length && !interim) silenceTimer = setTimeout(finish, CONFIG.SILENCE_AFTER_SPEECH);
      };

      rec.onerror = (e) => {
        if (e.error === "no-speech" || e.error === "aborted") return; // để onend xử lý
        const msg = {
          "not-allowed": "Bạn chưa cho phép dùng micro. Bấm biểu tượng ổ khóa trên thanh địa chỉ để cấp quyền.",
          "service-not-allowed": "Trình duyệt chặn nhận dạng giọng nói. Hãy dùng Chrome hoặc Edge.",
          "audio-capture": "Không tìm thấy micro trên máy.",
          "network": "Mất kết nối mạng – nhận dạng giọng nói cần internet."
        }[e.error] || "Lỗi nhận dạng giọng nói: " + e.error;
        stopAll();
        h.onError(msg);
      };

      rec.onend = () => {
        if (!active) return;
        if (finals.length) return finish();
        if (stopping || Date.now() >= deadline) return timeout();
        // Chrome tự ngắt khi im lặng vài giây -> bật lại để giữ đủ 60 giây
        try { rec.start(); } catch (err) { timeout(); }
      };
    }

    function tick() {
      const left = Math.max(0, deadline - Date.now()) / 1000;
      h.onTick(left);
      if (left <= 0) finals.length ? finish() : timeout();
    }

    function stopAll() {
      active = false;
      clearInterval(tickTimer);
      clearTimeout(silenceTimer);
      if (rec) {
        rec.onresult = rec.onerror = rec.onend = null;
        try { rec.abort(); } catch (err) { /* bỏ qua */ }
      }
    }

    function finish() {
      if (!active) return;
      const result = {
        transcript: finals.join(" ").trim(),
        alternatives: firstAlts || [finals.join(" ")],
        confidence: confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : 0,
        blocked
      };
      stopAll();
      h.onDone(result);
    }

    function timeout() {
      if (!active) return;
      stopAll();
      h.onTimeout(blocked);
    }

    return {
      get active() { return active; },
      start(m, target) {
        if (active) return;
        mode = m; finals = []; confs = []; firstAlts = null; stopping = false;
        allowed = allowedSet(target); blocked = 0;
        active = true;
        deadline = Date.now() + CONFIG.LISTEN_LIMIT * 1000;
        if ("speechSynthesis" in window) window.speechSynthesis.cancel(); // tắt giọng mẫu để micro không thu lại
        build();
        try { rec.start(); } catch (err) { stopAll(); h.onError("Không bật được micro, hãy thử lại."); return; }
        h.onStart();
        tick();
        tickTimer = setInterval(tick, 200);
      },
      stop() { if (active) { stopping = true; rec.stop(); } }, // bấm micro lần nữa = đã đọc xong
      cancel() { stopAll(); }
    };
  }

  function stopRecorder() {
    if (recorder) recorder.cancel();
    recorder = null;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  // Giọng đọc mẫu (Text-to-Speech có sẵn trong trình duyệt)
  function speak(text, rate = 0.85) {
    if (!("speechSynthesis" in window)) return api().toast("Trình duyệt chưa hỗ trợ phát âm.");
    if (recorder?.active) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = rate;
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang === "en-US");
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  }

  // ===============================================================
  // 4) DỮ LIỆU SECTION
  // ===============================================================
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
    const seen = new Set();
    const words = [];
    doneLessons.forEach((lesson) => lesson.words.forEach((w) => {
      const k = normalize(w.en);
      if (!k || seen.has(k)) return;
      seen.add(k);
      words.push({ w, lesson });
    }));
    const sentences = words.filter((x) => x.w.ex && x.w.ex.trim());
    const open = levelOpen && doneLessons.length >= CONFIG.MIN_LESSONS && words.length > 0;
    return { levelOpen, doneLessons, words, sentences, open, stats: api().getPronounce(t.id) };
  }

  function makeItem({ w, lesson }, mode) {
    return { w, lesson, mode, text: mode === "sentence" ? w.ex : w.en, key: `${mode}:${normalize(w.en)}`, score: null, heard: "", tries: 0, rewarded: false };
  }

  // Ưu tiên mục chưa luyện, rồi mục điểm thấp; cùng mức thì ngẫu nhiên
  function pickItems(list, mode) {
    const rank = (x) => api().getPronounceItem(`${mode}:${normalize(x.w.en)}`)?.best ?? -1;
    return shuffle(list)
      .sort((a, b) => rank(a) - rank(b))
      .slice(0, CONFIG.SESSION_SIZE)
      .map((x) => makeItem(x, mode));
  }

  // ===============================================================
  // MÀN 1 – CHỌN SECTION (#pronounce)
  // ===============================================================
  function render() {
    return `
      <div class="learn study review pronounce" id="prRoot">
        ${SR ? "" : unsupportedNote()}
        <p class="section-label">Chọn cấp độ</p>
        <div class="level-tabs" id="prTabs"></div>
        <div id="prTopics" class="rv-topics"><p class="st-loading">Đang tải…</p></div>
      </div>`;
  }

  function unsupportedNote() {
    return `
      <div class="locked-panel pr-unsupported">
        <span class="locked-icon">${I.mic}</span>
        <div><b>Trình duyệt chưa hỗ trợ nhận dạng giọng nói</b><p>Hãy mở Vocabbit bằng Google Chrome hoặc Microsoft Edge để luyện phát âm.</p></div>
      </div>`;
  }

  async function mount() {
    stopRecorder();
    await api().ready();
    bindOnce();
    if (!$("prRoot")) return;
    if (!activeLevel || !api().levels().some((l) => l.code === activeLevel)) activeLevel = api().pickActiveLevel();
    drawCenter();
  }

  function drawCenter() {
    const levels = api().levels();
    $("prTabs").innerHTML = levels.map((lv) => {
      const open = api().isLevelOpen(lv.code);
      return `
        <button type="button" class="level-tab ${lv.code === activeLevel ? "active" : ""} ${open ? "" : "locked"}" data-pr="tab" data-level="${lv.code}">
          <b>${lv.code}</b><span>${open ? "" : I.lock}${lv.topics.length} section</span>
        </button>`;
    }).join("");

    const lv = levels.find((l) => l.code === activeLevel);
    const lockNote = api().isLevelOpen(lv.code) ? "" : `
      <div class="locked-panel">
        <span class="locked-icon">${I.lock}</span>
        <div><b>Cấp độ ${lv.code} đang khóa</b><p>${api().lockReason(lv.code)}</p></div>
        <a href="#learn" class="btn btn-sm btn-outline">Đến Học từ mới</a>
      </div>`;
    $("prTopics").innerHTML = lockNote + lv.topics.map((t, ti) => topicCard(lv, t, ti)).join("");
  }

  function lastText(r) {
    return r ? `<span class="rv-last">Cao nhất: ${r.best}% · Gần nhất: ${r.last}%</span>` : "";
  }

  function topicCard(lv, t, ti) {
    const info = topicInfo(lv, t);
    const st = info.stats;
    const badge = info.open
      ? `<span class="rv-badge open">${I.check} ${info.words.length} từ đã học</span>`
      : `<span class="rv-badge">${I.lock} Chưa mở khóa</span>`;

    let body;
    if (!info.levelOpen) {
      body = `<div class="rv-locked"><span class="rv-lock-ic">${I.lock}</span><div><b>Cấp độ ${lv.code} chưa mở</b><p>Hoàn thành cấp độ trước để mở khóa.</p></div></div>`;
    } else if (!info.open) {
      const next = api().nextLessonInTopic(t.id);
      body = `
        <div class="rv-locked">
          <span class="rv-lock-ic">${I.lock}</span>
          <div><p>Hoàn thành ít nhất ${CONFIG.MIN_LESSONS} unit của section này để luyện phát âm các từ đã học.</p></div>
          ${next ? `<a href="#study/${next.id}" class="btn btn-outline">${I.right} ${next.no > 1 ? "Học unit tiếp theo" : "Bắt đầu Unit 1"}</a>`
                 : `<a href="#learn" class="btn btn-outline">${I.right} Đến Học từ mới</a>`}
        </div>`;
    } else {
      const nWord = Math.min(CONFIG.SESSION_SIZE, info.words.length);
      const nSent = Math.min(CONFIG.SESSION_SIZE, info.sentences.length);
      body = `
        <div class="rv-modes">
          <div class="rv-mode primary">
            <h4>${I.word} Đọc từ đơn</h4>
            <div class="rv-mode-foot">
              <span>${lastText(st.word)}</span>
              <a href="#pronounce-session/${t.id}/word" class="btn btn-primary">${I.mic} Bắt đầu</a>
            </div>
          </div>
          <div class="rv-mode ${nSent ? "" : "locked"}">
            <h4>${I.chat} Đọc cả câu</h4>
            <p>${nSent
              ? `Bắt đầu học`
              : "Đang cập nhật"}</p>
            <div class="rv-mode-foot">
              <span>${lastText(st.sentence)}</span>
              ${nSent
                ? `<a href="#pronounce-session/${t.id}/sentence" class="btn btn-outline">${I.mic} Luyện câu</a>`
                : `<button type="button" class="btn btn-ghost" disabled>${I.lock} Đã khóa</button>`}
            </div>
          </div>
        </div>`;
    }

    return `
      <article class="rv-topic ${info.open ? "" : "locked"}">
        <div class="rv-topic-head">
          <div class="rv-topic-info">
            <h3>Section ${ti + 1}: ${esc(t.name)} <span class="tag tag-soft">${esc(t.tag)}</span></h3>
          </div>
          ${badge}
        </div>
        ${body}
      </article>`;
  }

  // ===============================================================
  // MÀN 2 – LUYỆN (#pronounce-session/<section>/<word|sentence|retry>)
  // ===============================================================
  function sessionRender() {
    return `<div class="learn study review pronounce" id="prSession"><p class="st-loading">Đang chuẩn bị lượt luyện…</p></div>`;
  }

  async function sessionMount(param = "") {
    stopRecorder();
    await api().ready();
    bindOnce();
    if (!$("prSession")) return;
    if (!SR) return message("Trình duyệt chưa hỗ trợ", "Hãy mở Vocabbit bằng Google Chrome hoặc Microsoft Edge để luyện phát âm.");

    const [topicId, mode = "word"] = param.split("/");
    const found = findTopic(topicId);
    if (!found) return message("Không tìm thấy section", "Section này không tồn tại.");
    const info = topicInfo(found.lv, found.t);
    if (!info.open) return message("Section đang khóa", `Hoàn thành ít nhất ${CONFIG.MIN_LESSONS} unit của section ${esc(found.t.name)} ở Học từ mới để luyện phát âm.`);

    let items, baseMode;
    const isRetry = mode === "retry" && session && session.topic.id === topicId && session.retryItems?.length;
    if (isRetry) {
      baseMode = session.baseMode;
      items = session.retryItems.map((x) => makeItem(x, baseMode));
    } else if (mode === "sentence") {
      if (!info.sentences.length) return message("Chưa có câu để luyện", "Các từ đã học trong section này chưa có câu ví dụ.");
      baseMode = "sentence";
      items = pickItems(info.sentences, "sentence");
    } else {
      baseMode = "word";
      items = pickItems(info.words, "word");
    }

    session = {
      lv: found.lv, topic: found.t, mode: isRetry ? "retry" : baseMode, baseMode,
      items, i: 0, done: false, finished: false, startedAt: Date.now(), retryItems: null
    };
    drawItem();
  }

  function message(title, text) {
    $("prSession").innerHTML = `
      <div class="st-message">
        <h2>${title}</h2><p>${text}</p>
        <a href="#pronounce" class="btn btn-primary">Về Luyện phát âm</a>
      </div>`;
    setCrumb("Luyện phát âm");
  }

  function modeLabel(s) {
    const n = s.items.length;
    if (s.mode === "retry") return `Luyện lại • ${n} ${s.baseMode === "sentence" ? "câu" : "từ"}`;
    return s.mode === "sentence" ? `Đọc cả câu • ${n} câu` : `Đọc từ • ${n} từ`;
  }

  function drawItem() {
    const s = session;
    const it = s.items[s.i];
    const n = s.items.length;
    const prev = api().getPronounceItem(it.key);
    const w = it.w;
    s.done = false;
    setCrumb(`Luyện phát âm / ${MODES[it.mode].label}`);

    const target = it.mode === "sentence"
      ? `<div class="rs-sentence-box pr-target-box">
           <p class="rs-sentence" id="prTarget">${esc(it.text)}</p>
           ${w.exVi ? `<p class="rs-sentence-vi">${esc(w.exVi)}</p>` : ""}
           <p class="pr-keyword">Từ khóa: <b>${esc(w.en)}</b> – ${esc(w.vi)}</p>
         </div>`
      : `<div class="rs-word-box pr-target-box">
           ${w.pos ? `<p class="rs-pos">${POS[w.pos] || esc(w.pos)}</p>` : ""}
           <p class="rs-word" id="prTarget">${esc(w.en)}</p>
           ${w.ipa ? `<p class="rs-ipa">${esc(w.ipa)}</p>` : ""}
           <p class="pr-meaning">${esc(w.vi)}</p>
         </div>`;

    $("prSession").innerHTML = `
      <div class="rs-wrap">
        <div class="rs-progress-row">
          <span class="rs-mode">${I.mic} ${modeLabel(s)}</span>
          <button type="button" class="btn btn-outline btn-sm" data-pr="exit">${I.close} Thoát luyện tập</button>
        </div>
        <div class="bar rs-bar"><span style="width:${pct(s.i, n)}%"></span></div>

        <section class="st-card rs-card">
          <div class="pr-q-row">
            <h3 class="rs-q">${MODES[it.mode].q}</h3>
            <span class="st-muted">${s.i + 1}/${n}</span>
          </div>
          ${target}

          <div class="pr-listen-row">
            <button type="button" class="btn btn-outline btn-sm" data-pr="listen" data-rate="0.85">${I.sound} Nghe mẫu</button>
            <button type="button" class="btn btn-outline btn-sm" data-pr="listen" data-rate="0.55">${I.slow} Nghe chậm</button>
          </div>

          <div class="pr-mic-area">
            <button type="button" class="pr-mic" id="prMic" data-pr="mic" aria-label="Bấm để ghi âm">
              <span class="pr-mic-icon">${I.mic}</span>
              <span class="pr-mic-time" id="prTime"></span>
            </button>
            <p class="pr-hint" id="prHint">Bấm micro rồi đọc to. Bạn có ${CONFIG.LISTEN_LIMIT} giây.</p>
            <p class="pr-live" id="prLive"></p>
          </div>

          <div id="prResult"></div>
        </section>

        <div class="pr-foot">
          <span class="st-muted">${prev ? `Điểm cao nhất trước đây: <b>${prev.best}%</b>` : "Lần đầu luyện mục này"}</span>
          <button type="button" class="btn btn-outline" data-pr="next" id="prNext">Bỏ qua ${I.right}</button>
        </div>
      </div>`;

    recorder = createRecorder({
      onStart() {
        $("prMic")?.classList.add("on");
        setHint("Đang nghe… đọc xong có thể bấm micro lần nữa.");
        if ($("prResult")) $("prResult").innerHTML = "";
      },
      onTick(left) {
        if ($("prTime")) $("prTime").textContent = Math.ceil(left) + "s";
        $("prMic")?.style.setProperty("--p", left / CONFIG.LISTEN_LIMIT);
      },
      onInterim(text) { if ($("prLive")) $("prLive").textContent = text ? `“${text}”` : ""; },
      onBlocked() { setHint("Đã bỏ qua từ không phù hợp – hãy đọc đúng từ / câu mẫu nhé.", true); },
      onDone(res) { resetMic(); showResult(res); },
      onTimeout(blocked) {
        resetMic();
        setHint(blocked
          ? "Chỉ nghe thấy từ không phù hợp nên không chấm điểm. Hãy bấm micro và đọc lại từ / câu mẫu."
          : "Không nghe thấy bạn nói. Hãy bấm lại nút micro để thử lại.", true);
      },
      onError(msg) { resetMic(); setHint(msg, true); }
    });
  }

  function setHint(text, warn = false) {
    const el = $("prHint");
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("warn", warn);
  }

  function resetMic() {
    const mic = $("prMic");
    if (mic) { mic.classList.remove("on"); mic.style.removeProperty("--p"); }
    if ($("prTime")) $("prTime").textContent = "";
    if ($("prLive")) $("prLive").textContent = "";
  }

  function showResult(res) {
    const s = session;
    const it = s.items[s.i];
    const r = it.mode === "sentence"
      ? scoreSentence(it.text, res.transcript, res.confidence)
      : scoreWord(it.text, res.alternatives, res.confidence);

    it.tries++;
    it.score = Math.max(it.score ?? 0, r.score);
    it.heard = r.heard;
    s.done = true;

    // Lưu tiến độ + cộng điểm lần đầu đạt mức tốt trong lượt này
    api().savePronounceItem(it.key, r.score);
    if (r.score >= CONFIG.GOOD && !it.rewarded) {
      it.rewarded = true;
      api().addPoints(CONFIG.POINTS_PER_GOOD);
    }
    sendToServer(it, r);

    const lv = level(r.score);
    const verdict = { ok: "Tuyệt vời!", mid: "Khá tốt, thử lại cho chuẩn hơn nhé!", bad: "Chưa đúng lắm, nghe mẫu rồi thử lại nhé!" }[lv];
    $("prResult").innerHTML = `
      <div class="rs-feedback pr-feedback ${lv}">
        <div class="pr-score">${r.score}%</div>
        <div class="rs-fb-text">
          <b>${verdict}</b>
          <p>Máy nghe được: “${esc(r.heard || "…")}”</p>
          ${res.blocked ? `<p class="pr-blocked">Đã bỏ qua ${res.blocked} từ không phù hợp, không tính vào điểm.</p>` : ""}
          ${r.words ? `
            <div class="pr-legend">
              <span class="pr-w ok">đúng</span><span class="pr-w close">gần đúng</span>
              <span class="pr-w wrong">sai</span><span class="pr-w missing">bị thiếu</span>
            </div>` : ""}
        </div>
      </div>`;

    if (r.words) {
      $("prTarget").innerHTML = r.words.map((x) => `<span class="pr-w ${x.status}">${esc(x.text)}</span>`).join(" ");
    }
    setHint("Bấm micro để đọc lại, hoặc bấm Tiếp tục.");

    const next = $("prNext");
    next.className = "btn btn-primary";
    next.innerHTML = `${s.i + 1 < s.items.length ? "Tiếp tục" : "Xem kết quả"} ${I.right}`;
    next.focus();
  }

  // Gửi kết quả lên backend khi đã tắt DEMO_MODE (bản demo chỉ lưu trên trình duyệt)
  function sendToServer(it, r) {
    if (api().isDemo) return;
    fetch(CONFIG.API_ATTEMPTS, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...api().authHeader() },
      body: JSON.stringify({
        word: it.w.en,
        mode: it.mode,
        target_text: it.text,
        transcript: r.heard || "",
        score: r.score
      })
    }).catch(() => { /* lỗi mạng: điểm vẫn được lưu trên trình duyệt */ });
  }

  function next() {
    stopRecorder();
    const s = session;
    if (s.i + 1 < s.items.length) {
      s.i++;
      drawItem();
      window.scrollTo({ top: 0 });
    } else {
      finish();
    }
  }

  function finish() {
    const s = session;
    s.finished = true;
    s.endedAt = Date.now();
    const read = s.items.filter((x) => x.score !== null);
    s.score = read.length ? Math.round(read.reduce((a, x) => a + x.score, 0) / read.length) : 0;
    s.retryItems = s.items.filter((x) => (x.score ?? 0) < CONFIG.PASS).map(({ w, lesson }) => ({ w, lesson }));
    if (s.mode !== "retry" && read.length) api().savePronounceSession(s.topic.id, s.baseMode, s.score);
    drawResult();
    window.scrollTo({ top: 0 });
  }

  // ===============================================================
  // MÀN 3 – KẾT QUẢ
  // ===============================================================
  function drawResult() {
    const s = session;
    const n = s.items.length;
    const read = s.items.filter((x) => x.score !== null);
    const good = read.filter((x) => x.score >= CONFIG.GOOD).length;
    const minutes = Math.max(1, Math.round((s.endedAt - s.startedAt) / 60000));
    const unit = s.baseMode === "sentence" ? "câu" : "từ";
    setCrumb("Luyện phát âm / Kết quả");

    const msg = s.score >= 90 ? ["Phát âm rất chuẩn!", "Máy hiểu gần như mọi thứ bạn nói. Thử chế độ đọc cả câu để thử thách hơn nhé."]
      : s.score >= 70 ? ["Bạn nói khá rõ rồi!", "Luyện lại vài mục điểm thấp là bạn sẽ tự tin hơn nhiều."]
      : s.score >= 50 ? ["Bạn đang tiến bộ!", "Nghe chậm giọng mẫu, đọc theo từng âm rồi thử lại nhé."]
      : ["Cứ từ từ thôi!", "Hãy nghe mẫu nhiều lần, đọc chậm và rõ từng âm rồi luyện lại."];

    const rows = s.items.map((x) => {
      const lv = x.score === null ? "skip" : level(x.score);
      return `
        <div class="rr-word">
          <div>
            <b>${esc(x.mode === "sentence" ? x.text : x.w.en)}</b>
            <p>${x.score === null ? "Bỏ qua" : `Máy nghe: “${esc(x.heard || "…")}”`}</p>
          </div>
          <span class="pr-chip ${lv}">${x.score === null ? "–" : x.score + "%"}</span>
          <button type="button" class="rs-sound" data-pr="speak" data-text="${esc(x.text)}" aria-label="Nghe">${I.sound}</button>
        </div>`;
    }).join("");

    $("prSession").innerHTML = `
      <div class="rr-head">
        <div>
          <h1 class="page-title">Một lượt luyện nói, thêm một bước tự tin!</h1>
          <p class="page-sub">${modeLabel(s)} · ${esc(s.topic.name)}</p>
        </div>
        <a href="#pronounce" class="btn btn-outline btn-sm">Về Luyện phát âm</a>
      </div>

      <section class="st-card rr-summary">
        <div class="result-ring rr-ring ${s.score >= CONFIG.PASS ? "" : "low"}" style="--p:${s.score}">
          <b>${s.score}%<small>điểm trung bình</small></b>
        </div>
        <div class="rr-msg">
          <span class="rr-chip">${I.sparkle} Kết quả lượt luyện</span>
          <h2>${msg[0]}</h2>
          <p>${msg[1]}</p>
        </div>
        <div class="rr-stats">
          <div><b>${read.length}/${n}</b><span>${unit === "câu" ? "Câu" : "Từ"} đã đọc</span></div>
          <div><b>${good}</b><span>Đạt từ ${CONFIG.GOOD}%</span></div>
          <div><b>${s.retryItems.length}</b><span>Cần luyện lại</span></div>
          <div><b>${minutes} phút</b><span>Thời gian</span></div>
        </div>
      </section>

      <section class="st-card">
        <div class="rr-list-head">
          <h3>Chi tiết từng ${unit}</h3>
          ${s.retryItems.length ? `<span class="rv-badge warn">${s.retryItems.length} mục dưới ${CONFIG.PASS}%</span>` : ""}
        </div>
        <div class="rr-words pr-words">${rows}</div>
      </section>

      <div class="rr-foot">
        <p class="st-muted">Mục dưới ${CONFIG.PASS}% nên được luyện lại ngay khi còn nhớ giọng mẫu.</p>
        <div>
          <a href="#pronounce" class="btn btn-outline">Chọn section khác</a>
          ${s.retryItems.length
            ? `<button type="button" class="btn btn-primary" data-pr="retry">${I.refresh} Luyện lại ${s.retryItems.length} mục</button>`
            : `<button type="button" class="btn btn-primary" data-pr="again">${I.refresh} Luyện thêm lượt nữa</button>`}
        </div>
      </div>`;
  }

  // ===============================================================
  // SỰ KIỆN (gắn 1 lần)
  // ===============================================================
  function bindOnce() {
    if (bound) return;
    bound = true;

    document.addEventListener("click", (e) => {
      const el = e.target.closest(".pronounce [data-pr]");
      if (!el || el.disabled) return;
      const a = el.dataset.pr;

      if (a === "tab") {
        activeLevel = el.dataset.level;
        drawCenter();
        if (!api().isLevelOpen(activeLevel)) api().toast(api().lockReason(activeLevel));
      }
      else if (a === "listen") speak(session.items[session.i].text, Number(el.dataset.rate));
      else if (a === "speak") speak(el.dataset.text);
      else if (a === "mic") {
        if (!recorder) return;
        const cur = session.items[session.i];
        recorder.active ? recorder.stop() : recorder.start(cur.mode, cur.text);
      }
      else if (a === "next") next();
      else if (a === "exit") {
        if (session && !session.finished && session.i > 0 && !confirmExit()) return;
        stopRecorder();
        window.location.hash = "#pronounce";
      }
      else if (a === "retry") goSession(`${session.topic.id}/retry`);
      else if (a === "again") goSession(`${session.topic.id}/${session.baseMode}`);
    });

    // Enter: sang mục tiếp theo sau khi đã có kết quả
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || !$("prSession") || !session || session.finished || !session.done) return;
      if (e.target.tagName === "BUTTON" || e.target.tagName === "A") return;
      e.preventDefault();
      next();
    });

    // Rời trang luyện -> tắt micro và giọng đọc
    window.addEventListener("hashchange", () => {
      if (!window.location.hash.startsWith("#pronounce-session")) stopRecorder();
    });
  }

  // Hỏi lại trước khi bỏ dở lượt luyện (bấm "Thoát" 2 lần)
  let exitArmed = 0;
  function confirmExit() {
    if (Date.now() - exitArmed < 3000) return true;
    exitArmed = Date.now();
    api().toast("Bấm “Thoát luyện tập” lần nữa để thoát. Kết quả từng mục đã đọc vẫn được lưu.");
    return false;
  }

  // Mở lượt mới; nếu địa chỉ không đổi (hashchange không chạy) thì tự vẽ lại
  function goSession(param) {
    const target = `#pronounce-session/${param}`;
    if (window.location.hash === target) {
      $("prSession").innerHTML = `<p class="st-loading">Đang chuẩn bị lượt luyện…</p>`;
      sessionMount(param);
      window.scrollTo({ top: 0 });
    } else {
      window.location.hash = target;
    }
  }

  return { render, mount, sessionRender, sessionMount };
})();