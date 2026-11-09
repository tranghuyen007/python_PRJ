// ===== auth.js – dùng chung cho register.html, login.html, register_success.html =====

// ---------------------------------------------------------------
// 1) CẤU HÌNH
// ---------------------------------------------------------------
// DEMO_MODE = true  : chưa có backend, form hợp lệ sẽ giả lập thành công
//                     để bạn xem được cả luồng giao diện.
// DEMO_MODE = false : gửi dữ liệu lên backend Python thật.
const DEMO_MODE = true;

const ROUTES = {
  register: "/api/register",          // backend: tạo tài khoản (POST JSON)
  login: "/api/login",                // backend: đăng nhập (POST JSON)
  success: "register_success.html",   // trang sau khi tạo tài khoản
  overview: "index.html"              // trang Tổng quan
};

const STORAGE_KEY = "vocabbit_onboarding";
const USER_KEY = "vocabbit_user";    // thông tin tài khoản cho trang Hồ sơ
const TOKEN_KEY = "vocabbit_token";  // access token từ backend (lesson.js cũng đọc key này)

// ---------------------------------------------------------------
// 2) ĐỔI GIÁ TRỊ ĐÃ LƯU -> CHỮ HIỂN THỊ (giữ đúng value trong onboarding.js)
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

// Điền 3 dòng tóm tắt (Mục đích / Trình độ / Số ngày học mỗi tuần) nếu trang có
function fillSummary() {
  const a = getAnswers();
  const values = {
    goal: LABELS.goal[a.goal],
    level: LABELS.level[a.level],
    daysPerWeek: a.daysPerWeek
      ? (a.daysPerWeek === "7" ? "Mỗi ngày trong tuần" : `${a.daysPerWeek} ngày / tuần`)
      : null
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

// Lưu thông tin tài khoản để trang Hồ sơ hiển thị (tên, gmail, ngày tham gia...)
// Backend nên trả về { access_token, user: { full_name, email, gender, created_at } }
function saveUser(user, token) {
  try {
    const old = JSON.parse(localStorage.getItem(USER_KEY) || "null");
    const keep = old && old.email === user.email ? old : {};
    localStorage.setItem(USER_KEY, JSON.stringify({ ...keep, ...user }));
    if (token) localStorage.setItem(TOKEN_KEY, token);
  } catch (err) { /* bỏ qua */ }
}

function userFromServer(u, fallback) {
  if (!u) return fallback;
  return {
    fullName: u.full_name || fallback.fullName,
    email: u.email || fallback.email,
    gender: u.gender || fallback.gender,
    createdAt: u.created_at || fallback.createdAt,
    bio: u.bio || fallback.bio || ""
  };
}

// ---------------------------------------------------------------
// 4) KIỂM TRA FORM
// ---------------------------------------------------------------
// Gmail hợp lệ: bắt đầu bằng chữ/số, chỉ gồm chữ, số, dấu . _ + -, đuôi @gmail.com
const GMAIL_RE = /^[a-z0-9][a-z0-9._+-]*@gmail\.com$/i;

// Mỗi ô (theo thuộc tính name) có 1 luật; trả về "" nếu hợp lệ, ngược lại là câu báo lỗi
const RULES = {
  fullName: (v) => (v.trim() ? "" : "Vui lòng nhập tên của bạn"),
  email:    (v) => (GMAIL_RE.test(v.trim()) ? "" : "Nhập sai cú pháp gmail"),
  password: (v) => (v.length >= 8 ? "" : "Nhập ít nhất 8 kí tự"),
  confirm:  (v, form) => (v && v === form.elements.password.value ? "" : "Mật khẩu nhập lại không khớp")
};

// Hiện / xoá lỗi của một ô. Khi xoá lỗi thì trả lại dòng gợi ý ban đầu.
function setFieldError(input, message) {
  const field = input.closest(".field");
  const msg = field.querySelector(".field-msg");
  if (msg && msg.dataset.hint === undefined) msg.dataset.hint = msg.textContent;

  field.classList.toggle("invalid", !!message);
  input.setAttribute("aria-invalid", message ? "true" : "false");
  if (msg) msg.textContent = message || msg.dataset.hint;
}

function validateInput(input) {
  const rule = RULES[input.name];
  if (!rule) return true;
  const message = rule(input.value, input.form);
  setFieldError(input, message);
  return !message;
}

// Kiểm tra cả form, đưa con trỏ về ô sai đầu tiên
function validateForm(form) {
  let firstBad = null;
  form.querySelectorAll("input[name]").forEach((input) => {
    if (!validateInput(input) && !firstBad) firstBad = input;
  });
  if (firstBad) firstBad.focus();
  return !firstBad;
}

// Kiểm tra khi rời ô, và tự xoá lỗi ngay khi người dùng sửa đúng
function attachLiveValidation(form) {
  form.querySelectorAll("input[name]").forEach((input) => {
    input.addEventListener("blur", () => {
      if (input.value) validateInput(input);
    });
    input.addEventListener("input", () => {
      if (input.closest(".field").classList.contains("invalid")) validateInput(input);
      // đổi mật khẩu thì kiểm tra lại ô "nhập lại mật khẩu"
      const confirm = form.elements.confirm;
      if (input.name === "password" && confirm && confirm.value) validateInput(confirm);
    });
  });
}

// Nút con mắt: hiện / ẩn mật khẩu
function attachPasswordToggles() {
  document.querySelectorAll(".toggle-pw").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.parentElement.querySelector("input");
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.classList.toggle("on", show);
      btn.setAttribute("aria-label", show ? "Ẩn mật khẩu" : "Hiện mật khẩu");
    });
  });
}

// ---------------------------------------------------------------
// 5) GỬI FORM
// ---------------------------------------------------------------
function setLoading(btn, text) {
  const label = btn.querySelector(".btn-label");
  btn.disabled = true;
  btn.dataset.oldText = label.textContent;
  label.textContent = text;
}

function stopLoading(btn) {
  btn.disabled = false;
  btn.querySelector(".btn-label").textContent = btn.dataset.oldText;
}

// Lỗi chung của cả form (vd: mất kết nối máy chủ)
function showFormError(form, message) {
  const el = form.querySelector(".form-error");
  if (el) el.textContent = message || "";
}

// Backend trả lỗi dạng { field: "email", message: "..." } thì gắn vào đúng ô
function handleServerError(form, data, fallback) {
  const input = data.field && form.elements[data.field];
  if (input) {
    setFieldError(input, data.message || fallback);
    input.focus();
  } else {
    showFormError(form, data.message || fallback);
  }
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

// Đăng ký: gửi thông tin tài khoản kèm lựa chọn onboarding
async function registerWithEmail(form) {
  showFormError(form, "");
  if (!validateForm(form)) return;

  const btn = form.querySelector('button[type="submit"]');
  setLoading(btn, "Đang tạo tài khoản...");

  const f = form.elements;
  const newUser = {
    fullName: f.fullName.value.trim(),
    email: f.email.value.trim().toLowerCase(),
    gender: f.gender ? f.gender.value : "",
    createdAt: new Date().toISOString(),   // ngày đăng ký tài khoản
    bio: ""
  };

  if (DEMO_MODE) {
    saveUser(newUser);
    setTimeout(() => (window.location.href = ROUTES.success), 700);
    return;
  }

  const a = getAnswers();
  try {
    const { ok, data } = await postJSON(ROUTES.register, {
      full_name: f.fullName.value.trim(),
      gender: f.gender.value,
      email: f.email.value.trim().toLowerCase(),
      password: f.password.value,
      goal: a.goal || "",
      level: a.level || "",
      days_per_week: a.daysPerWeek || ""
    });
    if (ok) {
      saveUser(userFromServer(data.user, newUser), data.access_token);
      window.location.href = ROUTES.success;
    } else {
      handleServerError(form, data, "Không tạo được tài khoản. Thử lại nhé.");
      stopLoading(btn);
    }
  } catch (err) {
    showFormError(form, "Không kết nối được máy chủ. Thử lại sau nhé.");
    stopLoading(btn);
  }
}

// Đăng nhập: tài khoản đã có, vào thẳng Tổng quan
async function loginWithEmail(form) {
  showFormError(form, "");
  if (!validateForm(form)) return;

  const btn = form.querySelector('button[type="submit"]');
  setLoading(btn, "Đang đăng nhập...");

  const f = form.elements;
  const email = f.email.value.trim().toLowerCase();

  if (DEMO_MODE) {
    // chưa có backend: giữ thông tin cũ nếu cùng gmail, nếu không thì tạo tạm
    let old = null;
    try { old = JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch (err) {}
    if (!old || old.email !== email) {
      saveUser({ fullName: email.split("@")[0], email, createdAt: new Date().toISOString(), bio: "" });
    }
    setTimeout(() => (window.location.href = ROUTES.overview), 700);
    return;
  }

  try {
    const { ok, data } = await postJSON(ROUTES.login, {
      email: f.email.value.trim().toLowerCase(),
      password: f.password.value
    });
    if (ok) {
      saveUser(userFromServer(data.user, { email, fullName: email.split("@")[0], createdAt: new Date().toISOString() }), data.access_token);
      window.location.href = ROUTES.overview;
    } else {
      handleServerError(form, data, "Sai mật khẩu. Vui lòng thử lại.");
      stopLoading(btn);
    }
  } catch (err) {
    showFormError(form, "Không kết nối được máy chủ. Thử lại sau nhé.");
    stopLoading(btn);
  }
}

// ---------------------------------------------------------------
// 6) GẮN SỰ KIỆN
// ---------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  fillSummary();
  attachPasswordToggles();

  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    attachLiveValidation(registerForm);
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      registerWithEmail(registerForm);
    });
  }

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    attachLiveValidation(loginForm);
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      loginWithEmail(loginForm);
    });
  }

  // Trang thành công: tài khoản đã lưu lựa chọn, xoá bản tạm trên trình duyệt
  if (document.body.dataset.page === "success" && !DEMO_MODE) {
    try { localStorage.removeItem(STORAGE_KEY); } catch (err) {}
  }
});