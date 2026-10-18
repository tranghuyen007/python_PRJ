// ===== auth.js – dùng chung cho register.html, login.html, register-success.html =====

// ---------------------------------------------------------------
// 1) CẤU HÌNH
// ---------------------------------------------------------------
// DEMO_MODE = true  : chưa có backend, bấm nút Google sẽ giả lập thành công
//                     để bạn xem được cả luồng giao diện.
// DEMO_MODE = false : chuyển sang backend Python thật để đăng nhập Google.
const DEMO_MODE = true;

const ROUTES = {
  googleRegister: "/auth/google/register", // backend: bắt đầu đăng ký bằng Google
  googleLogin: "/auth/google/login",       // backend: bắt đầu đăng nhập bằng Google
  success: "register_success.html",        // trang sau khi tạo tài khoản
  overview: "index.html"                   // trang Tổng quan
};

const STORAGE_KEY = "vocabbit_onboarding";

// ---------------------------------------------------------------
// 2) ĐỔI GIÁ TRỊ ĐÃ LƯU -> CHỮ HIỂN THỊ
//    (giữ đúng value trong onboarding.js)
// ---------------------------------------------------------------
const LABELS = {
  goal: {
    study: "Học tập",
    work: "Công việc",
    travel: "Du lịch",
    talk: "Giao tiếp tự tin",
    hobby: "Sở thích",
    explore: "Khám phá thêm"
  },
  level: {
    A0: "Mới bắt đầu · A0",
    A1: "Cơ bản · A1",
    A2: "Sơ trung cấp · A2",
    B1: "Trung cấp trở lên · B1+"
  }
};

// ---------------------------------------------------------------
// 3) ĐỌC LỰA CHỌN TỪ ONBOARDING
// ---------------------------------------------------------------
function getAnswers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (err) {
    return {};
  }
}

// Điền 3 dòng tóm tắt (Mục đích / Trình độ / Mục tiêu mỗi ngày) nếu trang có
function fillSummary() {
  const a = getAnswers();
  const values = {
    goal: LABELS.goal[a.goal],
    level: LABELS.level[a.level],
    dailyMinutes: a.dailyMinutes ? `${a.dailyMinutes} phút / ngày` : null
  };

  document.querySelectorAll("[data-summary]").forEach((el) => {
    const v = values[el.dataset.summary];
    el.textContent = v || "Chưa chọn";
    el.classList.toggle("empty", !v);

    // Ẩn dấu tick nếu mục đó chưa chọn
    const check = el.closest(".summary-item")?.querySelector(".summary-check");
    if (check) check.style.visibility = v ? "visible" : "hidden";
  });
}

// ---------------------------------------------------------------
// 4) NÚT GOOGLE
// ---------------------------------------------------------------
function setLoading(btn, text) {
  btn.disabled = true;
  const label = btn.querySelector(".btn-label");
  if (label) label.textContent = text;
}

// Đăng ký: gửi kèm lựa chọn onboarding để backend lưu vào tài khoản mới
function registerWithGoogle(btn) {
  setLoading(btn, "Đang kết nối Google...");

  if (DEMO_MODE) {
    setTimeout(() => (window.location.href = ROUTES.success), 700);
    return;
  }

  const a = getAnswers();
  const params = new URLSearchParams({
    goal: a.goal || "",
    level: a.level || "",
    minutes: a.dailyMinutes || ""
  });
  window.location.href = `${ROUTES.googleRegister}?${params}`;
}

// Đăng nhập: tài khoản đã có, vào thẳng Tổng quan
function loginWithGoogle(btn) {
  setLoading(btn, "Đang kết nối Google...");

  if (DEMO_MODE) {
    setTimeout(() => (window.location.href = ROUTES.overview), 700);
    return;
  }

  window.location.href = ROUTES.googleLogin;
}

// ---------------------------------------------------------------
// 5) GẮN SỰ KIỆN
// ---------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  fillSummary();

  const btnRegister = document.getElementById("btnGoogleRegister");
  if (btnRegister) btnRegister.addEventListener("click", () => registerWithGoogle(btnRegister));

  const btnLogin = document.getElementById("btnGoogleLogin");
  if (btnLogin) btnLogin.addEventListener("click", () => loginWithGoogle(btnLogin));

  // Trang thành công: tài khoản đã lưu lựa chọn, xoá bản tạm trên trình duyệt
  if (document.body.dataset.page === "success" && !DEMO_MODE) {
    try { localStorage.removeItem(STORAGE_KEY); } catch (err) {}
  }
});