// ===== welcome.js =====

// Nội dung 2 ngôn ngữ. Key trùng với thuộc tính data-i18n trong HTML.
const texts = {
  vi: {
    label: "Tiếng Việt",
    heroTitle: 'Thêm từ vựng,<br />thêm <span class="highlight">tự tin.</span>',
    heroSub: "Khám phá từ vựng tiếng Anh theo cách nhẹ nhàng và thú vị. Học một chút mỗi ngày, cùng bạn thỏ Vocabbit.",
    start: "Get started",
    login: "I already have an account",

    f1Tag: "Học từ vựng",
    f1Title: "Học từng từ,<br />hiểu từng nghĩa.",
    f1Desc: "Mỗi bài học giới thiệu từ vựng theo chủ đề, kèm phát âm, nghĩa tiếng Việt và câu ví dụ thực tế – để bạn hiểu từ chứ không chỉ học thuộc lòng.",
    f1b1: "Nghe phát âm chuẩn và luyện đọc theo",
    f1b2: "Phân loại từ theo chủ đề quen thuộc",
    f1b3: "Flashcard và câu ví dụ giúp nhớ nghĩa nhanh hơn",

    f2Tag: "Ôn luyện thông minh",
    f2Title: "Luyện tập đa dạng,<br />ghi nhớ lâu dài.",
    f2Desc: "Sau khi học xong, từ vựng được ôn lại qua nhiều dạng bài tập khác nhau. Mỗi dạng luyện một kỹ năng riêng, giúp bạn nhớ từ theo nhiều chiều.",
    f2b1: "<b>Trắc nghiệm</b> — chọn đúng nghĩa của từ",
    f2b2: "<b>Điền từ</b> — hoàn thành câu bằng từ đúng",
    f2b3: "<b>Viết từ</b> — gõ lại từ tiếng Anh từ nghĩa tiếng Việt",

    f3Tag: "Theo dõi tiến trình",
    f3Title: "Học mỗi ngày,<br />tiến bộ mỗi ngày.",
    f3Desc: "Duy trì thói quen với chuỗi ngày học liên tiếp. Theo dõi số từ đã học, số bài đã hoàn thành và những từ cần ôn lại để thấy rõ mình đang tiến bộ ra sao.",
    f3b1: "Chuỗi ngày học (streak) để duy trì động lực",
    f3b2: "Thống kê số từ đã học và bài đã hoàn thành",
    f3b3: "Gợi ý những từ cần ôn lại đúng lúc",

    ctaTitle: "Thêm một từ mới, thêm một bước tiến.",
    ctaSub: "Tạo tài khoản miễn phí và bắt đầu bài học đầu tiên cùng Vocabbit.",

    footDesc: "Web học từ vựng tiếng Anh nhẹ nhàng, thú vị cho người mới bắt đầu. Học một chút mỗi ngày cùng bạn thỏ Vocabbit.",
    colLearn: "Học tập", lLessons: "Bài học từ vựng", lReview: "Ôn luyện", lWrite: "Luyện viết từ", lProgress: "Theo dõi tiến độ",
    colHelp: "Hỗ trợ", lFaq: "Câu hỏi thường gặp", lGuide: "Hướng dẫn sử dụng", lContact: "Liên hệ góp ý",
    colLegal: "Pháp lý", lTerms: "Điều khoản sử dụng", lPrivacy: "Chính sách quyền riêng tư", lCookie: "Chính sách cookie",
    rights: "Đồ án môn học."
  },
  en: {
    label: "English",
    heroTitle: 'More words,<br />more <span class="highlight">confidence.</span>',
    heroSub: "Discover English vocabulary in a gentle, fun way. Learn a little every day with Vocabbit the bunny.",
    start: "Get started",
    login: "I already have an account",

    f1Tag: "Vocabulary",
    f1Title: "Learn every word,<br />understand every meaning.",
    f1Desc: "Each lesson introduces words by topic, with pronunciation, Vietnamese meaning and real example sentences – so you understand words instead of just memorizing them.",
    f1b1: "Listen to native pronunciation and repeat",
    f1b2: "Words grouped into familiar topics",
    f1b3: "Flashcards and examples help meanings stick",

    f2Tag: "Smart review",
    f2Title: "Varied practice,<br />lasting memory.",
    f2Desc: "After each lesson, words come back in different exercise types. Each one trains a different skill, so you remember words from every angle.",
    f2b1: "<b>Multiple choice</b> — pick the right meaning",
    f2b2: "<b>Fill in the blank</b> — complete the sentence",
    f2b3: "<b>Spelling</b> — type the English word from its meaning",

    f3Tag: "Track progress",
    f3Title: "Learn every day,<br />grow every day.",
    f3Desc: "Build a habit with your daily streak. See how many words you've learned, lessons you've finished and which words need review.",
    f3b1: "Daily streak to keep you motivated",
    f3b2: "Stats on words learned and lessons completed",
    f3b3: "Reminders to review words at the right time",

    ctaTitle: "One new word, one step forward.",
    ctaSub: "Create a free account and start your first lesson with Vocabbit.",

    footDesc: "A gentle, fun way for beginners to learn English vocabulary. Learn a little every day with Vocabbit the bunny.",
    colLearn: "Learn", lLessons: "Vocabulary lessons", lReview: "Review", lWrite: "Spelling practice", lProgress: "Progress",
    colHelp: "Support", lFaq: "FAQ", lGuide: "User guide", lContact: "Feedback",
    colLegal: "Legal", lTerms: "Terms of use", lPrivacy: "Privacy policy", lCookie: "Cookie policy",
    rights: "Course project."
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