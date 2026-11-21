"use strict";

const LessonPage = (() => {
  const API_BASE_URL = "http://127.0.0.1:8000";
  const tokenKey = "vocabbit_token";
  let levels = [];
  let activeLevelId = null;
  let activeTopicStates = [];
  const wordCache = new Map();
  const $ = id => document.getElementById(id);
  const icons = {
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>'
  };

  async function api(path, method = "GET", body = null) {
    const token = localStorage.getItem(tokenKey);
    if (!token) {
      window.location.replace("login.html");
      throw new Error("Hãy đăng nhập để tiếp tục.");
    }
    const headers = { Authorization: `Bearer ${token}` };
    const options = { method, headers };
    if (body !== null) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }
    const response = await fetch(`${API_BASE_URL}${path}`, options);
    if (response.status === 401) {
      localStorage.removeItem(tokenKey);
      localStorage.removeItem("vocabbit_user");
      window.location.replace("login.html");
      throw new Error("Phiên đăng nhập đã hết hạn.");
    }
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      const detail = data && data.detail;
      throw new Error(typeof detail === "string" ? detail : `Yêu cầu thất bại (${response.status}).`);
    }
    return data;
  }

  function showMessage(element, message, isError = false) {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("error", isError);
  }

  function makeButton(text, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    button.addEventListener("click", handler);
    return button;
  }

  function renderLevelTabs() {
    const root = $("learn-levels");
    root.replaceChildren();
    levels.forEach(level => {
      const button = makeButton(level.name, "level-tab", () => selectLevel(level.level_id));
      button.classList.toggle("active", level.level_id === activeLevelId);
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(level.level_id === activeLevelId));
      if (!level.is_unlocked) {
        button.classList.add("locked");
        button.title = "Cấp độ đang khóa; vượt qua bài kiểm tra để mở khóa.";
        const lock = document.createElement("span");
        lock.innerHTML = icons.lock;
        button.appendChild(lock);
      }
      root.appendChild(button);
    });
  }

  function updateProgressDisplay() {
    const total = activeTopicStates.reduce((sum, state) => sum + state.words.length, 0);
    const learned = activeTopicStates.reduce((sum, state) => sum + state.progress.learned_count, 0);
    const percent = total ? Math.round((learned / total) * 100) : 0;
    $("totalWords").textContent = `${learned} / ${total} từ`;
    $("totalBar").style.width = `${percent}%`;
    $("totalPct").textContent = `${percent}%`;

    activeTopicStates.forEach(state => {
      const topicTotal = state.words.length;
      const topicPercent = topicTotal
        ? Math.round((state.progress.learned_count / topicTotal) * 100)
        : 0;
      const bar = state.element.querySelector(".tp-progress .bar > span");
      const label = state.element.querySelector(".tp-progress small");
      if (bar) bar.style.width = `${topicPercent}%`;
      if (label) label.textContent = `${state.progress.learned_count}/${topicTotal} từ`;
      if (state.reviewButton) {
        state.reviewButton.textContent =
          `Ôn tập nhanh · ${Math.min(state.progress.learned_count, state.topic.quick_review_limit)}`;
        state.reviewButton.disabled = state.progress.learned_count === 0;
      }
      if (state.learnedLabel) {
        state.learnedLabel.textContent = `${state.progress.learned_count} từ đã học`;
      }
    });

    const summary = $("level-summary");
    const summaryBar = summary.querySelector(".bar > span");
    const summaryPercent = summary.querySelector(".lv-pct b");
    const summaryCounts = summary.querySelector(".lv-pct small");
    if (summaryBar) summaryBar.style.width = `${percent}%`;
    if (summaryPercent) summaryPercent.textContent = `${percent}%`;
    if (summaryCounts) summaryCounts.textContent = `${learned}/${total} từ đã học`;
  }

  function renderLevelSummary(level) {
    const summary = $("level-summary");
    summary.classList.toggle("locked", !level.is_unlocked);
    summary.replaceChildren();

    const badge = document.createElement("div");
    badge.className = "lv-badge";
    badge.textContent = level.is_unlocked ? level.name : "";
    if (!level.is_unlocked) badge.innerHTML = icons.lock;

    const info = document.createElement("div");
    info.className = "lv-info";
    const title = document.createElement("h2");
    title.textContent = level.name;
    const description = document.createElement("p");
    description.textContent = level.description || "Chọn một chủ đề để bắt đầu học từ vựng.";
    const progress = document.createElement("div");
    progress.className = "bar";
    const fill = document.createElement("span");
    progress.appendChild(fill);
    info.append(title, description, progress);

    const percent = document.createElement("div");
    percent.className = "lv-pct";
    const number = document.createElement("b");
    number.textContent = "0%";
    const label = document.createElement("small");
    label.textContent = "0/0 từ đã học";
    percent.append(number, label);
    summary.append(badge, info, percent);
  }

  async function selectLevel(levelId) {
    activeLevelId = levelId;
    const level = levels.find(item => item.level_id === levelId);
    renderLevelTabs();
    const content = $("learn-content");
    content.replaceChildren();
    if (!level) return;
    activeTopicStates = [];
    renderLevelSummary(level);
    updateProgressDisplay();

    if (!level.is_unlocked) {
      const lockedPanel = document.createElement("section");
      lockedPanel.className = "locked-panel";
      const icon = document.createElement("span");
      icon.className = "locked-icon";
      icon.innerHTML = icons.lock;
      const message = document.createElement("div");
      const title = document.createElement("b");
      title.textContent = `${level.name} đang bị khóa`;
      const description = document.createElement("p");
      description.textContent = "Vượt qua bài kiểm tra đầu vào để mở các bài học thuộc cấp độ này.";
      message.append(title, description);
      lockedPanel.append(icon, message);
      if (level.placement_test_enabled) {
        lockedPanel.appendChild(makeButton("Làm bài kiểm tra vượt cấp", "btn btn-primary", () => {
          window.location.hash = `#placement/${level.level_id}`;
        }));
      }
      content.appendChild(lockedPanel);
      return;
    }

    try {
      showMessage($("learn-message"), "Đang tải nội dung...");
      const topics = await api(`/levels/${levelId}/topics`);
      $("learn-message").textContent = "";
      if (!topics.length) {
        const empty = document.createElement("p");
        empty.className = "notice";
        empty.textContent = "Cấp độ này hiện chưa có chủ đề.";
        content.appendChild(empty);
        return;
      }

      activeTopicStates = await Promise.all(topics.map(async topic => {
        const [lessons, progress] = await Promise.all([
          api(`/topics/${topic.topic_id}/lessons`),
          api(`/topics/${topic.topic_id}/progress`)
        ]);
        const wordsByLesson = await Promise.all(lessons.map(async lesson => {
          let words = wordCache.get(lesson.lesson_id);
          if (!words) {
            words = await api(`/lessons/${lesson.lesson_id}/words`);
            wordCache.set(lesson.lesson_id, words);
          }
          return { lesson, words };
        }));
        return {
          topic,
          progress,
          lessons: wordsByLesson,
          words: wordsByLesson.flatMap(item => item.words),
          learnedWordIds: new Set(progress.learned_word_ids),
          element: null,
          reviewButton: null
        };
      }));

      activeTopicStates.forEach((state, index) => {
        state.element = renderTopic(state, index);
        content.appendChild(state.element);
      });
      updateProgressDisplay();
    } catch (error) {
      showMessage($("learn-message"), error.message, true);
    }
  }

  function renderTopic(state, index) {
    const section = document.createElement("article");
    section.className = "tp";
    const header = makeButton("", "tp-head", () => {
      const isOpen = section.classList.toggle("open");
      header.setAttribute("aria-expanded", String(isOpen));
      lessonList.hidden = !isOpen;
    });
    header.setAttribute("aria-expanded", "false");

    const info = document.createElement("span");
    info.className = "tp-info";
    const title = document.createElement("span");
    title.className = "tp-title";
    title.textContent = `Chủ đề ${index + 1}: ${state.topic.name}`;
    const tag = document.createElement("span");
    tag.className = "tag tag-soft";
    tag.textContent = `${state.topic.quick_review_limit} câu ôn nhanh`;
    title.appendChild(tag);
    const meta = document.createElement("span");
    meta.className = "tp-meta";
    meta.textContent = state.topic.description || `${state.lessons.length} bài học`;
    const progress = document.createElement("span");
    progress.className = "tp-progress";
    const bar = document.createElement("span");
    bar.className = "bar";
    const fill = document.createElement("span");
    bar.appendChild(fill);
    const count = document.createElement("small");
    progress.append(bar, count);
    info.append(title, meta, progress);

    const chevron = document.createElement("span");
    chevron.className = "tp-chev";
    chevron.innerHTML = icons.chevron;
    header.append(info, chevron);

    const lessonList = document.createElement("div");
    lessonList.className = "lesson-list";
    lessonList.hidden = true;
    if (state.lessons.length) {
      state.lessons.forEach((item, lessonIndex) => {
        lessonList.appendChild(renderLesson(item, lessonIndex, state));
      });
    } else {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "Chủ đề này chưa có bài học.";
      lessonList.appendChild(empty);
    }

    const footer = document.createElement("div");
    footer.className = "tp-foot";
    const lessonCount = document.createElement("span");
    lessonCount.className = "muted";
    lessonCount.textContent = `${state.lessons.length} bài học`;
    state.learnedLabel = document.createElement("span");
    state.learnedLabel.className = "muted";
    state.learnedLabel.textContent = `${state.progress.learned_count} từ đã học`;
    const spacer = document.createElement("span");
    spacer.className = "spacer";
    state.reviewButton = makeButton(
      "",
      "btn btn-sm btn-outline",
      () => { window.location.hash = `#quick-review/${state.topic.topic_id}`; }
    );
    state.reviewButton.disabled = state.progress.learned_count === 0;
    footer.append(lessonCount, state.learnedLabel, spacer, state.reviewButton);
    section.append(header, lessonList, footer);
    return section;
  }

  function renderLesson(item, index, state) {
    const entry = document.createElement("div");
    entry.className = "lesson-entry";
    const row = document.createElement("div");
    row.className = "lesson";

    const learnedCount = item.words.filter(word => state.learnedWordIds.has(word.word_id)).length;
    const percent = item.words.length ? Math.round((learnedCount / item.words.length) * 100) : 0;
    const mark = document.createElement("span");
    mark.className = `ls-mark${item.words.length > 0 && learnedCount === item.words.length ? " done" : ""}`;
    if (mark.classList.contains("done")) mark.innerHTML = icons.check;
    else mark.textContent = String(index + 1);

    const info = document.createElement("div");
    info.className = "ls-info";
    const title = document.createElement("p");
    title.className = "ls-title";
    title.textContent = item.lesson.name;
    const progress = document.createElement("div");
    progress.className = "ls-progress";
    const bar = document.createElement("span");
    bar.className = "bar";
    const fill = document.createElement("span");
    fill.style.width = `${percent}%`;
    bar.appendChild(fill);
    const count = document.createElement("small");
    count.textContent = `${percent}% · ${learnedCount}/${item.words.length} từ`;
    progress.append(bar, count);
    info.append(title, progress);

    const toggle = makeButton("Xem từ", "btn btn-sm btn-outline", () => {
      const existing = entry.querySelector(".word-list");
      if (existing) {
        existing.remove();
        toggle.textContent = "Xem từ";
        return;
      }
      const list = document.createElement("div");
      list.className = "word-list";
      if (!item.words.length) {
        list.textContent = "Bài học này chưa có từ vựng.";
      } else {
        item.words.forEach(word => list.appendChild(renderWord(
          word,
          state.topic.topic_id,
          state.learnedWordIds,
          count => {
            state.progress.learned_count = count;
            updateProgressDisplay();
          }
        )));
      }
      entry.appendChild(list);
      toggle.textContent = "Ẩn từ";
    });
    row.append(mark, info, toggle);
    entry.appendChild(row);
    if (item.lesson.description) {
      const description = document.createElement("p");
      description.className = "lesson-description";
      description.textContent = item.lesson.description;
      entry.appendChild(description);
    }
    return entry;
  }

  function renderWord(word, topicId, learnedWordIds, updateLearnedCount) {
    const item = document.createElement("article");
    item.className = "word-card";
    const title = document.createElement("h3");
    title.textContent = word.word;
    item.appendChild(title);
    if (word.pronunciation) {
      const pronunciation = document.createElement("p");
      pronunciation.textContent = word.pronunciation;
      item.appendChild(pronunciation);
    }
    const meaning = document.createElement("p");
    meaning.textContent = word.meaning;
    item.appendChild(meaning);
    if (word.example) {
      const example = document.createElement("p");
      example.textContent = word.example;
      item.appendChild(example);
    }
    item.appendChild(makeButton("🔊 Phát âm", "btn btn-ghost", () => speak(word.word)));
    const alreadyLearned = learnedWordIds.has(word.word_id);
    const learnedButton = makeButton(
      alreadyLearned ? "Đã học" : "Đánh dấu đã học",
      "btn btn-outline",
      async () => {
        learnedButton.disabled = true;
        try {
          const progress = await api(
            `/topics/${topicId}/words/${word.word_id}/learn`,
            "POST"
          );
          learnedWordIds.add(word.word_id);
          learnedButton.textContent = "Đã học";
          updateLearnedCount(progress.learned_count);
        } catch (error) {
          learnedButton.disabled = false;
          const errorMessage = document.createElement("p");
          errorMessage.className = "error";
          errorMessage.textContent = error.message;
          item.appendChild(errorMessage);
        }
      }
    );
    learnedButton.disabled = alreadyLearned;
    item.appendChild(learnedButton);
    return item;
  }

  function speak(word) {
    if (!("speechSynthesis" in window)) {
      alert("Trình duyệt của bạn không hỗ trợ phát âm thanh.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  async function mountLearning() {
    try {
      showMessage($("learn-message"), "Đang tải cấp độ...");
      levels = await api("/levels");
      renderLevelTabs();
      if (!levels.length) {
        showMessage($("learn-message"), "Chưa có cấp độ nào được cấu hình.");
        return;
      }
      const firstUnlocked = levels.find(level => level.is_unlocked);
      const initial = firstUnlocked || levels[0];
      await selectLevel(initial.level_id);
    } catch (error) {
      showMessage($("learn-message"), error.message, true);
    }
  }

  async function mountProfile() {
    const root = $("profile-content");
    try {
      root.textContent = "Đang tải hồ sơ...";
      const profile = await api("/auth/me");
      root.replaceChildren();
      const name = document.createElement("h2");
      name.textContent = profile.full_name || profile.username;
      const email = document.createElement("p");
      email.className = "page-sub";
      email.textContent = profile.email;
      const account = document.createElement("p");
      account.className = "muted";
      account.textContent = `Vai trò: ${profile.role}`;
      root.append(name, email, account);
    } catch (error) {
      showMessage(root, error.message, true);
    }
  }

  async function mountPlacementTest(levelId) {
    const root = $("placement-content");
    const levelNumber = Number(levelId);
    if (!Number.isInteger(levelNumber) || levelNumber < 1) {
      showMessage(root, "Cấp độ không hợp lệ.", true);
      return;
    }
    try {
      const [access, allLevels] = await Promise.all([
        api(`/levels/${levelNumber}/access`),
        api("/levels")
      ]);
      const level = allLevels.find(item => item.level_id === levelNumber);
      if (!level || !access.placement_test_enabled) {
        showMessage(root, "Cấp độ này không có bài kiểm tra vượt cấp.", true);
        return;
      }
      root.replaceChildren();
      const info = document.createElement("p");
      info.textContent = access.question_count === null
        ? `Bắt đầu bài kiểm tra ${level.name}.`
        : `Bài kiểm tra ${level.name}: ${access.question_count} câu hỏi, cần đúng ít nhất ${access.required_passing_score} câu.`;
      root.appendChild(info);
      root.appendChild(makeButton("Bắt đầu kiểm tra", "btn btn-primary", () => startAttempt(levelNumber, root)));
    } catch (error) {
      showMessage(root, error.message, true);
    }
  }

  async function startAttempt(levelId, root) {
    try {
      root.textContent = "Đang tạo bài kiểm tra...";
      const attempt = await api(`/levels/${levelId}/placement-test/attempts`, "POST");
      const questions = await api(`/placement-test/attempts/${attempt.attempt_id}/questions`);
      if (!questions.length) throw new Error("Bài kiểm tra hiện không có câu hỏi.");
      renderQuestion(attempt, questions, 0, root);
    } catch (error) {
      showMessage(root, error.message, true);
    }
  }

  function renderQuestion(attempt, questions, index, root) {
    const question = questions[index];
    const data = question.question_data;
    root.replaceChildren();
    const counter = document.createElement("p");
    counter.textContent = `Câu ${index + 1} / ${questions.length}`;
    const word = document.createElement("h2");
    word.textContent = data.word;
    const pronunciation = document.createElement("p");
    pronunciation.textContent = data.pronunciation || "";
    root.append(counter, word, pronunciation);
    if (data.pronunciation) {
      root.appendChild(makeButton("🔊 Phát âm", "btn btn-ghost", () => speak(data.word)));
    }
    const options = document.createElement("div");
    options.className = "placement-options";
    data.options.forEach(option => {
      options.appendChild(makeButton(option, "btn btn-outline", async () => {
        options.querySelectorAll("button").forEach(button => { button.disabled = true; });
        try {
          await api(`/placement-test/attempts/${attempt.attempt_id}/questions/${question.item_id}/answer`, "POST", { answer: option });
          if (index + 1 < questions.length) {
            renderQuestion(attempt, questions, index + 1, root);
          } else {
            await completeAttempt(attempt, root);
          }
        } catch (error) {
          showMessage(root, error.message, true);
        }
      }));
    });
    root.appendChild(options);
  }

  async function completeAttempt(attempt, root) {
    try {
      const result = await api(`/placement-test/attempts/${attempt.attempt_id}/complete`, "POST");
      root.replaceChildren();
      const heading = document.createElement("h2");
      heading.textContent = result.passed ? "Bạn đã vượt qua!" : "Bạn chưa đạt yêu cầu";
      const score = document.createElement("p");
      score.textContent = `Kết quả: ${result.correct_answers}/${result.total_questions} câu đúng. Cần ${result.passing_score} câu để đạt.`;
      root.append(heading, score);
      if (result.passed) {
        const message = document.createElement("p");
        message.textContent = "Cấp độ này và các cấp độ thấp hơn đã được mở khóa.";
        root.appendChild(message);
      }
      root.appendChild(makeButton("Quay lại bài học", "btn btn-primary", () => {
        window.location.hash = "#learn";
      }));
    } catch (error) {
      showMessage(root, error.message, true);
    }
  }

  async function mountQuickReview(topicId) {
    const root = $("quick-review-content");
    const topicNumber = Number(topicId);
    if (topicId) {
      if (!Number.isInteger(topicNumber) || topicNumber < 1) {
        showMessage(root, "Chủ đề không hợp lệ.", true);
        return;
      }
      await startQuickReview(topicNumber, root);
      return;
    }

    try {
      showMessage(root, "Đang tải chủ đề...");
      const availableLevels = await api("/levels");
      root.replaceChildren();
      let topicCount = 0;
      for (const level of availableLevels.filter(item => item.is_unlocked)) {
        const topics = await api(`/levels/${level.level_id}/topics`);
        for (const topic of topics) {
          const progress = await api(`/topics/${topic.topic_id}/progress`);
          const card = document.createElement("section");
          card.className = "review-topic";
          const title = document.createElement("h2");
          title.textContent = `${level.name} · ${topic.name}`;
          const count = document.createElement("p");
          count.textContent = `${progress.learned_count} từ đã học · tối đa ${Math.min(
            topic.quick_review_limit,
            progress.learned_count
          )} câu`;
          const button = makeButton(
            "Bắt đầu ôn tập",
            "btn btn-primary",
            () => startQuickReview(topic.topic_id, root)
          );
          button.disabled = progress.learned_count === 0;
          card.append(title, count, button);
          root.appendChild(card);
          topicCount += 1;
        }
      }
      if (topicCount === 0) showMessage(root, "Hiện chưa có chủ đề nào để ôn tập.");
    } catch (error) {
      showMessage(root, error.message, true);
    }
  }

  async function startQuickReview(topicId, root) {
    try {
      showMessage(root, "Đang tạo bài ôn tập...");
      const review = await api(`/topics/${topicId}/quick-review`, "POST");
      renderQuickReviewQuestion(review, 0, 0, root);
    } catch (error) {
      showMessage(root, error.message, true);
    }
  }

  function renderQuickReviewQuestion(review, index, correctCount, root) {
    if (index >= review.items.length) {
      root.replaceChildren();
      const heading = document.createElement("h2");
      heading.textContent = "Hoàn thành ôn tập!";
      const score = document.createElement("p");
      score.textContent = `Bạn trả lời đúng ${correctCount}/${review.total_items} câu.`;
      root.append(heading, score);
      root.appendChild(makeButton("Về danh sách chủ đề", "btn btn-outline", () => {
        window.location.hash = "#quick-review";
      }));
      return;
    }

    const item = review.items[index];
    const question = item.question_data;
    root.replaceChildren();
    const counter = document.createElement("p");
    counter.textContent = `Câu ${index + 1}/${review.total_items}`;
    root.appendChild(counter);

    if (question.kind === "meaning_choice" || question.kind === "meaning_input") {
      const prompt = document.createElement("p");
      prompt.textContent = question.kind === "meaning_choice"
        ? "Chọn nghĩa tiếng Việt đúng."
        : "Nhập nghĩa tiếng Việt của từ.";
      const word = document.createElement("h2");
      word.textContent = question.word;
      root.append(prompt, word);
      if (question.pronunciation) {
        const pronunciation = document.createElement("p");
        pronunciation.textContent = question.pronunciation;
        root.appendChild(pronunciation);
      }
      root.appendChild(makeButton("🔊 Phát âm", "btn btn-ghost", () => speak(question.word)));
    } else {
      const prompt = document.createElement("p");
      prompt.textContent = "Chọn từ tiếng Anh còn thiếu.";
      const sentence = document.createElement("h2");
      sentence.textContent = question.sentence;
      root.append(prompt, sentence);
    }

    if (question.kind === "meaning_input") {
      const input = document.createElement("input");
      input.type = "text";
      input.className = "quiz-input";
      input.autocomplete = "off";
      input.placeholder = "Nhập nghĩa tiếng Việt";
      const submitButton = makeButton("Kiểm tra", "btn btn-primary", () => submit(input.value));
      input.addEventListener("keydown", event => {
        if (event.key === "Enter") submitButton.click();
      });
      root.append(input, submitButton);
    } else {
      const options = document.createElement("div");
      options.className = "placement-options";
      question.options.forEach(option => {
        options.appendChild(makeButton(option, "btn btn-outline", () => submit(option)));
      });
      root.appendChild(options);
    }

    async function submit(answer) {
      if (!answer.trim()) return;
      root.querySelectorAll("input, button").forEach(control => { control.disabled = true; });
      try {
        const result = await api(
          `/review-sessions/${review.review_session_id}/items/${item.item_id}/answer`,
          "POST",
          { answer }
        );
        const feedback = document.createElement("p");
        feedback.textContent = result.is_correct
          ? "Chính xác!"
          : `Chưa đúng. Đáp án: ${result.correct_answer}`;
        feedback.className = result.is_correct ? "review-correct" : "review-incorrect";
        const next = makeButton(
          index + 1 < review.items.length ? "Câu tiếp theo" : "Xem kết quả",
          "btn btn-primary",
          () => renderQuickReviewQuestion(
            review,
            index + 1,
            correctCount + Number(result.is_correct),
            root
          )
        );
        root.append(feedback, next);
      } catch (error) {
        const feedback = document.createElement("p");
        feedback.className = "review-incorrect";
        feedback.textContent = error.message;
        root.appendChild(feedback);
        root.querySelectorAll("input, button").forEach(control => { control.disabled = false; });
      }
    }
  }

  return { mountLearning, mountPlacementTest, mountQuickReview, mountProfile };
})();
