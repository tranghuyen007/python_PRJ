// ===== sidebar.js — vẽ thanh điều hướng bên trái =====

// Danh sách menu: "page" phải trùng tên trang trong pages.js
const menuItems = [
  { page: "overview",  icon: "overview.png",  label: "Tổng quan" },
  { page: "learn",     icon: "learn.png",     label: "Học từ mới" },
  { page: "review",    icon: "review.png",    label: "Ôn tập" },
  { page: "pronounce", icon: "pronounce.png", label: "Luyện phát âm" },
  { page: "wordbook",  icon: "wordbook.png",  label: "Bộ từ của tôi" },
  { page: "profile",   icon: "profile.png",   label: "Hồ sơ" },
];

// Mục tiêu hằng ngày (sau này lấy từ API backend)
const dailyDone = 5;
const dailyGoal = 10;
const dailyPercent = Math.min(100, (dailyDone / dailyGoal) * 100);

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
    <a href="#overview" class="logo">
      <img src="../assets/icons/logo.png" alt="Vocabbit">
      <span>Vocabbit</span>
    </a>

    <ul class="side-menu">${menuHTML}</ul>

    <div class="daily-card">
      <svg class="daily-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
      </svg>
      <h4>Mỗi ngày một chút</h4>
      <p>10 phút hôm nay, tự tin hơn mỗi ngày.</p>
      <div class="progress"><div class="progress-fill" style="width:${dailyPercent}%"></div></div>
      <span class="daily-text">${dailyDone} / ${dailyGoal} phút hôm nay</span>
    </div>

    <a href="#" class="help-link">ⓘ Trợ giúp &amp; góp ý</a>
  </aside>
`;

// Tô sáng mục menu đang mở (router.js gọi hàm này mỗi lần đổi trang)
function setActiveMenu(pageName) {
  document.querySelectorAll(".side-menu a").forEach(link => {
    link.classList.toggle("active", link.dataset.page === pageName);
  });
}