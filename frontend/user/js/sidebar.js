// ===== sidebar.js — vẽ thanh điều hướng bên trái =====

// Danh sách menu: "page" phải trùng tên trang trong pages.js
const menuItems = [
  //{ page: "overview",  icon: "overview.png",  label: "Tổng quan" },
  { page: "learn",     icon: "learn.png",     label: "Học từ mới" },
  { page: "review",    icon: "review.png",    label: "Ôn tập" },
  { page: "pronounce", icon: "pronounce.png", label: "Luyện phát âm" },
  //{ page: "wordbook",  icon: "wordbook.png",  label: "Bộ từ của tôi" },
  { page: "profile",   icon: "profile.png",   label: "Hồ sơ" },
];

const menuHTML = menuItems.map(item => `
  <li>
    <a href="#${item.page}" data-page="${item.page}">
      <img src="../assets/icons/${item.icon}" alt="">
      <span>${item.label}</span>
    </a>
  </li>
`).join("");

document.getElementById("sidebar").innerHTML = `
  <aside class="sidebar">
    <a href="#learn" class="logo">
      <span>Vocabbit</span>
    </a>

    <ul class="side-menu">${menuHTML}</ul>

    <div class="side-foot">
      <button type="button" class="logout-btn" id="logoutBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
        <span>Đăng xuất</span>
      </button>
    </div>
  </aside>
`;

// Đăng xuất: xoá token đăng nhập rồi quay về trang đăng nhập
// (bản demo giữ lại thông tin tài khoản & tiến độ để đăng nhập lại cùng gmail vẫn còn dữ liệu)
const LOGIN_PAGE = "pages/login.html";
// Dữ liệu riêng của từng người học (giữ giống USER_DATA_KEYS trong auth.js)
const LOGOUT_USER_KEYS = ["vocabbit_progress", "vocabbit_onboarding", "vocabbit_saved_words", "vocabbit_user"];
const LOGOUT_SNAPSHOT_PREFIX = "vocabbit_snapshot:";

document.getElementById("logoutBtn").addEventListener("click", () => {
  const isDemo = typeof LessonPage !== "undefined" && LessonPage.api && LessonPage.api.isDemo;
  try {
    // 1) Chụp lại toàn bộ tiến độ ngay lúc đăng xuất, gắn theo gmail của người học
    const user = JSON.parse(localStorage.getItem("vocabbit_user") || "null");
    if (user && user.email) {
      const data = {};
      LOGOUT_USER_KEYS.forEach((k) => {
        const v = localStorage.getItem(k);
        if (v !== null) data[k] = v;
      });
      localStorage.setItem(LOGOUT_SNAPSHOT_PREFIX + user.email.toLowerCase(), JSON.stringify({
        savedAt: new Date().toISOString(),
        lastPage: window.location.hash || "#learn",   // trang đang mở lúc đăng xuất
        data
      }));
    }
    // 2) Xoá token + dữ liệu đang dùng, để người khác đăng nhập trên máy này không thấy bài của mình
    localStorage.removeItem("vocabbit_token");
    if (!isDemo) LOGOUT_USER_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch (err) { /* bỏ qua */ }
  window.location.href = LOGIN_PAGE;
});

// Tô sáng mục menu đang mở (router.js gọi hàm này mỗi lần đổi trang)
function setActiveMenu(pageName) {
  document.querySelectorAll(".side-menu a").forEach(link => {
    link.classList.toggle("active", link.dataset.page === pageName);
  });
}