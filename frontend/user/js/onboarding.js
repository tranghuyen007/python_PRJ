// ===== onboarding.js =====
// 3 câu hỏi giúp Vocabbit hiểu mục đích, trình độ và thời gian học của người dùng.
// Muốn thêm/sửa câu hỏi chỉ cần sửa mảng `steps` bên dưới.

const steps = [
  {
    key: "goal",
    title: "Bạn muốn học từ vựng để làm gì?",
    columns: 3,
    options: [
      { value: "study",   title: "Học tập",          desc: "Vững từ vựng, học tốt hơn" },
      { value: "work",    title: "Công việc",        desc: "Tự tin trong môi trường quốc tế" },
      { value: "travel",  title: "Du lịch",          desc: "Khám phá thế giới dễ dàng hơn" },
      { value: "talk",    title: "Giao tiếp tự tin", desc: "Kết nối và trò chuyện tự nhiên" },
      { value: "hobby",   title: "Sở thích",         desc: "Hiểu phim, nhạc và điều mình thích" },
      { value: "explore", title: "Khám phá thêm",    desc: "Học điều mới vì mình muốn thế" }
    ],
    nextLabel: "Tiếp tục"
  },
  {
    key: "level",
    title: "Vốn từ tiếng Anh của bạn thế nào?",
    columns: 2,
    options: [
      { value: "A0", title: "Mới bắt đầu · A0",        desc: "Mình mới làm quen với tiếng Anh." },
      { value: "A1", title: "Cơ bản · A1",             desc: "Mình biết một số từ và câu quen thuộc." },
      { value: "A2", title: "Sơ trung cấp · A2",       desc: "Mình hiểu được các tình huống hằng ngày." },
      { value: "B1", title: "Trung cấp trở lên · B1+", desc: "Mình muốn mở rộng và dùng từ linh hoạt hơn." }
    ],
    tip: "Đây không phải bài kiểm tra. Vocabbit sẽ đồng hành từ những từ bạn thấy quen thuộc.",
    nextLabel: "Tiếp tục"
  },
    {
    key: "daysPerWeek",
    title: "Mỗi tuần, bạn có thể học bao nhiêu ngày?",
    columns: 4,
    options: [
      { value: "2", title: "2 ngày", desc: "Nhẹ nhàng, không áp lực" },
      { value: "3", title: "3 ngày", desc: "Cách ngày một buổi" },
      { value: "5", title: "5 ngày", desc: "Gần như mỗi ngày", badge: "Gợi ý cho bạn" },
      { value: "7", title: "7 ngày", desc: "Giữ chuỗi học liên tục" }
    ],
    tip: "5 ngày mỗi tuần là nhịp vừa sức. Bạn có thể điều chỉnh sau trong Hồ sơ.",
    nextLabel: "Tạo tài khoản Vocabbit"
  }
];

const answers = {};   // { goal: "talk", level: "A1", daysPerWeek: "5" }
let current = 0;

const $ = (id) => document.getElementById(id);

// ----- Vẽ câu hỏi hiện tại -----
function render() {
  const step = steps[current];

  if (answers[step.key] === undefined && step.defaultValue) {
    answers[step.key] = step.defaultValue;
  }

  // Thanh tiến trình
  $("progressFill").style.width = ((current + 1) / steps.length) * 100 + "%";
  $("progressCount").textContent = `${current + 1} / ${steps.length}`;

  // Tiêu đề
  $("eyebrow").textContent = step.eyebrow;
  $("qTitle").textContent = step.title;
  $("qSubtitle").textContent = step.subtitle;

  // Các thẻ lựa chọn
  const box = $("options");
  box.style.setProperty("--cols", step.columns);
  box.innerHTML = step.options.map((o) => {
    const on = answers[step.key] === o.value;
    return `
      <button type="button" class="option ${on ? "selected" : ""}"
              role="radio" aria-checked="${on}" data-value="${o.value}">
        <span class="option-check"></span>
        <span class="option-title">${o.title}</span>
        <span class="option-desc">${o.desc}</span>
        ${o.badge ? `<span class="option-badge">${o.badge}</span>` : ""}
      </button>`;
  }).join("");

  // Câu động viên (chỉ bước 3 có)
  $("encourage").hidden = !step.encourage;
  $("encourageText").textContent = step.encourage || "";

  // Gợi ý & thanh dưới
  if ($("tipText")) $("tipText").textContent = step.tip || "";
  $("footTitle").textContent = step.footTitle;
  $("footSub").textContent = step.footSub;
  $("btnNextText").textContent = step.nextLabel;

  updateNextButton();

  // Hiệu ứng chuyển bước
  const q = $("question");
  q.classList.remove("fade-in");
  void q.offsetWidth; // khởi động lại animation
  q.classList.add("fade-in");
}

function updateNextButton() {
  $("btnNext").disabled = !answers[steps[current].key];
}

// ----- Chọn một thẻ -----
$("options").addEventListener("click", (e) => {
  const card = e.target.closest(".option");
  if (!card) return;

  answers[steps[current].key] = card.dataset.value;

  document.querySelectorAll(".option").forEach((c) => {
    const on = c === card;
    c.classList.toggle("selected", on);
    c.setAttribute("aria-checked", on);
  });

  updateNextButton();
});

// ----- Nút Tiếp tục -----
$("btnNext").addEventListener("click", () => {
  if (!answers[steps[current].key]) return;

  if (current < steps.length - 1) {
    current++;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    finish();
  }
});

// ----- Nút Quay lại -----
$("btnBack").addEventListener("click", () => {
  if (current > 0) {
    current--;
    render();
  } else {
    window.location.href = "welcome.html";
  }
});

// ----- Hoàn tất: lưu tạm câu trả lời rồi sang trang đăng ký -----
function finish() {
  try {
    localStorage.setItem("vocabbit_onboarding", JSON.stringify(answers));
  } catch (err) {
    // trình duyệt chặn localStorage thì bỏ qua, không làm hỏng trang
  }
  // register.html đọc lại "vocabbit_onboarding" để hiển thị và gửi lên backend
  window.location.href = "register.html";
}

document.addEventListener("DOMContentLoaded", render);