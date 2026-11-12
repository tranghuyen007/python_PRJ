// Nội dung 2 ngôn ngữ. Key trùng với thuộc tính data-i18n trong HTML.
const texts = {
  vi: {
    label: "Tiếng Việt",
    heroTitle: 'Học từ vựng cùng <span class="">Vocabbit</span>, học một chút tiến bộ thật nhiều',
    start: "Get started",
    login: "I already have an account",

    f1Tag: "Học từ vựng",
    f1Title: "Học từng từ,<br />hiểu từng nghĩa.",
    f1Desc: "Mỗi unit giới thiệu từ vựng theo chủ đề quen thuộc, kèm phát âm chuẩn, nghĩa tiếng Việt và câu ví dụ thực tế. Flashcard và bài nối từ giúp bạn nhớ nghĩa nhanh hơn, để hiểu từ chứ không chỉ học thuộc lòng.",

    f2Tag: "Ôn luyện thông minh",
    f2Title: "Luyện tập đa dạng,<br />ghi nhớ lâu dài.",
    f2Desc: "Sau khi học xong, từ vựng được ôn lại qua nhiều dạng bài tập khác nhau. Mỗi dạng luyện một kỹ năng riêng, giúp bạn nhớ từ theo nhiều chiều.",

    f3Tag: "Theo dõi tiến trình",
    f3Title: "Học mỗi ngày,<br />tiến bộ mỗi ngày.",
    f3Desc: "Chuỗi ngày học liên tiếp (streak) giúp bạn giữ động lực mỗi ngày. Trang hồ sơ cho bạn thấy số từ đã học, số unit đã hoàn thành và những từ cần ôn lại, để biết rõ mình đang tiến bộ ra sao.",

    ctaTitle: "Thêm một từ mới, thêm một bước tiến.",
    ctaSub: "Tạo tài khoản miễn phí và bắt đầu bài học đầu tiên cùng Vocabbit.",

    footDesc: "Web học từ vựng tiếng Anh nhẹ nhàng, thú vị cho người mới bắt đầu. Học một chút mỗi ngày cùng bạn thỏ Vocabbit.",
    colLearn: "Học tập", lLessons: "Bài học từ vựng", lReview: "Ôn luyện", lWrite: "Luyện viết từ", lProgress: "Theo dõi tiến độ",
    colHelp: "Hỗ trợ", lFaq: "Câu hỏi thường gặp", lGuide: "Hướng dẫn sử dụng", lContact: "Liên hệ góp ý",
    colLegal: "Pháp lý", lTerms: "Điều khoản sử dụng", lPrivacy: "Chính sách quyền riêng tư", lCookie: "Chính sách cookie"
  },
  en: {
    label: "English",
    heroTitle: 'Learn vocabulary with <span class="">Vocabbit</span>, a little each day, a lot of progress',
    start: "Get started",
    login: "I already have an account",

    f1Tag: "Vocabulary",
    f1Title: "Learn every word,<br />understand every meaning.",
    f1Desc: "Each unit introduces words by familiar topics, with clear pronunciation, Vietnamese meanings and real-life example sentences. Flashcards and word-matching help you remember meanings faster, so you truly understand words instead of just memorizing them.",

    f2Tag: "Smart review",
    f2Title: "Varied practice,<br />lasting memory.",
    f2Desc: "After each lesson, your words are reviewed through several types of exercises. Each type trains a different skill, helping you remember words from many angles.",

    f3Tag: "Track progress",
    f3Title: "Learn every day,<br />grow every day.",
    f3Desc: "Your daily streak keeps you motivated every day. Your profile shows how many words you've learned, how many units you've completed and which words need review, so you can clearly see your progress.",

    ctaTitle: "One new word, one step forward.",
    ctaSub: "Create a free account and start your first lesson with Vocabbit.",

    footDesc: "A gentle, fun way for beginners to learn English vocabulary. Learn a little every day with Vocabbit the bunny.",
    colLearn: "Learn", lLessons: "Vocabulary lessons", lReview: "Review", lWrite: "Spelling practice", lProgress: "Progress",
    colHelp: "Support", lFaq: "FAQ", lGuide: "User guide", lContact: "Feedback",
    colLegal: "Legal", lTerms: "Terms of use", lPrivacy: "Privacy policy", lCookie: "Cookie policy"
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