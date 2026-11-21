"use strict";

const Pages = {
  learn: {
    title: "Học từ mới",
    render() {
      return `
        <div class="learn">
          <div class="lp-head">
            <div class="lp-levels">
              <p class="section-label">Chọn cấp độ</p>
              <div id="learn-levels" class="level-tabs" role="tablist"></div>
            </div>
            <div class="total-card">
              <p>Tiến độ cấp độ</p>
              <b id="totalWords">0 / 0 từ</b>
              <div class="total-row">
                <div class="bar"><span id="totalBar"></span></div>
                <small id="totalPct">0%</small>
              </div>
            </div>
          </div>
          <div id="learn-message" class="notice"></div>
          <section id="level-summary" class="level-card"></section>
          <div id="learn-content" class="tp-list"></div>
        </div>
      `;
    },
    mount() { LessonPage.mountLearning(); }
  },
  placement: {
    title: "Bài kiểm tra vượt cấp",
    menu: "learn",
    render() {
      return `
        <div class="learn">
          <a href="#learn" class="link">← Quay lại bài học</a>
          <h1 class="page-title">Bài kiểm tra vượt cấp</h1>
          <p class="page-sub">Bài trắc nghiệm từ vựng được tạo từ nội dung của cấp độ.</p>
          <div id="placement-content" class="card"></div>
        </div>
      `;
    },
    mount(levelId) { LessonPage.mountPlacementTest(levelId); }
  },
  "quick-review": {
    title: "Ôn tập nhanh",
    menu: "review",
    render() {
      return `
        <div class="learn">
          <a href="#learn" class="link">← Quay lại bài học</a>
          <h1 class="page-title">Ôn tập nhanh</h1>
          <p class="page-sub">Ôn ngẫu nhiên các từ bạn đã đánh dấu đã học trong từng chủ đề.</p>
          <div id="quick-review-content" class="card"></div>
        </div>
      `;
    },
    mount(topicId) { LessonPage.mountQuickReview(topicId); }
  },
  review: {
    title: "Ôn tập",
    render() {
      return `
        <div class="learn">
          <h1 class="page-title">Ôn tập</h1>
          <p class="page-sub">Chọn một chủ đề để ôn lại những từ bạn đã học.</p>
          <div id="quick-review-content" class="card"></div>
        </div>
      `;
    },
    mount() { LessonPage.mountQuickReview(); }
  },
  pronounce: {
    title: "Luyện phát âm",
    render() {
      return `
        <h1 class="page-title">Luyện phát âm</h1>
        <p class="page-sub">Tính năng mở rộng sẽ được kết nối trong phiên bản sau.</p>
        <div class="card empty-card">
          <img src="../assets/images/rabbit_welcome.png" alt="">
          <h3>Đang được phát triển</h3>
          <p>Hiện tại bạn có thể nghe phát âm từ vựng bằng nút loa trong danh sách bài học.</p>
          <a href="#learn" class="btn-primary">Về Học từ mới</a>
        </div>
      `;
    }
  },
  profile: {
    title: "Hồ sơ",
    render() {
      return `
        <div class="learn">
          <h1 class="page-title">Hồ sơ</h1>
          <p class="page-sub">Thông tin tài khoản học tập của bạn.</p>
          <div id="profile-content" class="card"></div>
        </div>
      `;
    },
    mount() { LessonPage.mountProfile(); }
  }
};
