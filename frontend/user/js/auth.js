"use strict";

const API_BASE_URL = "http://127.0.0.1:8000";
const TOKEN_KEY = "vocabbit_token";
const USER_KEY = "vocabbit_user";

function showError(form, message) {
  const element = form.querySelector(".form-error");
  if (element) element.textContent = message;
}

function attachPasswordToggles() {
  document.querySelectorAll(".toggle-pw").forEach(button => {
    button.addEventListener("click", () => {
      const input = button.parentElement.querySelector("input");
      input.type = input.type === "password" ? "text" : "password";
    });
  });
}

async function requestJSON(path, body) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) {
    const detail = data.detail;
    throw new Error(typeof detail === "string" ? detail : `Yêu cầu thất bại (${response.status}).`);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Máy chủ trả về dữ liệu không hợp lệ.");
  }
  return data;
}

async function login(email, password) {
  const result = await requestJSON("/auth/login", { identifier: email, password });
  if (typeof result.access_token !== "string" || !result.access_token) {
    throw new Error("Máy chủ không trả về mã đăng nhập hợp lệ.");
  }
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${result.access_token}` }
  });
  const profile = await response.json();
  if (!response.ok) throw new Error(profile.detail || "Không xác thực được tài khoản.");
  if (!profile || !Number.isInteger(profile.user_id) || !profile.role) {
    throw new Error("Máy chủ trả về thông tin tài khoản không hợp lệ.");
  }
  if (profile.role !== "USER") {
    throw new Error("Tài khoản quản trị không thể đăng nhập vào khu vực học viên.");
  }
  localStorage.setItem(TOKEN_KEY, result.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify({
    fullName: profile.full_name || profile.username,
    email: profile.email
  }));
}

document.addEventListener("DOMContentLoaded", () => {
  attachPasswordToggles();

  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async event => {
      event.preventDefault();
      showError(registerForm, "");
      const fields = registerForm.elements;
      const fullName = fields.fullName.value.trim();
      const email = fields.email.value.trim().toLowerCase();
      const password = fields.password.value;
      if (!fullName || !email || password.length < 9 || password !== fields.confirm.value) {
        showError(registerForm, "Vui lòng kiểm tra tên, email và mật khẩu (tối thiểu 9 ký tự, nhập lại chính xác).");
        return;
      }
      const button = registerForm.querySelector('button[type="submit"]');
      const label = button.querySelector(".btn-label");
      button.disabled = true;
      if (label) label.textContent = "Đang tạo tài khoản...";
      try {
        const createdUser = await requestJSON("/users/", {
          full_name: fullName,
          gender: fields.gender.value || null,
          email,
          password
        });
        if (
          !Number.isInteger(createdUser.user_id)
          || createdUser.role !== "USER"
          || createdUser.email?.toLowerCase() !== email
        ) {
          throw new Error("Máy chủ chưa xác nhận tạo tài khoản. Vui lòng thử lại.");
        }
        window.location.href = "register_success.html";
      } catch (error) {
        console.error(error);
        showError(registerForm, error.message || "Không thể kết nối máy chủ.");
        button.disabled = false;
        if (label) label.textContent = "Tạo tài khoản";
      }
    });
  }

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async event => {
      event.preventDefault();
      showError(loginForm, "");
      const button = loginForm.querySelector('button[type="submit"]');
      const label = button.querySelector(".btn-label");
      button.disabled = true;
      if (label) label.textContent = "Đang đăng nhập...";
      try {
        await login(loginForm.elements.email.value.trim().toLowerCase(), loginForm.elements.password.value);
        window.location.href = "index.html#learn";
      } catch (error) {
        console.error(error);
        showError(loginForm, error.message || "Không thể kết nối máy chủ.");
        button.disabled = false;
        if (label) label.textContent = "Đăng nhập";
      }
    });
  }

  if (document.body.dataset.page === "success") {
    const summary = document.querySelector(".rhythm-card");
    if (summary) summary.remove();
    const topbarLabel = document.querySelector(".topbar-link span");
    if (topbarLabel) topbarLabel.textContent = "Tài khoản đã được tạo";
    const action = document.querySelector(".success-cta");
    if (action) {
      action.href = "login.html";
      action.childNodes[0].textContent = "Đăng nhập để học ";
    }
  }
});
