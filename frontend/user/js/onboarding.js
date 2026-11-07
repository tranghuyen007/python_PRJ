// ===== onboarding.js =====
// 3 câu hỏi giúp Vocabbit hiểu mục đích, trình độ và thời gian học của người dùng.
// Muốn thêm/sửa câu hỏi chỉ cần sửa mảng `steps` bên dưới.

const steps = [
  {
    key: "goal",
    eyebrow: "Hiểu bạn hơn",
    title: "Bạn muốn học từ vựng để làm gì?",
    subtitle: "Chọn lý do phù hợp nhất. Vocabbit sẽ gợi ý chủ đề gần với bạn.",
    columns: 3,
    options: [
      { value: "study",   icon: "📚", color: "#f1ecfd", title: "Học tập",          desc: "Vững từ vựng, học tốt hơn" },
      { value: "work",    icon: "💼", color: "#fdf1e6", title: "Công việc",        desc: "Tự tin trong môi trường quốc tế" },
      { value: "travel",  icon: "✈️", color: "#e8f1fd", title: "Du lịch",          desc: "Khám phá thế giới dễ dàng hơn" },
      { value: "talk",    icon: "💬", color: "#eef4fd", title: "Giao tiếp tự tin", desc: "Kết nối và trò chuyện tự nhiên" },
      { value: "hobby",   icon: "🎧", color: "#f1ecfd", title: "Sở thích",         desc: "Hiểu phim, nhạc và điều mình thích" },
      { value: "explore", icon: "🧭", color: "#e8f6ee", title: "Khám phá thêm",    desc: "Học điều mới vì mình muốn thế" }
    ],
    //tip: "Không có lựa chọn đúng hay sai. Bạn có thể đổi mục tiêu bất cứ lúc nào.",
    footTitle: "Một lựa chọn nhỏ, một lộ trình phù hợp hơn.",
    footSub: "Tiếp theo: trình độ hiện tại",
    nextLabel: "Tiếp tục"
  },
  {
    key: "level",
    eyebrow: "Điểm xuất phát",
    title: "Vốn từ tiếng Anh của bạn thế nào?",
    subtitle: "Chọn mức gần với bạn nhất để bắt đầu vừa sức, không áp lực.",
    columns: 2,
    options: [
      { value: "A0", icon: "🌱", color: "#e8f6ee", title: "Mới bắt đầu · A0",        desc: "Mình mới làm quen với tiếng Anh." },
      { value: "A1", icon: "🌿", color: "#e8f6ee", title: "Cơ bản · A1",             desc: "Mình biết một số từ và câu quen thuộc." },
      { value: "A2", icon: "🌳", color: "#e8f6ee", title: "Sơ trung cấp · A2",       desc: "Mình hiểu được các tình huống hằng ngày." },
      { value: "B1", icon: "🚀", color: "#f1ecfd", title: "Trung cấp trở lên · B1+", desc: "Mình muốn mở rộng và dùng từ linh hoạt hơn." }
    ],
    tip: "Đây không phải bài kiểm tra. Vocabbit sẽ đồng hành từ những từ bạn thấy quen thuộc.",
    footTitle: "Một lựa chọn nhỏ, một lộ trình phù hợp hơn.",
    footSub: "Tiếp theo: số ngày học mỗi tuần",
    nextLabel: "Tiếp tục"
  },
    {
    key: "daysPerWeek",
    eyebrow: "Nhịp học mỗi tuần",
    title: "Mỗi tuần, bạn có thể học bao nhiêu ngày?",
    subtitle: "Chọn số ngày bạn thấy thoải mái. Đều đặn quan trọng hơn học dồn.",
    columns: 4,
    defaultValue: "5", // chọn sẵn mức được gợi ý
    options: [
      { value: "2", icon: "🌱", color: "#e8f6ee", title: "2 ngày", desc: "Nhẹ nhàng, không áp lực" },
      { value: "3", icon: "📅", color: "#fdf6e3", title: "3 ngày", desc: "Cách ngày một buổi" },
      { value: "5", icon: "🎯", color: "#fdecec", title: "5 ngày", desc: "Gần như mỗi ngày", badge: "Gợi ý cho bạn" },
      { value: "7", icon: "🔥", color: "#f1ecfd", title: "7 ngày", desc: "Giữ chuỗi học liên tục" }
    ],
    encourage: "Không cần học thật nhiều. Chỉ cần giữ nhịp đều mỗi tuần.",
    tip: "5 ngày mỗi tuần là nhịp vừa sức. Bạn có thể điều chỉnh sau trong Hồ sơ.",
    footTitle: "Bạn đã hoàn tất 3 câu hỏi!",
    footSub: "Tiếp theo: tạo tài khoản để lưu lộ trình của bạn",
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
        <span class="option-icon" style="background:${o.color}">${o.icon}</span>
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