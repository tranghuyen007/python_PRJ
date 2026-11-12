// ===== welcome.js =====

// Nội dung 2 ngôn ngữ
const texts = {
  vi: {
    label: "Tiếng Việt",
    title: 'Thêm từ vựng,<br />thêm <span class="highlight">tự tin.</span>',
    subtitle: "Khám phá từ vựng tiếng Anh theo cách nhẹ nhàng và thú vị. Học một chút mỗi ngày, cùng bạn thỏ Vocabbit.",
    start: "Get started",
    login: "I already have an account"
  },
  en: {
    label: "English",
    title: 'More words,<br />more <span class="highlight">confidence.</span>',
    subtitle: "Discover English vocabulary in a gentle, fun way. Learn a little every day with Vocabbit the bunny.",
    start: "Get started",
    login: "I already have an account"
  }
};

// Chạy khi trang đã tải xong
document.addEventListener("DOMContentLoaded", () => {
  const langBtn = document.getElementById("langBtn");

  // Không có nút đổi ngôn ngữ thì bỏ qua, tránh lỗi
  if (!langBtn) return;

  let lang = "vi";

  langBtn.addEventListener("click", () => {
    lang = lang === "vi" ? "en" : "vi";
    const t = texts[lang];

    document.documentElement.lang = lang;

    const label = document.getElementById("langLabel");
    if (label) label.textContent = t.label;

    document.getElementById("title").innerHTML = t.title;
    document.getElementById("subtitle").textContent = t.subtitle;
    document.getElementById("btnStart").textContent = t.start;
    document.getElementById("btnLogin").textContent = t.login;
  });
});