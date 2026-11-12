// ===== profile.js – trang Hồ sơ (index.html#profile) =====
//
// Hiển thị:
//  - Thông tin tài khoản: tên, gmail, ngày đăng ký (auth.js lưu vào localStorage "vocabbit_user"
//    lúc đăng ký / đăng nhập; khi có backend thì lấy từ GET /api/me).
//  - Chuỗi ngày học: tính theo ngày thực trên máy người dùng, từ nhật ký học (lesson.js ghi lại
//    mỗi khi người dùng xem/lật/nối từ, làm bài kiểm tra, trả lời câu ôn tập).
//  - Tổng số từ đã học, số bài kiểm tra đã vượt qua, tuần học hiện tại, các dấu mốc.

const ProfilePage = (() => {
  const api = () => LessonPage.api;

  const KEYS = { user: "vocabbit_user", onboarding: "vocabbit_onboarding" };
  const ROUTES = { me: "/api/me" };   // GET: lấy hồ sơ · PUT: cập nhật tên, giới thiệu

  const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  let user = null;
  let bound = false;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  const I = {
    book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z"/><path d="M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z"/></svg>`,
    sparkle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>`,
    cal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>`,
    mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>`,
    pen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
    flame: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c4 0 7-3 7-7 0-5-5-8-6-13-2 3-3 5-3 8-1-1-2-2-2-4-2 2-3 5-3 9 0 4 3 7 7 7z"/></svg>`,
    sprout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20v-8"/><path d="M12 12C12 8 9 6 5 6c0 4 3 6 7 6zM12 12c0-3 2.5-5 6-5 0 3.5-2.5 5-6 5z"/><path d="M8 20h8"/></svg>`,
    flag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>`,
    trophy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3a3 3 0 0 1-3 4M7 5H4a3 3 0 0 0 3 4"/></svg>`,
    star: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>`,
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
    lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`
  };

  // ---------------------------------------------------------------
  // Dữ liệu tài khoản
  // ---------------------------------------------------------------
  async function loadUser() {
    let u = read(KEYS.user);
    if (!api().isDemo) {
      try {
        const res = await fetch(ROUTES.me, { headers: api().authHeader() });
        if (res.ok) {
          const d = await res.json();
          u = { fullName: d.full_name, email: d.email, gender: d.gender, createdAt: d.created_at, bio: d.bio || "" };
          write(KEYS.user, u);
        }
      } catch (e) { /* dùng bản lưu trên máy */ }
    }
    return u;
  }

  function initials(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "V";
    const pick = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0];
    return pick.toUpperCase();
  }

  function joinText(iso) {
    if (!iso) return "Chưa có ngày đăng ký";
    const d = new Date(iso);
    if (isNaN(d)) return "Chưa có ngày đăng ký";
    return `Tham gia ngày ${d.getDate()} tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
  }

  function daysSince(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d)) return null;
    const a = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const now = new Date();
    const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((b - a) / 86400000) + 1;
  }

  // ---------------------------------------------------------------
  // Router gọi
  // ---------------------------------------------------------------
  function render() {
    return `<div class="learn profile" id="profileRoot"><p class="st-loading">Đang tải hồ sơ…</p></div>`;
  }

  async function mount() {
    await api().ready();
    bindOnce();
    user = await loadUser();
    draw();
  }

  function draw() {
    if (!$("profileRoot")) return;
    const st = api().stats();
    const onb = read(KEYS.onboarding) || {};
    const target = Number(onb.daysPerWeek) || 5;
    const name = user?.fullName || "Bạn";
    const email = user?.email || "";
    const handle = email ? "@" + email.split("@")[0] : "@vocabbit";
    const since = daysSince(user?.createdAt);

    $("profileRoot").innerHTML = `
      <div class="pf-grid">
        <div class="pf-main">
          ${profileCard(name, email, handle, since)}

          <h2 class="pf-section">Thống kê học tập</h2>
          ${statCards(st)}

          ${weekCard(st, target)}
        </div>

        <aside class="pf-aside">
          <div class="pf-card">
            <h3>Dấu mốc của bạn</h3>
            ${milestones(st)}
          </div>
        </aside>
      </div>

      ${editModal()}`;
  }

  function profileCard(name, email, handle, since) {
    return `
      <section class="pf-card pf-profile">
        <div class="pf-banner"></div>
        <div class="pf-body">
          <div class="pf-avatar">${esc(initials(name))}</div>
          <div class="pf-info">
            <h2>${esc(name)}</h2>
            <p class="pf-handle">${esc(handle)}</p>
            <p class="pf-meta">${I.cal} ${joinText(user?.createdAt)}${since ? ` · đã đồng hành ${since} ngày` : ""}</p>
            <p class="pf-meta">${I.mail} ${email ? esc(email) : "Chưa có gmail"}</p>
          </div>
          <button type="button" class="btn btn-outline pf-edit" data-pf="edit" ${user ? "" : "disabled"}>${I.pen} Chỉnh sửa hồ sơ</button>
        </div>
      </section>`;
  }

  function statCards(st) {
    const s = st.streak;
    // tính cả bài kiểm tra cuối mỗi bài học + bài kiểm tra tổng (và bài xếp lớp)
    const bigPassed = st.gatesPassed.length + (st.placementPassed ? 1 : 0);
    const testsTotal = st.lessonQuizzesPassed + bigPassed;
    return `
      <div class="pf-stats">
        <div class="pf-card pf-stat">
          <div class="pf-stat-top"><b>Streak</b></div>
          <p class="pf-num">${s.current}<small>ngày</small></p>
          <p class="pf-stat-title">Chuỗi ngày học</p>
        </div>
        <div class="pf-card pf-stat">
          <div class="pf-stat-top"><b>Vocabulary</b></div>
          <p class="pf-num">${st.wordsLearned}<small>từ</small></p>
          <p class="pf-stat-title">Từ vựng đã học</p>
        </div>
        <div class="pf-card pf-stat">
          <div class="pf-stat-top"><b>Bài kiểm tra</b></div>
          <p class="pf-num">${testsTotal}<small>bài</small></p>
          <p class="pf-stat-title">Bài kiểm tra đã vượt qua</p>
        </div>
      </div>`;
  }

  function weekCard(st, target) {
    const today = new Date();
    const todayKey = api().dayKey(today);

    // 7 ngày gần nhất, ô cuối là hôm nay (thấy rõ chuỗi đang giữ)
    const days = [6, 5, 4, 3, 2, 1, 0].map((back) => {
      const d = addDays(today, -back);
      const k = api().dayKey(d);
      const done = !!st.activity[k];
      const isToday = k === todayKey;
      let cls, ic = "";
      if (isToday && done) { cls = "today done"; ic = I.flame; }
      else if (isToday) { cls = "today"; ic = I.flame; }
      else if (done) { cls = "done"; ic = I.check; }
      else cls = "miss";
      const label = isToday ? "Hôm nay" : WEEKDAYS[(d.getDay() + 6) % 7];
      return `<div class="pf-day ${cls}" title="${d.getDate()}/${d.getMonth() + 1}"><span>${label}</span><i>${ic}</i></div>`;
    }).join("");

    // mục tiêu tuần: tính theo tuần từ thứ Hai đến Chủ nhật
    const monday = addDays(today, -((today.getDay() + 6) % 7));
    let doneCount = 0;
    for (let i = 0; i < 7; i++) if (st.activity[api().dayKey(addDays(monday, i))]) doneCount++;

    const first = addDays(today, -6);
    const range = first.getMonth() === today.getMonth()
      ? `${String(first.getDate()).padStart(2, "0")} – ${String(today.getDate()).padStart(2, "0")} tháng ${today.getMonth() + 1}`
      : `${first.getDate()}/${first.getMonth() + 1} – ${today.getDate()}/${today.getMonth() + 1}`;

    return `
      <section class="pf-card pf-week">
        <div class="pf-week-head">
          <h3>Một tuần học đều đặn</h3>
          <span>${range}</span>
        </div>
        <div class="pf-days">${days}</div>
        <div class="pf-week-foot">
          <span class="pf-target ${doneCount >= target ? "ok" : ""}">Tuần này: ${doneCount}/${target} ngày mục tiêu</span>
        </div>
      </section>`;
  }

  function milestones(st) {
    const list = [
      { ic: I.flag,   title: "Bước chân đầu tiên", done: st.lessonsDone >= 1, cur: st.lessonsDone, need: 1, unit: "unit hoàn thành" },
      { ic: I.sprout, title: "Những từ đầu tiên",  done: st.wordsLearned >= 10, cur: st.wordsLearned, need: 10, unit: "từ vựng" },
      { ic: I.flame,  title: "Bền bỉ mỗi ngày",    done: st.streak.best >= 7, cur: st.streak.best, need: 7, unit: "ngày liên tiếp" },
      { ic: I.star,   title: "Trăm từ vững vàng",  done: st.wordsLearned >= 100, cur: st.wordsLearned, need: 100, unit: "từ vựng" },
      { ic: I.trophy, title: "Vượt ải cấp độ",     done: st.gatesPassed.length + (st.placementPassed ? 1 : 0) >= 1, cur: st.gatesPassed.length + (st.placementPassed ? 1 : 0), need: 1, unit: "bài kiểm tra tổng" }
    ];
    return `<div class="pf-miles">${list.map((m) => `
      <div class="pf-mile ${m.done ? "done" : ""}">
        <span class="pf-ic">${m.done ? m.ic : I.lock}</span>
        <div>
          <b>${m.title}</b>
          <p>${m.done ? `Đã đạt · ${m.cur} ${m.unit}` : `${Math.min(m.cur, m.need)}/${m.need} ${m.unit}`}</p>
        </div>
      </div>`).join("")}</div>`;
  }

  // ---------------------------------------------------------------
  // Chỉnh sửa hồ sơ (tên, giới thiệu – gmail và ngày tham gia không đổi)
  // ---------------------------------------------------------------
  function editModal() {
    return `
      <div class="pf-modal" id="pfModal" hidden>
        <form class="pf-modal-box" id="pfForm">
          <div class="pf-modal-head">
            <h3>Chỉnh sửa hồ sơ</h3>
            <button type="button" class="lp-icon-btn" data-pf="close" aria-label="Đóng">${I.close}</button>
          </div>
          <label>Tên hiển thị
            <input name="fullName" maxlength="40" value="${esc(user?.fullName || "")}" required>
          </label>
          <label>Giới thiệu ngắn
            <textarea name="bio" maxlength="120" rows="3" placeholder="Học tiếng Anh, tự tin hơn mỗi ngày.">${esc(user?.bio || "")}</textarea>
          </label>
          <label>Gmail
            <input value="${esc(user?.email || "")}" disabled>
          </label>
          <p class="pf-err" id="pfErr"></p>
          <div class="pf-modal-actions">
            <button type="button" class="btn btn-outline" data-pf="close">Hủy</button>
            <button type="submit" class="btn btn-primary">Lưu thay đổi</button>
          </div>
        </form>
      </div>`;
  }

  async function saveEdit(form) {
    const fullName = form.elements.fullName.value.trim();
    const bio = form.elements.bio.value.trim();
    if (!fullName) { $("pfErr").textContent = "Vui lòng nhập tên của bạn"; return; }
    if (!api().isDemo) {
      try {
        const res = await fetch(ROUTES.me, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...api().authHeader() },
          body: JSON.stringify({ full_name: fullName, bio })
        });
        if (!res.ok) throw new Error(res.status);
      } catch (e) {
        $("pfErr").textContent = "Không lưu được lên máy chủ. Thử lại sau nhé.";
        return;
      }
    }
    user = { ...user, fullName, bio };
    write(KEYS.user, user);
    api().toast("Đã cập nhật hồ sơ");
    draw();
  }

  function bindOnce() {
    if (bound) return;
    bound = true;
    document.addEventListener("click", (e) => {
      const el = e.target.closest(".profile [data-pf]");
      if (el && !el.disabled) {
        if (el.dataset.pf === "edit") { $("pfModal").hidden = false; $("pfForm").elements.fullName.focus(); }
        if (el.dataset.pf === "close") $("pfModal").hidden = true;
        return;
      }
      if (e.target.id === "pfModal") $("pfModal").hidden = true;
    });
    document.addEventListener("submit", (e) => {
      if (e.target.id !== "pfForm") return;
      e.preventDefault();
      saveEdit(e.target);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && $("pfModal") && !$("pfModal").hidden) $("pfModal").hidden = true;
    });
  }

  return { render, mount };
})();