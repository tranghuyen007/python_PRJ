// ===== router.js — đổi nội dung <main class="content"> khi bấm menu =====
// Dùng dấu # trên địa chỉ (vd: index.html#review) nên không cần tải lại trang
// và chạy được cả khi mở file trực tiếp hay dùng Live Server.

const contentEl = document.getElementById("content");

function renderPage() {
  // Lấy tên trang từ địa chỉ, mặc định là "overview"
  let pageName = window.location.hash.replace("#", "") || "overview";
  if (!Pages[pageName]) pageName = "overview";

  const page = Pages[pageName];

  contentEl.innerHTML = page.render();
  document.title = `${page.title} – Vocabbit`;
  setActiveMenu(pageName);          // hàm này nằm trong sidebar.js
  window.scrollTo({ top: 0 });

  // Hiệu ứng hiện dần nhẹ
  contentEl.classList.remove("page-enter");
  void contentEl.offsetWidth;
  contentEl.classList.add("page-enter");
}

window.addEventListener("hashchange", renderPage);
renderPage();