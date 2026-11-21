"use strict";

const API_BASE_URL = "http://127.0.0.1:8000";
const STORAGE_KEY_SESSION = "vocabbit_admin_session";
let levels = [];
let topics = [];
let lessons = [];
let vocabularies = [];
let editingLevelId = null;
let editingTopicId = null;
let editingLessonId = null;
let editingVocabularyId = null;

function readSession() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY_SESSION) || sessionStorage.getItem(STORAGE_KEY_SESSION) || "null");
    } catch (error) {
        console.error("Invalid admin session", error);
        return null;
    }
}

async function fetchAPI(endpoint, method = "GET", bodyData = null) {
    const session = readSession();
    if (!session || !session.token) {
        window.location.replace("login.html");
        throw new Error("Admin session is missing");
    }
    const headers = { Authorization: `Bearer ${session.token}` };
    const config = { method, headers };
    if (bodyData !== null) {
        headers["Content-Type"] = "application/json";
        config.body = JSON.stringify(bodyData);
    }
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem(STORAGE_KEY_SESSION);
        sessionStorage.removeItem(STORAGE_KEY_SESSION);
        window.location.replace("login.html");
        throw new Error("Admin access is no longer valid");
    }
    if (response.status === 204) return null;
    const data = await response.json().catch(() => null);
    if (!response.ok) {
        const detail = data && data.detail;
        throw new Error(typeof detail === "string" ? detail : `Request failed (${response.status})`);
    }
    return data;
}

function showError(error) {
    console.error(error);
    alert(error.message || "Không thể hoàn thành thao tác với máy chủ.");
}

function levelById(id) {
    return levels.find(level => level.id === Number(id));
}

function topicById(id) {
    return topics.find(topic => topic.id === Number(id));
}

function lessonById(id) {
    return lessons.find(lesson => lesson.id === Number(id));
}

async function loadAllData() {
    const [rawLevels, rawTopics, rawLessons, rawWords] = await Promise.all([
        fetchAPI("/admin/levels"),
        fetchAPI("/topics"),
        fetchAPI("/admin/lessons"),
        fetchAPI("/admin/words")
    ]);
    levels = rawLevels.map(level => ({
        id: level.level_id,
        name: level.name,
        description: level.description || "",
        displayOrder: level.display_order,
        placement_test_enabled: level.placement_test_enabled,
        placement_test_question_count: level.placement_test_question_count,
        placement_test_passing_score: level.placement_test_passing_score,
        is_active: level.is_active
    }));
    topics = rawTopics.map(topic => {
        const parent = levelById(topic.level_id);
        return {
            id: topic.topic_id,
            levelId: topic.level_id,
            level: parent ? parent.name : "Không xác định",
            name: topic.name,
            description: topic.description || "",
            display_order: topic.display_order,
            quick_review_limit: topic.quick_review_limit,
            is_active: topic.is_active
        };
    });
    lessons = rawLessons.map(lesson => ({
        id: lesson.lesson_id,
        topicId: lesson.topic_id,
        name: lesson.name,
        description: lesson.description || "",
        order: lesson.display_order,
        is_active: lesson.is_active
    }));
    vocabularies = rawWords.map(word => ({
        id: word.word_id,
        word: word.word,
        meaning: word.meaning,
        pronunciation: word.pronunciation || "",
        type: word.part_of_speech || "Khác",
        lessonId: word.lesson_id,
        example: word.example || ""
    }));
    renderAll();
}

function renderAll() {
    renderLevels();
    renderTopics();
    renderLessons();
    renderVocabularies();
    renderSelects();
    renderDashboardStats();
}

function renderDashboardStats() {
    const counts = {
        "stat-levels": levels.length,
        "stat-topics": topics.length,
        "stat-lessons": lessons.length,
        "stat-vocabularies": vocabularies.length
    };
    Object.entries(counts).forEach(([id, count]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = count;
    });
    const chart = document.getElementById("vocabulary-chart");
    if (chart) {
        chart.textContent = lessons.length
            ? lessons.map(lesson => `${lesson.name}: ${vocabularies.filter(word => word.lessonId === lesson.id).length} từ`).join(" · ")
            : "Chưa có bài học để thống kê.";
    }
}

function renderLevels() {
    const list = document.getElementById("level-list");
    if (!list) return;
    list.replaceChildren();
    levels.forEach(level => {
        const row = document.createElement("tr");
        row.innerHTML = `<td></td><td></td><td></td><td></td>`;
        row.children[0].textContent = level.id;
        row.children[1].textContent = level.name;
        row.children[2].textContent = `${level.description || "Chưa có"} · ${level.is_active ? "Hoạt động" : "Ngừng hoạt động"}${level.placement_test_enabled ? ` · Bài test: ${level.placement_test_question_count} câu, đạt ${level.placement_test_passing_score}` : " · Không có bài test"}`;
        const edit = makeButton("Sửa", "btn-edit", () => openLevelForm(level));
        const remove = makeButton("Ngừng", "btn-delete", () => deleteLevel(level));
        row.children[3].append(edit, remove);
        list.appendChild(row);
    });
}

function renderTopics() {
    const root = document.getElementById("topic-accordion");
    if (!root) return;
    root.replaceChildren();
    const search = (document.getElementById("topic-search").value || "").trim().toLocaleLowerCase();
    const matches = topics.filter(topic => `${topic.name} ${topic.description}`.toLocaleLowerCase().includes(search));
    if (!matches.length) {
        root.textContent = "Chưa có chủ đề phù hợp.";
        return;
    }
    matches.forEach(topic => {
        const card = document.createElement("div");
        card.className = "topic-card";
        const info = document.createElement("div");
        info.className = "topic-card-info";
        const title = document.createElement("span");
        title.className = "topic-card-name";
        title.textContent = `${topic.name} (${topic.level})`;
        const description = document.createElement("span");
        description.className = "topic-card-desc";
        description.textContent = `${topic.description || "Chưa có mô tả"} · Ôn nhanh ${topic.quick_review_limit} từ · #${topic.display_order}`;
        info.append(title, description);
        const actions = document.createElement("div");
        actions.className = "topic-card-actions";
        actions.append(
            makeButton(Number(topic.is_active) ? "Sửa" : "Sửa (ngừng)", "btn-edit", () => openTopicForm(topic)),
            makeButton("Xóa", "btn-delete", () => deleteTopic(topic))
        );
        card.append(info, actions);
        root.appendChild(card);
    });
}

function renderLessons() {
    const root = document.getElementById("lesson-accordion");
    if (!root) return;
    root.replaceChildren();
    const search = (document.getElementById("lesson-search").value || "").trim().toLocaleLowerCase();
    const matches = lessons.filter(lesson => {
        const topic = topicById(lesson.topicId);
        return `${lesson.name} ${lesson.description} ${topic ? topic.name : ""}`.toLocaleLowerCase().includes(search);
    });
    if (!matches.length) {
        root.textContent = "Chưa có bài học phù hợp.";
        return;
    }
    matches.forEach(lesson => {
        const row = document.createElement("div");
        row.className = "topic-card";
        const info = document.createElement("div");
        info.className = "topic-card-info";
        const title = document.createElement("span");
        title.className = "topic-card-name";
        const topic = topicById(lesson.topicId);
        title.textContent = `${lesson.name} (${topic ? topic.name : "Chưa phân loại"})`;
        const description = document.createElement("span");
        description.className = "topic-card-desc";
        description.textContent = `${lesson.description || "Chưa có mô tả"} · ${vocabularies.filter(word => word.lessonId === lesson.id).length} từ · #${lesson.order}`;
        info.append(title, description);
        const actions = document.createElement("div");
        actions.className = "topic-card-actions";
        actions.append(
            makeButton("Thêm từ", "btn-edit", () => openVocabularyForm(null, lesson.id)),
            makeButton("Sửa", "btn-edit", () => openLessonForm(lesson)),
            makeButton("Xóa", "btn-delete", () => deleteLesson(lesson))
        );
        row.append(info, actions);
        root.appendChild(row);
    });
}

function renderVocabularies() {
    const list = document.getElementById("vocabulary-list");
    if (!list) return;
    list.replaceChildren();
    const search = (document.getElementById("vocabulary-search").value || "").trim().toLocaleLowerCase();
    const selectedLesson = document.getElementById("vocabulary-lesson-filter").value;
    const matches = vocabularies.filter(item => {
        const lesson = lessonById(item.lessonId);
        const content = `${item.word} ${item.meaning} ${lesson ? lesson.name : ""}`.toLocaleLowerCase();
        return content.includes(search) && (!selectedLesson || String(item.lessonId) === selectedLesson);
    });
    if (!matches.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 8;
        cell.textContent = "Chưa có từ vựng phù hợp.";
        cell.style.textAlign = "center";
        row.appendChild(cell);
        list.appendChild(row);
        return;
    }
    matches.forEach(item => {
        const row = document.createElement("tr");
        const values = [item.id, item.word, item.meaning, item.pronunciation || "Chưa có", item.type, lessonById(item.lessonId)?.name || "Không xác định", item.example || "Chưa có"];
        values.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });
        const actions = document.createElement("td");
        actions.append(
            makeButton("Sửa", "btn-edit", () => openVocabularyForm(item)),
            makeButton("Xóa", "btn-delete", () => deleteVocabulary(item))
        );
        row.appendChild(actions);
        list.appendChild(row);
    });
}

function renderSelects() {
    const levelSelect = document.getElementById("topic-level");
    const lessonTopicSelect = document.getElementById("lesson-topic");
    const vocabLessonSelect = document.getElementById("vocabulary-lesson");
    const levelFilter = document.getElementById("topic-level-filter");
    const lessonFilter = document.getElementById("lesson-topic-filter");
    const vocabFilter = document.getElementById("vocabulary-lesson-filter");
    setOptions(levelSelect, [["", "Chọn cấp độ"], ...levels.map(level => [level.id, level.name])]);
    setOptions(levelFilter, [["", "Tất cả cấp độ"], ...levels.map(level => [level.id, level.name])]);
    setOptions(lessonTopicSelect, [["", "Chọn chủ đề"], ...topics.map(topic => [topic.id, `${topic.name} (${topic.level})`])]);
    setOptions(lessonFilter, [["", "Tất cả chủ đề"], ...topics.map(topic => [topic.id, `${topic.name} (${topic.level})`])]);
    setOptions(vocabLessonSelect, [["", "Chọn bài học"], ...lessons.map(lesson => [lesson.id, `${lesson.name} (${topicById(lesson.topicId)?.name || ""})`])]);
    setOptions(vocabFilter, [["", "Tất cả bài học"], ...lessons.map(lesson => [lesson.id, lesson.name])]);
}

function setOptions(select, options) {
    if (!select) return;
    const current = select.value;
    select.replaceChildren(...options.map(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        return option;
    }));
    if (options.some(([value]) => String(value) === current)) select.value = current;
}

function makeButton(label, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", handler);
    return button;
}

function openLevelForm(level = null) {
    const form = document.getElementById("level-form");
    form.reset();
    document.getElementById("level-form-container").classList.remove("hidden");
    document.getElementById("level-form-title").textContent = level ? "Sửa cấp độ" : "Thêm cấp độ";
    document.getElementById("level-name").value = level ? level.name : "";
    document.getElementById("level-description").value = level ? level.description : "";
    document.getElementById("level-placement-enabled").value = level ? Number(level.placement_test_enabled) : "0";
    document.getElementById("level-placement-question-count").value = level ? level.placement_test_question_count : 10;
    document.getElementById("level-placement-passing-score").value = level ? level.placement_test_passing_score : 7;
    document.getElementById("level-active").value = level ? String(Number(level.is_active)) : "1";
    editingLevelId = level ? level.id : null;
}

function openTopicForm(topic = null) {
    const form = document.getElementById("topic-form");
    form.reset();
    document.getElementById("topic-form-container").classList.remove("hidden");
    document.getElementById("topic-form-title").textContent = topic ? "Sửa chủ đề" : "Thêm chủ đề";
    document.getElementById("topic-name").value = topic ? topic.name : "";
    document.getElementById("topic-level").value = topic ? topic.levelId : "";
    document.getElementById("topic-description").value = topic ? topic.description : "";
    document.getElementById("topic-quick-review-limit").value = topic ? topic.quick_review_limit : 15;
    document.getElementById("topic-active").value = topic ? String(topic.is_active) : "1";
    document.getElementById("topic-order").value = topic ? topic.display_order : "1";
    editingTopicId = topic ? topic.id : null;
}

function openLessonForm(lesson = null) {
    const form = document.getElementById("lesson-form");
    form.reset();
    document.getElementById("lesson-form-container").classList.remove("hidden");
    document.getElementById("lesson-form-title").textContent = lesson ? "Sửa bài học" : "Thêm bài học";
    document.getElementById("lesson-name").value = lesson ? lesson.name : "";
    document.getElementById("lesson-topic").value = lesson ? lesson.topicId : "";
    document.getElementById("lesson-order").value = lesson ? lesson.order : "1";
    document.getElementById("lesson-description").value = lesson ? lesson.description : "";
    document.getElementById("lesson-active").value = lesson ? String(lesson.is_active) : "1";
    editingLessonId = lesson ? lesson.id : null;
}

function openVocabularyForm(item = null, lessonId = null) {
    const form = document.getElementById("vocabulary-form");
    form.reset();
    document.getElementById("vocabulary-form-container").classList.remove("hidden");
    document.getElementById("vocabulary-form-title").textContent = item ? "Sửa từ vựng" : "Thêm từ vựng";
    document.getElementById("vocabulary-word").value = item ? item.word : "";
    document.getElementById("vocabulary-meaning").value = item ? item.meaning : "";
    document.getElementById("vocabulary-pronunciation").value = item ? item.pronunciation : "";
    document.getElementById("vocabulary-type").value = item ? item.type : "";
    document.getElementById("vocabulary-lesson").value = item ? item.lessonId : (lessonId || "");
    document.getElementById("vocabulary-example").value = item ? item.example : "";
    editingVocabularyId = item ? item.id : null;
}

async function submitForm(form, path, method, payload, closeId) {
    try {
        await fetchAPI(path, method, payload);
        await loadAllData();
        form.reset();
        document.getElementById(closeId).classList.add("hidden");
        editingLevelId = editingTopicId = editingLessonId = editingVocabularyId = null;
    } catch (error) {
        showError(error);
    }
}

function closeForm(formId, containerId) {
    document.getElementById(formId).reset();
    document.getElementById(containerId).classList.add("hidden");
    editingLevelId = editingTopicId = editingLessonId = editingVocabularyId = null;
}

async function deleteLevel(level) {
    if (topics.some(topic => topic.levelId === level.id)) {
        alert("Hãy ngừng hoạt động hoặc xóa các chủ đề của cấp độ trước.");
        return;
    }
    if (!confirm(`Ngừng hoạt động cấp độ ${level.name}?`)) return;
    try {
        await fetchAPI(`/levels/${level.id}`, "DELETE");
        await loadAllData();
    } catch (error) {
        showError(error);
    }
}

async function deleteTopic(topic) {
    if (lessons.some(lesson => lesson.topicId === topic.id)) {
        alert("Hãy ngừng hoạt động hoặc xóa các bài học của chủ đề trước.");
        return;
    }
    if (!confirm(`Ngừng hoạt động chủ đề ${topic.name}?`)) return;
    try {
        await fetchAPI(`/topics/${topic.id}`, "DELETE");
        await loadAllData();
    } catch (error) {
        showError(error);
    }
}

async function deleteLesson(lesson) {
    if (vocabularies.some(word => word.lessonId === lesson.id)) {
        alert("Hãy xóa từ vựng trong bài học trước.");
        return;
    }
    if (!confirm(`Ngừng hoạt động bài học ${lesson.name}?`)) return;
    try {
        await fetchAPI(`/lessons/${lesson.id}`, "DELETE");
        await loadAllData();
    } catch (error) {
        showError(error);
    }
}

async function deleteVocabulary(item) {
    if (!confirm(`Ngừng hoạt động từ vựng ${item.word}?`)) return;
    try {
        await fetchAPI(`/words/${item.id}`, "DELETE");
        await loadAllData();
    } catch (error) {
        showError(error);
    }
}

function switchToPage(pageName) {
    document.querySelectorAll(".page").forEach(page => page.classList.toggle("hidden", page.id !== pageName));
    document.querySelectorAll(".menu-item").forEach(item => item.classList.toggle("active", item.dataset.page === pageName));
    const title = document.getElementById("page-title");
    if (title) title.textContent = ({ dashboard: "Tổng quan", levels: "Quản lý cấp độ", topics: "Quản lý chủ đề", lessons: "Quản lý bài học", vocabulary: "Quản lý từ vựng" })[pageName];
}

function attachHandlers() {
    const session = readSession();
    const label = document.getElementById("admin-label");
    if (label && session && session.name) label.textContent = session.name;
    document.getElementById("btn-logout").addEventListener("click", () => {
        if (!confirm("Bạn có chắc muốn đăng xuất?")) return;
        localStorage.removeItem(STORAGE_KEY_SESSION);
        sessionStorage.removeItem(STORAGE_KEY_SESSION);
        window.location.replace("login.html");
    });
    document.querySelectorAll(".menu-item").forEach(item => item.addEventListener("click", () => switchToPage(item.dataset.page)));
    document.getElementById("btn-add-level").addEventListener("click", () => openLevelForm());
    document.getElementById("btn-add-topic").addEventListener("click", () => openTopicForm());
    document.getElementById("btn-add-lesson").addEventListener("click", () => openLessonForm());
    document.getElementById("btn-add-vocabulary").addEventListener("click", () => openVocabularyForm());
    document.getElementById("btn-cancel-level").addEventListener("click", () => closeForm("level-form", "level-form-container"));
    document.getElementById("btn-cancel-topic").addEventListener("click", () => closeForm("topic-form", "topic-form-container"));
    document.getElementById("btn-cancel-lesson").addEventListener("click", () => closeForm("lesson-form", "lesson-form-container"));
    document.getElementById("btn-cancel-vocabulary").addEventListener("click", () => closeForm("vocabulary-form", "vocabulary-form-container"));

    document.getElementById("level-form").addEventListener("submit", event => {
        event.preventDefault();
        const questionCount = Number(document.getElementById("level-placement-question-count").value);
        const passingScore = Number(document.getElementById("level-placement-passing-score").value);
        if (passingScore > questionCount) {
            alert("Số câu đạt yêu cầu không được lớn hơn tổng số câu.");
            return;
        }
        const payload = {
            name: document.getElementById("level-name").value.trim().toUpperCase(),
            description: document.getElementById("level-description").value.trim() || null,
            placement_test_enabled: document.getElementById("level-placement-enabled").value === "1",
            placement_test_question_count: questionCount,
            placement_test_passing_score: passingScore,
            is_active: document.getElementById("level-active").value === "1"
        };
        if (!editingLevelId) payload.display_order = levels.length ? Math.max(...levels.map(level => level.displayOrder)) + 1 : 1;
        submitForm(event.currentTarget, editingLevelId ? `/levels/${editingLevelId}` : "/levels", editingLevelId ? "PATCH" : "POST", payload, "level-form-container");
    });

    document.getElementById("topic-form").addEventListener("submit", event => {
        event.preventDefault();
        const payload = {
            level_id: Number(document.getElementById("topic-level").value),
            name: document.getElementById("topic-name").value.trim(),
            description: document.getElementById("topic-description").value.trim() || null,
            quick_review_limit: Number(document.getElementById("topic-quick-review-limit").value),
            is_active: document.getElementById("topic-active").value === "1",
            display_order: Number(document.getElementById("topic-order").value)
        };
        submitForm(event.currentTarget, editingTopicId ? `/topics/${editingTopicId}` : "/topics", editingTopicId ? "PATCH" : "POST", payload, "topic-form-container");
    });

    document.getElementById("lesson-form").addEventListener("submit", event => {
        event.preventDefault();
        const payload = {
            topic_id: Number(document.getElementById("lesson-topic").value),
            name: document.getElementById("lesson-name").value.trim(),
            description: document.getElementById("lesson-description").value.trim() || null,
            display_order: Number(document.getElementById("lesson-order").value),
            is_active: document.getElementById("lesson-active").value === "1"
        };
        submitForm(event.currentTarget, editingLessonId ? `/lessons/${editingLessonId}` : "/lessons", editingLessonId ? "PATCH" : "POST", payload, "lesson-form-container");
    });

    document.getElementById("vocabulary-form").addEventListener("submit", event => {
        event.preventDefault();
        const payload = {
            lesson_id: Number(document.getElementById("vocabulary-lesson").value),
            word: document.getElementById("vocabulary-word").value.trim(),
            meaning: document.getElementById("vocabulary-meaning").value.trim(),
            pronunciation: document.getElementById("vocabulary-pronunciation").value.trim() || null,
            part_of_speech: document.getElementById("vocabulary-type").value || null,
            example: document.getElementById("vocabulary-example").value.trim() || null
        };
        submitForm(event.currentTarget, editingVocabularyId ? `/words/${editingVocabularyId}` : "/words", editingVocabularyId ? "PATCH" : "POST", payload, "vocabulary-form-container");
    });

    document.getElementById("topic-search").addEventListener("input", renderTopics);
    document.getElementById("lesson-search").addEventListener("input", renderLessons);
    document.getElementById("vocabulary-search").addEventListener("input", renderVocabularies);
    document.getElementById("vocabulary-lesson-filter").addEventListener("change", renderVocabularies);
}

document.addEventListener("DOMContentLoaded", async () => {
    attachHandlers();
    try {
        const me = await fetchAPI("/auth/me");
        if (me.role !== "ADMIN") {
            localStorage.removeItem(STORAGE_KEY_SESSION);
            sessionStorage.removeItem(STORAGE_KEY_SESSION);
            window.location.replace("login.html");
            return;
        }
        const label = document.getElementById("admin-label");
        if (label) label.textContent = me.full_name || me.username || "Quản trị viên";
        await loadAllData();
    } catch (error) {
        showError(error);
    }
});
