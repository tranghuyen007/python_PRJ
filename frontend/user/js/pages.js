// ===== pages.js — nội dung của từng trang =====
// Mỗi trang có: title (tiêu đề tab) và render() trả về HTML để chèn vào <main class="content">.
// Muốn thêm trang mới: thêm 1 mục vào Pages + 1 mục vào menuItems trong sidebar.js.

// ---------- Dữ liệu mẫu (sau này lấy từ API backend) ----------
const userData = {
  name: "Minh Anh",
  todayMinutes: 5,
  goalMinutes: 10,
  wordsLearned: 16,
  lessonsDone: 2,
  currentLesson: {
    topic: "Đời sống hằng ngày",
    title: "Thói quen mỗi ngày",
    lessonNo: 3,
    words: 8,
    wordsDone: 4,
  },
  topics: [
    { icon: "home",  title: "Đời sống hằng ngày", desc: "Những từ gần gũi nhất với bạn.", done: 2, total: 4, status: "learning" },
    { icon: "cup",   title: "Ẩm thực & đồ uống",  desc: "Gọi món, nấu ăn và khám phá.",  done: 1, total: 4, status: "words", wordsLearned: 8 },
    { icon: "plane", title: "Du lịch & khám phá", desc: "Sẵn sàng cho chuyến đi tiếp theo.", done: 0, total: 4, status: "new" },
  ],
  reviewWords: 15,
};

// ---------- Icon SVG dùng lại nhiều lần ----------
const Icons = {
  home:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/></svg>`,
  cup:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><path d="M7 2v2M11 2v2M15 2v2"/></svg>`,
  plane: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`,
  sun:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
  refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>`,
  mic:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4"/></svg>`,
};

// ---------- Hàm nhỏ dùng chung ----------
function progressBar(percent) {
  return `<div class="progress"><div class="progress-fill" style="width:${percent}%"></div></div>`;
}

function topicBadge(topic) {
  if (topic.status === "learning") return `<span class="badge badge-blue">Đang học</span>`;
  if (topic.status === "words")    return `<span class="badge badge-green">${topic.wordsLearned} từ đã học</span>`;
  return `<span class="badge badge-gray">Chưa bắt đầu</span>`;
}

// Khung tạm cho các trang chưa làm
function comingSoon(title, desc) {
  return `
    <h1 class="page-title">${title}</h1>
    <p class="page-sub">${desc}</p>
    <div class="card empty-card">
      <img src="assets/icons/rabbit_welcome.png" alt="">
      <h3>Trang này đang được xây dựng</h3>
      <p>Thỏ Vocabbit sẽ sớm mở cửa khu vực này cho bạn.</p>
      <a href="#overview" class="btn-primary">Về Tổng quan</a>
    </div>
  `;
}

// ---------- Danh sách trang ----------
const Pages = {
  overview: {
    title: "Tổng quan",
    render() {
      const u = userData;
      const l = u.currentLesson;
      const lessonPercent = Math.round((l.wordsDone / l.words) * 100);
      const todayPercent = Math.min(100, (u.todayMinutes / u.goalMinutes) * 100);
      const minutesLeft = Math.max(0, u.goalMinutes - u.todayMinutes);

      const topicCards = u.topics.map(t => `
        <a href="#learn" class="card topic-card">
          <div class="topic-head">
            <span class="icon-box">${Icons[t.icon]}</span>
            ${topicBadge(t)}
          </div>
          <h3>${t.title}</h3>
          <p>${t.desc}</p>
          ${progressBar((t.done / t.total) * 100)}
          <div class="topic-foot">
            <span>${t.done}/${t.total} bài hoàn thành</span>
            <span class="arrow">${Icons.arrow}</span>
          </div>
        </a>
      `).join("");

      return `
        <h1 class="page-title">Chào ${u.name}, cùng học nhé!</h1>
        <p class="page-sub">Một vài từ mới hôm nay, thêm một bước tự tin ngày mai.</p>

        <section class="overview-top">
          <!-- Tiếp tục bài học -->
          <div class="card continue-card">
            <div class="continue-info">
              <span class="eyebrow">Tiếp tục bài học</span>
              <h2>${l.title}</h2>
              <p class="meta">${l.topic} • Bài ${l.lessonNo} • ${l.words} từ</p>
              <div class="progress-row">
                ${progressBar(lessonPercent)}
                <span>${lessonPercent}%</span>
              </div>
              <div class="continue-actions">
                <a href="#learn" class="btn-primary">${Icons.arrow} Tiếp tục học</a>
                <span class="hint">Đã lưu ${l.wordsDone}/${l.words} từ hoàn thành</span>
              </div>
            </div>
            <div class="continue-art">
              <img src="assets/icons/rabbit_welcome.png" alt="">
            </div>
          </div>

          <!-- Hôm nay của bạn -->
          <div class="card today-card">
            <div class="today-head">
              <h3>Hôm nay của bạn</h3>
              <span class="today-sun">${Icons.sun}</span>
            </div>
            <p class="today-num">${u.todayMinutes} / ${u.goalMinutes} phút</p>
            ${progressBar(todayPercent)}
            <p class="today-text">
              ${minutesLeft > 0
                ? `Chỉ thêm ${minutesLeft} phút để đạt mục tiêu. Bạn đang làm rất tốt!`
                : "Bạn đã đạt mục tiêu hôm nay. Tuyệt vời!"}
            </p>
            <span class="badge badge-green">${u.wordsLearned} từ đã học • ${u.lessonsDone} bài hoàn thành</span>
          </div>
        </section>

        <section>
          <div class="section-head">
            <h2>Học theo chủ đề</h2>
            <a href="#learn" class="link">Xem tất cả chủ đề →</a>
          </div>
          <div class="topic-grid">${topicCards}</div>
        </section>

        <section class="shortcut-grid">
          <a href="#review" class="card shortcut-card">
            <span class="shortcut-icon">${Icons.refresh}</span>
            <div>
              <h3>Ôn tập để nhớ lâu</h3>
              <p>${u.reviewWords} từ quen thuộc, một lượt ôn nhẹ nhàng.</p>
              <span class="link">Đến trung tâm ôn tập →</span>
            </div>
          </a>
          <a href="#pronounce" class="card shortcut-card">
            <span class="shortcut-icon">${Icons.mic}</span>
            <div>
              <h3>Nói rõ hơn mỗi ngày</h3>
              <p>Nghe mẫu, ghi âm và nhận phản hồi phát âm.</p>
              <span class="link">Luyện phát âm nâng cao →</span>
            </div>
          </a>
        </section>
      `;
    },
  },

  learn: {
    title: "Học từ mới",
    render: () => comingSoon("Học từ mới", "Khám phá từ vựng mới theo từng chủ đề."),
  },
  review: {
    title: "Ôn tập",
    render: () => comingSoon("Ôn tập", "Ôn lại những từ đã học để nhớ lâu hơn."),
  },
  pronounce: {
    title: "Luyện phát âm",
    render: () => comingSoon("Luyện phát âm", "Nghe mẫu, ghi âm và so sánh giọng của bạn."),
  },
  wordbook: {
    title: "Bộ từ của tôi",
    render: () => comingSoon("Bộ từ của tôi", "Những từ bạn đã lưu lại."),
  },
  profile: {
    title: "Hồ sơ",
    render: () => comingSoon("Hồ sơ", "Thông tin tài khoản và mục tiêu học tập."),
  },
};