// Danh sách menu: thêm/bớt mục chỉ cần sửa ở đây
const menuItems = [
  { href: "index.html",     icon: "overview.png",  label: "Tổng quan" },
  { href: "learn.html",     icon: "learn.png",     label: "Học từ mới" },
  { href: "review.html",    icon: "review.png",    label: "Ôn tập" },
  { href: "pronounce.html", icon: "pronounce.png", label: "Luyện phát âm" },
  { href: "wordbook.html",  icon: "wordbook.png",  label: "Bộ từ của tôi" },
  { href: "profile.html",   icon: "profile.png",   label: "Hồ sơ" },
];

const currentPage = window.location.pathname.split("/").pop() || "index.html";

const menuHTML = menuItems.map(item => `
  <li>
    <a href="${item.href}" class="${item.href === currentPage ? "active" : ""}">
      <img src="assets/icons/${item.icon}" alt="">
      <span>${item.label}</span>
    </a>
  </li>
`).join("");

// Mục tiêu hằng ngày (sau này lấy từ API backend)
const dailyDone = 5;
const dailyGoal = 10;
const percent = Math.min(100, (dailyDone / dailyGoal) * 100);

document.getElementById("sidebar").innerHTML = `
  <aside class="sidebar">
    <a href="index.html" class="logo">
      <img src="assets/icons/logo.png" alt="">
      <span>Vocabbit</span>
    </a>

    <ul class="side-menu">${menuHTML}</ul>

    <div class="daily-card">
      <img src="assets/icons/target.png" alt="" class="daily-icon">
      <h4>Mỗi ngày một chút</h4>
      <p>10 phút hôm nay, tự tin hơn mỗi ngày.</p>
      <div class="progress"><div class="progress-fill" style="width:${percent}%"></div></div>
      <span class="daily-text">${dailyDone} / ${dailyGoal} phút hôm nay</span>
    </div>

    <a href="#" class="help-link">ⓘ Trợ giúp &amp; góp ý</a>
  </aside>
`;
