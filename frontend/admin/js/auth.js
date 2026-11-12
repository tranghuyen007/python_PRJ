/**
 * auth.js — Xử lý đăng nhập / đăng ký / quên mật khẩu
 * English Vocabbit Admin Panel
 *
 * Lưu ý: đây là phiên bản frontend demo sử dụng localStorage.
 * Trong môi trường thực, thay thế các hàm giả lập bằng
 * lời gọi API thực (fetch/axios) đến backend FastAPI.
 */

"use strict";

/* ================================================================
   HẰNG SỐ / CẤU HÌNH
================================================================ */

const STORAGE_KEY_USERS = "vocabbit_admin_users";
const STORAGE_KEY_SESSION = "vocabbit_admin_session";
const ADMIN_DASHBOARD = "index.html";   // Trang admin sau khi đăng nhập

/* ================================================================
   TIỆN ÍCH
================================================================ */

/** Hiển thị / ẩn panel */
function showPanel(id) {
    ["panel-login", "panel-register", "panel-forgot"].forEach(function (pid) {
        document.getElementById(pid).classList.toggle("hidden", pid !== id);
    });
}

/** Lấy danh sách user từ localStorage */
function getUsers() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY_USERS)) || [];
    } catch (_) {
        return [];
    }
}

/** Lưu danh sách user vào localStorage */
function saveUsers(users) {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
}

/** Băm mật khẩu đơn giản (chỉ demo — dùng bcrypt hoặc API thực) */
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + "vocabbit_salt_2026");
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/** Xác thực email cơ bản */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Kiểm tra độ mạnh mật khẩu → trả về {score: 0-4, label} */
function checkPasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const labels = ["", "Yếu", "Trung bình", "Mạnh", "Rất mạnh"];
    const classes = ["", "weak", "fair", "good", "strong"];
    return { score, label: labels[score], cls: classes[score], pct: score * 25 };
}

/** Đặt thông báo lỗi cho trường nhập */
function setError(id, message) {
    const el = document.getElementById(id);
    if (el) el.textContent = message;
}

/** Xóa tất cả thông báo lỗi trong form */
function clearErrors(errorIds) {
    errorIds.forEach(id => setError(id, ""));
}

/** Gán / gỡ class invalid cho input */
function markInput(inputId, isInvalid) {
    const el = document.getElementById(inputId);
    if (!el) return;
    el.classList.toggle("invalid", isInvalid);
    el.classList.toggle("valid", !isInvalid && el.value !== "");
}

/** Tạo toast thông báo */
function showToast(type, title, message) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const icons = { success: "✓", error: "✕", warning: "⚠" };
    const toast = document.createElement("div");
    toast.className = "toast " + type;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || "ℹ"}</span>
        <div class="toast-content">
            <p class="toast-title">${title}</p>
            <p class="toast-message">${message}</p>
        </div>
        <button class="toast-close" title="Đóng">×</button>
    `;

    toast.querySelector(".toast-close").addEventListener("click", () => toast.remove());
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4500);
}

/** Bật / tắt trạng thái loading của nút */
function setLoading(btnId, spinnerId, loading) {
    const btn = document.getElementById(btnId);
    const spinner = document.getElementById(spinnerId);
    if (!btn || !spinner) return;
    btn.disabled = loading;
    spinner.classList.toggle("hidden", !loading);
}

/** Giả lập độ trễ mạng (xóa khi tích hợp API thực) */
function fakeDelay(ms = 800) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/* ================================================================
   KIỂM TRA SESSION KHI TẢI TRANG
================================================================ */

(function checkSession() {
    const session = localStorage.getItem(STORAGE_KEY_SESSION);
    if (session) {
        // Đã đăng nhập → chuyển thẳng vào admin
        window.location.replace(ADMIN_DASHBOARD);
    }
})();

/* ================================================================
   CHUYỂN ĐỔI PANEL
================================================================ */

document.getElementById("goto-register").addEventListener("click", () => showPanel("panel-register"));
document.getElementById("goto-login").addEventListener("click", () => showPanel("panel-login"));
document.getElementById("goto-forgot").addEventListener("click", () => {
    showPanel("panel-forgot");
    // Reset về bước 1
    document.getElementById("forgot-step-1").classList.remove("hidden");
    document.getElementById("forgot-step-2").classList.add("hidden");
    document.getElementById("forgot-form").reset();
});
document.getElementById("back-from-forgot").addEventListener("click", () => showPanel("panel-login"));

/* ================================================================
   HIỆN / ẨN MẬT KHẨU
================================================================ */

document.querySelectorAll(".btn-toggle-pw").forEach(function (btn) {
    btn.addEventListener("click", function () {
        const input = document.getElementById(btn.dataset.target);
        if (!input) return;
        const isText = input.type === "text";
        input.type = isText ? "password" : "text";
        btn.textContent = isText ? "👁" : "🙈";
    });
});

/* ================================================================
   ĐĂNG NHẬP
================================================================ */

const loginForm = document.getElementById("login-form");

loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const remember = document.getElementById("login-remember").checked;

    clearErrors(["login-email-error", "login-password-error"]);

    let hasError = false;

    if (!isValidEmail(email)) {
        setError("login-email-error", "Vui lòng nhập địa chỉ email hợp lệ.");
        markInput("login-email", true);
        hasError = true;
    } else {
        markInput("login-email", false);
    }

    if (password.length < 1) {
        setError("login-password-error", "Vui lòng nhập mật khẩu.");
        markInput("login-password", true);
        hasError = true;
    }

    if (hasError) return;

    setLoading("btn-login", "login-spinner", true);

    try {
        // Gọi đúng URL từ Swagger
        const res = await fetch("http://127.0.0.1:8000/auth/login", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json" 
            },
            // Gửi "identifier" và "password" đúng chuẩn Swagger yêu cầu
            body: JSON.stringify({ 
                identifier: email, 
                password: password 
            })
        });

        const data = await res.json();
        
        // Nếu Backend báo lỗi (sai tài khoản/mật khẩu)
        if (!res.ok) {
            setError("login-password-error", data.detail || "Tài khoản hoặc mật khẩu không đúng.");
            markInput("login-password", true);
            return;
        }

        // Lưu thông tin phiên đăng nhập (kèm Token & hạn 30 phút)
        const EXPIRE_IN_MS = 30 * 60 * 1000; // 30 phút tính bằng millisecond
        const sessionData = {
            token: data.access_token || data.token,
            email: email,
            name: "Quản trị viên",
            expiresAt: Date.now() + EXPIRE_IN_MS // Lưu thời điểm hết hạn
        };
        
        if (remember) {
            localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(sessionData));
        } else {
            sessionStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(sessionData));
        }

        showToast("success", "Đăng nhập thành công", "Đang chuyển hướng...");
        setTimeout(() => window.location.replace(ADMIN_DASHBOARD), 900);
        
    } catch (err) {
        console.error("Lỗi mạng:", err);
        showToast("error", "Lỗi kết nối", "Không thể kết nối máy chủ Python.");
    } finally {
        setLoading("btn-login", "login-spinner", false);
    }
});

/* ================================================================
   ĐĂNG KÝ
================================================================ */

const regPasswordInput = document.getElementById("reg-password");
const strengthFill = document.getElementById("strength-fill");
const strengthLabel = document.getElementById("strength-label");

// Cập nhật thanh độ mạnh mật khẩu
regPasswordInput.addEventListener("input", function () {
    const result = checkPasswordStrength(this.value);
    strengthFill.style.width = result.pct + "%";
    strengthFill.className = "strength-fill " + result.cls;
    strengthLabel.textContent = result.label;
    strengthLabel.style.color = result.pct >= 75 ? "#22c55e"
        : result.pct >= 50 ? "#3b82f6"
            : result.pct >= 25 ? "#f59e0b"
                : "#ef4444";
});

const registerForm = document.getElementById("register-form");

registerForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const name = document.getElementById("reg-name").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value;
    const confirm = document.getElementById("reg-confirm").value;

    clearErrors(["reg-name-error", "reg-email-error", "reg-password-error", "reg-confirm-error"]);

    let hasError = false;

    if (name.length < 2) {
        setError("reg-name-error", "Vui lòng nhập họ tên (tối thiểu 2 ký tự).");
        markInput("reg-name", true);
        hasError = true;
    } else {
        markInput("reg-name", false);
    }

    if (!isValidEmail(email)) {
        setError("reg-email-error", "Vui lòng nhập địa chỉ email hợp lệ.");
        markInput("reg-email", true);
        hasError = true;
    } else {
        markInput("reg-email", false);
    }

    const strength = checkPasswordStrength(password);
    if (password.length < 8) {
        setError("reg-password-error", "Mật khẩu phải có tối thiểu 8 ký tự.");
        markInput("reg-password", true);
        hasError = true;
    } else if (strength.score < 2) {
        setError("reg-password-error", "Mật khẩu quá yếu. Hãy thêm chữ hoa, số hoặc ký tự đặc biệt.");
        markInput("reg-password", true);
        hasError = true;
    } else {
        markInput("reg-password", false);
    }

    if (password !== confirm) {
        setError("reg-confirm-error", "Mật khẩu xác nhận không khớp.");
        markInput("reg-confirm", true);
        hasError = true;
    } else {
        markInput("reg-confirm", false);
    }

    if (hasError) return;

    setLoading("btn-register", "register-spinner", true);

    try {
        /* --- GỌI API THỰC ---
        const res = await fetch("/api/admin/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Đăng ký thất bại");
        */

        // ---- Demo: lưu vào localStorage ----
        await fakeDelay();

        const users = getUsers();
        if (users.find(u => u.email === email)) {
            setError("reg-email-error", "Email này đã được sử dụng.");
            markInput("reg-email", true);
            return;
        }

        const hash = await hashPassword(password);
        users.push({ name, email, password: hash, createdAt: new Date().toISOString() });
        saveUsers(users);

        showToast("success", "Đăng ký thành công", "Tài khoản đã được tạo. Vui lòng đăng nhập.");
        registerForm.reset();
        strengthFill.style.width = "0";
        strengthLabel.textContent = "";
        setTimeout(() => showPanel("panel-login"), 1200);
    } catch (err) {
        showToast("error", "Lỗi", err.message || "Không thể kết nối máy chủ.");
    } finally {
        setLoading("btn-register", "register-spinner", false);
    }
});

/* ================================================================
   QUÊN MẬT KHẨU — Bước 1: Gửi mã OTP
================================================================ */

let forgotEmail = "";
let otpGenerated = "";
let resendTimer = null;

const forgotForm = document.getElementById("forgot-form");

forgotForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("forgot-email").value.trim();
    clearErrors(["forgot-email-error"]);

    if (!isValidEmail(email)) {
        setError("forgot-email-error", "Vui lòng nhập địa chỉ email hợp lệ.");
        markInput("forgot-email", true);
        return;
    }
    markInput("forgot-email", false);

    setLoading("btn-forgot", "forgot-spinner", true);

    try {
        /* --- GỌI API THỰC ---
        const res = await fetch("/api/admin/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Gửi mã thất bại");
        */

        await fakeDelay();

        // Demo: kiểm tra email có tồn tại không
        const users = getUsers();
        if (!users.find(u => u.email === email)) {
            setError("forgot-email-error", "Email này chưa được đăng ký trong hệ thống.");
            markInput("forgot-email", true);
            return;
        }

        // Tạo OTP giả 6 chữ số
        forgotEmail = email;
        otpGenerated = String(Math.floor(100000 + Math.random() * 900000));

        // Hiển thị OTP trên console (demo)
        console.info("[Demo OTP]", otpGenerated);
        showToast("warning", "Demo Mode", "Mã OTP của bạn: " + otpGenerated + " (Xem console để lấy mã)");

        document.getElementById("forgot-email-display").textContent = email;
        document.getElementById("forgot-step-1").classList.add("hidden");
        document.getElementById("forgot-step-2").classList.remove("hidden");

        startResendCountdown();
    } catch (err) {
        showToast("error", "Lỗi", err.message || "Không thể gửi mã xác nhận.");
    } finally {
        setLoading("btn-forgot", "forgot-spinner", false);
    }
});

/* ================================================================
   QUÊN MẬT KHẨU — Bước 2: Xác nhận OTP & đặt lại mật khẩu
================================================================ */

const otpForm = document.getElementById("otp-form");

otpForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const otp = document.getElementById("otp-code").value.trim();
    const newPw = document.getElementById("new-password").value;
    const newConfirm = document.getElementById("new-confirm").value;

    clearErrors(["otp-error", "new-password-error", "new-confirm-error"]);

    let hasError = false;

    if (!/^\d{6}$/.test(otp)) {
        setError("otp-error", "Mã OTP gồm đúng 6 chữ số.");
        markInput("otp-code", true);
        hasError = true;
    } else if (otp !== otpGenerated) {
        setError("otp-error", "Mã OTP không đúng. Vui lòng kiểm tra lại.");
        markInput("otp-code", true);
        hasError = true;
    } else {
        markInput("otp-code", false);
    }

    if (newPw.length < 8) {
        setError("new-password-error", "Mật khẩu phải có tối thiểu 8 ký tự.");
        markInput("new-password", true);
        hasError = true;
    } else {
        markInput("new-password", false);
    }

    if (newPw !== newConfirm) {
        setError("new-confirm-error", "Mật khẩu xác nhận không khớp.");
        markInput("new-confirm", true);
        hasError = true;
    } else {
        markInput("new-confirm", false);
    }

    if (hasError) return;

    setLoading("btn-reset", "reset-spinner", true);

    try {
        /* --- GỌI API THỰC ---
        const res = await fetch("/api/admin/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: forgotEmail, otp, new_password: newPw })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Đặt lại mật khẩu thất bại");
        */

        await fakeDelay();

        const users = getUsers();
        const hash = await hashPassword(newPw);
        const user = users.find(u => u.email === forgotEmail);
        if (user) {
            user.password = hash;
            saveUsers(users);
        }

        showToast("success", "Thành công", "Mật khẩu đã được đặt lại. Vui lòng đăng nhập.");
        otpForm.reset();
        otpGenerated = "";
        forgotEmail = "";
        clearResendCountdown();
        setTimeout(() => showPanel("panel-login"), 1200);
    } catch (err) {
        showToast("error", "Lỗi", err.message || "Không thể đặt lại mật khẩu.");
    } finally {
        setLoading("btn-reset", "reset-spinner", false);
    }
});

/* ================================================================
   GỬI LẠI OTP & ĐẾM NGƯỢC
================================================================ */

function startResendCountdown(seconds = 60) {
    const btn = document.getElementById("btn-resend");
    const countdown = document.getElementById("resend-countdown");
    btn.disabled = true;
    let remaining = seconds;

    resendTimer = setInterval(function () {
        remaining--;
        countdown.textContent = "(" + remaining + "s)";
        if (remaining <= 0) {
            clearResendCountdown();
        }
    }, 1000);
}

function clearResendCountdown() {
    if (resendTimer) {
        clearInterval(resendTimer);
        resendTimer = null;
    }
    const btn = document.getElementById("btn-resend");
    const countdown = document.getElementById("resend-countdown");
    if (btn) btn.disabled = false;
    if (countdown) countdown.textContent = "";
}

document.getElementById("btn-resend").addEventListener("click", async function () {
    if (!forgotEmail) return;

    otpGenerated = String(Math.floor(100000 + Math.random() * 900000));
    console.info("[Demo OTP Resend]", otpGenerated);
    showToast("warning", "Đã gửi lại", "Mã OTP mới: " + otpGenerated + " (Xem console)");
    startResendCountdown();
});

