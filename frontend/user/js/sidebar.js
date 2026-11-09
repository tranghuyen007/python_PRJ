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
const LOGIN_PAGE = "login.html";
document.getElementById("logoutBtn").addEventListener("click", () => {
  const isDemo = typeof LessonPage !== "undefined" && LessonPage.api && LessonPage.api.isDemo;
  try {
    localStorage.removeItem("vocabbit_token");
    if (!isDemo) localStorage.removeItem("vocabbit_user");
  } catch (err) { /* bỏ qua */ }
  window.location.href = LOGIN_PAGE;
});

// Tô sáng mục menu đang mở (router.js gọi hàm này mỗi lần đổi trang)
function setActiveMenu(pageName) {
  document.querySelectorAll(".side-menu a").forEach(link => {
    link.classList.toggle("active", link.dataset.page === pageName);
  });
}