"use strict";

const API_BASE_URL = "http://127.0.0.1:8000";
const STORAGE_KEY_SESSION = "vocabbit_admin_session";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("login-form");
    const registerLink = document.getElementById("goto-register");
    const forgotLink = document.getElementById("goto-forgot");
    if (registerLink) registerLink.closest(".auth-switch").hidden = true;
    if (forgotLink) forgotLink.hidden = true;
    document.querySelectorAll("#panel-register, #panel-forgot").forEach(panel => panel.remove());
    document.querySelectorAll(".btn-toggle-pw").forEach(button => {
        button.addEventListener("click", () => {
            const input = document.getElementById(button.dataset.target);
            if (input) input.type = input.type === "password" ? "text" : "password";
        });
    });
    if (!form) return;

    form.addEventListener("submit", async event => {
        event.preventDefault();
        const email = document.getElementById("login-email").value.trim().toLowerCase();
        const password = document.getElementById("login-password").value;
        const errorEl = document.getElementById("login-password-error");
        const button = document.getElementById("btn-login");
        const label = button.querySelector(".btn-text");
        const spinner = document.getElementById("login-spinner");
        errorEl.textContent = "";
        button.disabled = true;
        if (label) label.textContent = "Đang đăng nhập...";
        if (spinner) spinner.classList.remove("hidden");
        try {
            const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier: email, password })
            });
            const loginData = await loginResponse.json();
            if (!loginResponse.ok) throw new Error(loginData.detail || "Email hoặc mật khẩu không đúng.");
            if (typeof loginData.access_token !== "string" || !loginData.access_token) {
                throw new Error("Máy chủ không trả về mã đăng nhập hợp lệ.");
            }
            const profileResponse = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${loginData.access_token}` }
            });
            const profile = await profileResponse.json();
            if (!profileResponse.ok) throw new Error(profile.detail || "Không xác thực được tài khoản.");
            if (!profile || !Number.isInteger(profile.user_id) || !profile.role) {
                throw new Error("Máy chủ trả về thông tin tài khoản không hợp lệ.");
            }
            if (profile.role !== "ADMIN") throw new Error("Tài khoản này không có quyền quản trị.");
            const session = JSON.stringify({
                token: loginData.access_token,
                name: profile.full_name || profile.username || "Quản trị viên"
            });
            const remember = document.getElementById("login-remember").checked;
            (remember ? localStorage : sessionStorage).setItem(STORAGE_KEY_SESSION, session);
            window.location.replace("index.html");
        } catch (error) {
            errorEl.textContent = error.message || "Không thể kết nối máy chủ.";
            console.error(error);
            button.disabled = false;
            if (label) label.textContent = "Đăng nhập";
            if (spinner) spinner.classList.add("hidden");
        }
    });
});
