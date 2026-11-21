// Nội dung 2 ngôn ngữ. Key trùng với thuộc tính data-i18n trong HTML.
const texts = {
  vi: {
    label: "Tiếng Việt",
    heroTitle: 'Học từ vựng cùng <span class="">Vocabbit</span>, học một chút tiến bộ thật nhiều',
    start: "Tạo tài khoản",
    login: "Đăng nhập",

    f1Tag: "Học từ vựng",
    f1Title: "Từ vựng theo cấp độ,<br />chủ đề và bài học.",
    f1Desc: "Duyệt danh sách từ vựng được quản trị viên cập nhật, với nghĩa tiếng Việt, phiên âm và câu ví dụ khi có.",

    f2Tag: "Kiểm tra vượt cấp",
    f2Title: "Vượt qua bài kiểm tra,<br />mở khóa cấp độ.",
    f2Desc: "Bài kiểm tra trắc nghiệm lấy từ vựng trong cấp độ. Khi đạt số câu đúng tối thiểu, bạn mở được cấp độ đó và các cấp độ thấp hơn.",

    f3Tag: "Nghe từ vựng",
    f3Title: "Xem phiên âm,<br />nghe phát âm.",
    f3Desc: "Mỗi từ có thể hiển thị phiên âm và ví dụ. Nút phát âm sử dụng giọng đọc có sẵn trên trình duyệt.",

    ctaTitle: "Thêm một từ mới, thêm một bước tiến.",
    ctaSub: "Tạo tài khoản miễn phí và bắt đầu bài học đầu tiên cùng Vocabbit.",

    footDesc: "Web học từ vựng tiếng Anh nhẹ nhàng, thú vị cho người mới bắt đầu. Học một chút mỗi ngày cùng bạn thỏ Vocabbit.",
    colLearn: "Học tập", lLessons: "Bài học từ vựng"
  },
  en: {
    label: "English",
    heroTitle: 'Learn vocabulary with <span class="">Vocabbit</span>, a little each day, a lot of progress',
    start: "Get started",
    login: "I already have an account",

    f1Tag: "Vocabulary",
    f1Title: "Vocabulary by level,<br />topic and lesson.",
    f1Desc: "Browse administrator-managed vocabulary with Vietnamese meanings, pronunciation and example sentences when available.",

    f2Tag: "Placement tests",
    f2Title: "Pass a test,<br />unlock a level.",
    f2Desc: "Multiple-choice vocabulary questions come from the selected level. Passing unlocks that level and all lower levels.",

    f3Tag: "Listen to vocabulary",
    f3Title: "Read pronunciation,<br />hear each word.",
    f3Desc: "Words can include pronunciation and examples. The play button uses speech available in your browser.",

    ctaTitle: "One new word, one step forward.",
    ctaSub: "Create a free account and start your first lesson with Vocabbit.",

    footDesc: "A gentle, fun way for beginners to learn English vocabulary. Learn a little every day with Vocabbit the bunny.",
    colLearn: "Learn", lLessons: "Vocabulary lessons"
  }
};

// Đổ chữ theo ngôn ngữ vào mọi phần tử có data-i18n
function applyLanguage(lang) {
  const t = texts[lang];
  document.documentElement.lang = lang;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const value = t[el.dataset.i18n];
    if (value !== undefined) el.innerHTML = value;
  });

  const label = document.getElementById("langLabel");
  if (label) label.textContent = t.label;

  try { localStorage.setItem("vocabbit-lang", lang); } catch (e) { /* bỏ qua */ }
}

document.addEventListener("DOMContentLoaded", () => {
  // Năm hiện tại ở footer
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // --- Đổi ngôn ngữ ---
  let lang = "vi";
  try { lang = localStorage.getItem("vocabbit-lang") || "vi"; } catch (e) { /* bỏ qua */ }
  if (lang !== "vi") applyLanguage(lang);

  const langBtn = document.getElementById("langBtn");
  if (langBtn) {
    langBtn.addEventListener("click", () => {
      lang = lang === "vi" ? "en" : "vi";
      applyLanguage(lang);
    });
  }

  // --- Viền header khi cuộn ---
  const header = document.querySelector(".site-header");
  const onScroll = () => header && header.classList.toggle("scrolled", window.scrollY > 10);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // --- Hiện dần các khối khi cuộn tới ---
  const items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    items.forEach((el) => observer.observe(el));
  } else {
    items.forEach((el) => el.classList.add("visible"));
  }
});