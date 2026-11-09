// ===== router.js — đổi nội dung <main class="content"> khi bấm menu =====
// Dùng dấu # trên địa chỉ (vd: index.html#review) nên không cần tải lại trang
// và chạy được cả khi mở file trực tiếp hay dùng Live Server.

const DEFAULT_PAGE = "learn";   // đã bỏ Tổng quan -> mở "Học từ mới" đầu tiên

const contentEl = document.getElementById("content");
const topbarTitleEl = document.querySelector(".topbar-title");

function renderPage() {
  // Địa chỉ dạng #tên-trang hoặc #tên-trang/tham-số (vd: #study/a1-family-3/2)
  const hash = window.location.hash.replace("#", "");
  let [pageName, ...rest] = hash.split("/");
  let param = rest.join("/");
  if (!Pages[pageName]) { pageName = DEFAULT_PAGE; param = ""; }

  const page = Pages[pageName];

  contentEl.innerHTML = page.render(param);
  document.title = `${page.title} – Vocabbit`;
  if (topbarTitleEl) topbarTitleEl.textContent = page.crumb || page.title;
  setActiveMenu(page.menu || pageName);   // trang con (vd: study) tô sáng mục menu cha
  window.scrollTo({ top: 0 });

  // Trang nào cần chạy JS sau khi vẽ (gắn sự kiện, tải dữ liệu) thì khai báo mount()
  if (typeof page.mount === "function") page.mount(param);

  // Hiệu ứng hiện dần nhẹ
  contentEl.classList.remove("page-enter");
  void contentEl.offsetWidth;
  contentEl.classList.add("page-enter");
}

window.addEventListener("hashchange", renderPage);
renderPage();