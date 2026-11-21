"use strict";

const menuItems = [
  { page: "learn", icon: "learn.png", label: "Học từ mới" },
  { page: "review", icon: "review.png", label: "Ôn tập" },
  { page: "pronounce", icon: "pronounce.png", label: "Luyện phát âm" },
  { page: "profile", icon: "profile.png", label: "Hồ sơ" }
];

const menuHTML = menuItems.map(item => `
  <li><a href="#${item.page}" data-page="${item.page}">
    <img src="../assets/icons/${item.icon}" alt=""><span>${item.label}</span>
  </a></li>
`).join("");

document.getElementById("sidebar").innerHTML = `
  <aside class="sidebar">
    <a href="#learn" class="logo"><span>Vocabbit</span></a>
    <ul class="side-menu">${menuHTML}</ul>
    <div class="side-foot">
      <button type="button" class="logout-btn" id="logoutBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
        <span>Đăng xuất</span>
      </button>
    </div>
  </aside>
`;

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("vocabbit_token");
  localStorage.removeItem("vocabbit_user");
  window.location.replace("login.html");
});

try {
  const user = JSON.parse(localStorage.getItem("vocabbit_user") || "null");
  const name = user && (user.fullName || user.email);
  if (name) document.getElementById("topbar-user").textContent = name;
} catch (error) {
  console.error("Could not read the signed-in user profile.", error);
}

function setActiveMenu(pageName) {
  document.querySelectorAll(".side-menu a").forEach(link => {
    link.classList.toggle("active", link.dataset.page === pageName);
  });
}
