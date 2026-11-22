/* ================================================================
   1. CẤU HÌNH API & HÀM CHUNG GỌI BACKEND
================================================================ */
const API_BASE_URL = "http://127.0.0.1:8000";
const STORAGE_KEY_SESSION = "vocabbit_admin_session";

// Lấy Token xác thực đã lưu từ lúc Đăng nhập
function getAdminToken() {
    const rawSession = localStorage.getItem(STORAGE_KEY_SESSION) || sessionStorage.getItem(STORAGE_KEY_SESSION);
    if (!rawSession) return null;
    try {
        const session = JSON.parse(rawSession);

        // Nếu đã quá hạn 30 phút -> Xóa phiên và trả về null
        if (session.expiresAt && Date.now() > session.expiresAt) {
            localStorage.removeItem(STORAGE_KEY_SESSION);
            sessionStorage.removeItem(STORAGE_KEY_SESSION);
            return null;
        }

        return session.token || null;
    } catch (e) {
        return null;
    }
}

// Hàm fetchAPI chung tự động gửi Bearer Token
async function fetchAPI(endpoint, method = "GET", bodyData = null) {
    const token = getAdminToken();
    if (!token) {
        alert("Phi?n ??ng nh?p ?? h?t h?n. Vui l?ng ??ng nh?p l?i!");
        window.location.replace("login.html");
        return null;
    }

    const headers = { Authorization: `Bearer ${token}` };
    if (bodyData !== null) headers["Content-Type"] = "application/json";
    const config = { method, headers };
    if (bodyData !== null) config.body = JSON.stringify(bodyData);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem(STORAGE_KEY_SESSION);
        sessionStorage.removeItem(STORAGE_KEY_SESSION);
        window.location.replace("login.html");
        throw new Error("Phi?n ??ng nh?p qu?n tr? ?? h?t h?n.");
    }
    if (response.status === 204) return null;
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.detail || `L?i thao t?c API (${response.status})`);
    return data;
}

/* ================================================================
   2. KIỂM TRA SESSION — BẢO VỆ TRANG ADMIN
================================================================ */
(function guardAdminPage() {
    "use strict";

    const raw = localStorage.getItem(STORAGE_KEY_SESSION) || sessionStorage.getItem(STORAGE_KEY_SESSION);
    if (!raw) {
        window.location.replace("login.html");
        return;
    }
    try {
        const session = JSON.parse(raw);
        if (!session.token) throw new Error("Missing token");
        const adminLabel = document.getElementById("admin-label");
        fetch(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${session.token}` }
        }).then(async (res) => {
            const profile = await res.json().catch(() => ({}));
            if (!res.ok || profile.role !== "ADMIN") {
                localStorage.removeItem(STORAGE_KEY_SESSION);
                sessionStorage.removeItem(STORAGE_KEY_SESSION);
                window.location.replace("login.html");
                return;
            }
            if (adminLabel) adminLabel.textContent = profile.full_name || "Qu?n tr? vi?n";
        }).catch(() => {
            localStorage.removeItem(STORAGE_KEY_SESSION);
            sessionStorage.removeItem(STORAGE_KEY_SESSION);
            window.location.replace("login.html");
        });
    } catch (_) {
        localStorage.removeItem(STORAGE_KEY_SESSION);
        sessionStorage.removeItem(STORAGE_KEY_SESSION);
        window.location.replace("login.html");
    }
})();

/* ================================================================
   3. ĐĂNG XUẤT
================================================================ */
(function setupLogout() {
    "use strict";

    const btn = document.getElementById("btn-logout");
    if (!btn) return;

    btn.addEventListener("click", function () {
        const confirmed = confirm("Bạn có chắc muốn đăng xuất?");
        if (!confirmed) return;

        localStorage.removeItem(STORAGE_KEY_SESSION);
        sessionStorage.removeItem(STORAGE_KEY_SESSION);
        window.location.replace("login.html");
    });
})();

/* ================================================================
   DỮ LIỆU TỪ FASTAPI
================================================================ */

// Khai báo mảng rỗng (dữ liệu sẽ được nạp từ Backend)
let levels = [];
let topics = [];
let lessons = [];
let vocabularies = [];

// Hàm nạp dữ liệu từ FastAPI
async function loadAllData() {
    try {
        // 1. Tải Levels, Topics, Words (thêm dấu / ở cuối để tránh redirect 307)
        const rawLevels = await fetchAPI("/admin/levels") || [];
        const rawTopics = await fetchAPI("/topics/") || [];
        const rawLessons = await fetchAPI("/admin/lessons") || [];
        const rawWords = await fetchAPI("/admin/words") || [];

        // Chuẩn hóa danh sách Cấp độ
        levels = rawLevels.filter(l => l.is_active !== false).map(l => ({
            id: l.level_id || l.id,
            name: l.name,
            description: l.description || "",
            display_order: l.display_order || 1,
            placement_test_enabled: l.placement_test_enabled ?? 0,
            placement_test_question_count: l.placement_test_question_count ?? 10,
            placement_test_passing_score: l.placement_test_passing_score ?? 7,
            is_active: l.is_active ?? 1
        }));

        // Chuẩn hóa danh sách Chủ đề
        topics = rawTopics.filter(t => t.is_active !== 0).map(t => {
            const parentLevel = levels.find(l => l.id === t.level_id);
            return {
                id: t.topic_id || t.id,
                name: t.name,
                level: t.level || (parentLevel ? parentLevel.name : ""),
                level_id: t.level_id,
                description: t.description || "",
                is_active: t.is_active ?? 1,
                display_order: t.display_order || t.order || 1,
                quick_review_limit: t.quick_review_limit ?? 15
            };
        });

        // 2. Lấy toàn bộ bài học từ endpoint admin hiện có
        lessons = rawLessons.filter(l => l.is_active !== 0).map(l => ({
            id: l.lesson_id || l.id,
            name: l.name,
            topicId: l.topic_id,
            order: l.display_order || l.order || 1,
            description: l.description || "",
            is_active: l.is_active ?? 1,
            pronunciationPassingScore: l.pronunciation_passing_score ?? 70,
            pronunciationMaxAttempts: l.pronunciation_max_attempts ?? 7
        }));

        // 3. Chuẩn hóa danh sách Từ vựng
        vocabularies = rawWords.filter(w => w.is_active !== 0).map(w => ({
            id: w.word_id || w.id,
            word: w.word,
            meaning: w.meaning,
            pronunciation: w.pronunciation || "",
            type: w.part_of_speech || w.type || "Khác",
            lessonId: w.lesson_id || w.lessonId,
            example: w.example || "",
            ipa: w.ipa || ""
        }));

        // 4. Vẽ lại toàn bộ giao diện
        renderLevels();
        updateTopicLevelOptions();
        renderTopics();
        renderLessonTopicOptions();
        renderLessons();
        renderVocabularyLessonOptions();
        renderVocabularies();
        renderDashboardStats();

    } catch (error) {
        console.error("Lỗi khi tải dữ liệu hệ thống:", error);
    }
}
/* Biến lưu trạng thái đang sửa */
let editingLevelId = null;
let editingTopicId = null;
let editingLessonId = null;
let editingVocabularyId = null;

/* ================================================================
   CÁC HÀM TIỆN ÍCH DÙNG CHUNG
================================================================ */

function getTopicName(topicId) {
    const topic = topics.find(item => item.id === topicId);
    return topic ? topic.name + " (" + topic.level + ")" : "Chưa có chủ đề";
}

function getLessonName(lessonId) {
    const lesson = lessons.find(item => item.id === lessonId);
    return lesson ? lesson.name : "Bài học không tồn tại";
}

function switchToPage(pageName) {
    if (!pages || !pageTitle) return;
    pages.forEach(function (page) {
        page.classList.add("hidden");
    });
    const targetPage = document.getElementById(pageName);
    if (targetPage) targetPage.classList.remove("hidden");
    if (titles && titles[pageName]) pageTitle.textContent = titles[pageName];
    menuItems.forEach(function (menu) {
        menu.classList.toggle("active", menu.dataset.page === pageName);
    });

    if (pageName === "dashboard") renderDashboardStats();
    if (pageName === "levels") renderLevels();
    if (pageName === "topics") renderTopics();
    if (pageName === "lessons") {
        renderLessonTopicOptions();
        renderLessons();
    }
    if (pageName === "vocabulary") {
        renderVocabularyLessonOptions();
        renderVocabularies();
    }
}

function quickAddVocabularyForLesson(lessonId) {
    switchToPage("vocabulary");
    openVocabularyForm();
    if (vocabularyLessonInput) {
        vocabularyLessonInput.value = String(lessonId);
    }
}

/* ================================================================
   NAVIGATION VÀ SIDEBAR
================================================================ */

const menuItems = document.querySelectorAll(".menu-item");
const pages = document.querySelectorAll(".page");
const pageTitle = document.getElementById("page-title");

const titles = {
    dashboard: "Tổng quan",
    levels: "Quản lý cấp độ",
    topics: "Quản lý chủ đề",
    lessons: "Quản lý bài học",
    vocabulary: "Quản lý từ vựng"
};

menuItems.forEach(function (item) {
    item.addEventListener("click", function () {
        const pageName = item.dataset.page;
        switchToPage(pageName);
    });
});

/* ================================================================
   1. QUẢN LÝ CẤP ĐỘ (LEVELS)
================================================================ */

const levelList = document.getElementById("level-list");
const levelForm = document.getElementById("level-form");
const levelFormContainer = document.getElementById("level-form-container");
const levelFormTitle = document.getElementById("level-form-title");

const levelNameInput = document.getElementById("level-name");
const levelDescriptionInput = document.getElementById("level-description");
const levelPlacementEnabledInput = document.getElementById("level-placement-enabled");
const levelPlacementCountInput = document.getElementById("level-placement-count");
const levelPlacementPassingInput = document.getElementById("level-placement-passing");

const addLevelButton = document.getElementById("btn-add-level");
const cancelLevelButton = document.getElementById("btn-cancel-level");

function renderLevels() {
    if (!levelList) return;
    levelList.innerHTML = "";

    levels.forEach(function (level) {
        const row = document.createElement("tr");

        const idCell = document.createElement("td");
        idCell.textContent = level.id;

        const nameCell = document.createElement("td");
        nameCell.textContent = level.name;

        const descriptionCell = document.createElement("td");
        descriptionCell.textContent = level.description || "Chưa có";

        const placementCell = document.createElement("td");
        placementCell.textContent = level.placement_test_enabled
            ? `Bật · ${level.placement_test_passing_score ?? 7}/${level.placement_test_question_count ?? 10} câu`
            : "Không sử dụng";

        const actionCell = document.createElement("td");

        const editButton = document.createElement("button");
        editButton.textContent = "Sửa";
        editButton.className = "btn-edit";
        editButton.addEventListener("click", function () {
            editLevel(level.id);
        });

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Xóa";
        deleteButton.className = "btn-delete";
        deleteButton.addEventListener("click", function () {
            deleteLevel(level.id);
        });

        actionCell.append(editButton, deleteButton);
        row.append(idCell, nameCell, descriptionCell, placementCell, actionCell);
        levelList.appendChild(row);
    });
}

function updateTopicLevelOptions() {
    if (!topicLevelInput || !topicLevelFilter) return;
    const currentFormValue = topicLevelInput.value;
    const currentFilterValue = topicLevelFilter.value;

    topicLevelInput.innerHTML = '<option value="">Chọn cấp độ</option>';
    topicLevelFilter.innerHTML = '<option value="">Tất cả cấp độ</option>';

    levels.forEach(function (level) {
        const formOption = document.createElement("option");
        formOption.value = level.name;
        formOption.textContent = level.name;
        topicLevelInput.appendChild(formOption);

        const filterOption = document.createElement("option");
        filterOption.value = level.name;
        filterOption.textContent = level.name;
        topicLevelFilter.appendChild(filterOption);
    });

    topicLevelInput.value = currentFormValue;
    topicLevelFilter.value = currentFilterValue;
}

function openLevelForm(level = null) {
    levelForm.reset();
    levelFormContainer.classList.remove("hidden");

    if (level) {
        levelFormTitle.textContent = "Sửa cấp độ";
        levelNameInput.value = level.name;
        levelDescriptionInput.value = level.description;
        levelPlacementEnabledInput.value = level.placement_test_enabled ? "1" : "0";
        levelPlacementCountInput.value = String(level.placement_test_question_count ?? 10);
        levelPlacementPassingInput.value = String(level.placement_test_passing_score ?? 7);
        editingLevelId = level.id;
    } else {
        levelFormTitle.textContent = "Thêm cấp độ";
        levelPlacementEnabledInput.value = "0";
        levelPlacementCountInput.value = "10";
        levelPlacementPassingInput.value = "7";
        editingLevelId = null;
    }

    levelFormContainer.scrollIntoView({ behavior: "smooth", block: "center" });
    levelNameInput.focus();
}

function editLevel(id) {
    const level = levels.find(item => item.id === id);
    if (level) openLevelForm(level);
}

function deleteLevel(id) {
    const level = levels.find(item => item.id === id);
    if (!level) return;

    const hasTopics = topics.some(topic => topic.level === level.name);
    if (hasTopics) {
        alert("Không thể xóa cấp độ này vì vẫn còn chủ đề sử dụng cấp độ đó. Vui lòng xóa các chủ đề trước.");
        return;
    }

    const confirmed = confirm("Bạn có chắc muốn xóa cấp độ " + level.name + "?");
    if (!confirmed) return;
    fetchAPI(`/levels/${id}`, "DELETE").then(() => loadAllData()).catch((error) => alert(error.message));
}

addLevelButton.addEventListener("click", function () {
    openLevelForm();
});

cancelLevelButton.addEventListener("click", function () {
    levelFormContainer.classList.add("hidden");
    levelForm.reset();
    editingLevelId = null;
});

levelForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = levelNameInput.value.trim().toUpperCase();
    const description = levelDescriptionInput.value.trim();
    const placementEnabled = levelPlacementEnabledInput.value === "1";
    const placementQuestionCount = Number(levelPlacementCountInput.value);
    const placementPassingScore = Number(levelPlacementPassingInput.value);

    if (!name) {
        alert("Vui lòng nhập tên cấp độ.");
        return;
    }
    if (!Number.isInteger(placementQuestionCount) || placementQuestionCount < 1 ||
        !Number.isInteger(placementPassingScore) || placementPassingScore < 1) {
        alert("Số câu kiểm tra và số câu cần đạt phải là số nguyên dương.");
        return;
    }
    if (placementPassingScore > placementQuestionCount) {
        alert("Số câu cần đạt không được lớn hơn tổng số câu kiểm tra.");
        return;
    }

    const duplicate = levels.some(function (level) {
        return level.name.toLowerCase() === name.toLowerCase() && level.id !== editingLevelId;
    });

    if (duplicate) {
        alert("Cấp độ này đã tồn tại.");
        return;
    }

    const current = editingLevelId !== null ? levels.find(item => item.id === editingLevelId) : null;
    const payload = {
        name,
        description: description || null,
        display_order: current?.display_order || (levels.length ? Math.max(...levels.map(level => level.display_order || 1)) + 1 : 1),
        placement_test_enabled: placementEnabled,
        placement_test_question_count: placementQuestionCount,
        placement_test_passing_score: placementPassingScore,
        is_active: current?.is_active ?? true
    };
    try {
        if (editingLevelId !== null) {
            await fetchAPI(`/levels/${editingLevelId}`, "PATCH", payload);
        } else {
            await fetchAPI("/levels", "POST", payload);
        }
        await loadAllData();
        levelFormContainer.classList.add("hidden");
        levelForm.reset();
        editingLevelId = null;
    } catch (error) {
        alert(error.message);
    }
});

/* ================================================================
   2. QUẢN LÝ CHỦ ĐỀ (TOPICS) — ACCORDION THEO CẤP ĐỘ
================================================================ */

const topicForm = document.getElementById("topic-form");
const topicFormContainer = document.getElementById("topic-form-container");
const topicFormTitle = document.getElementById("topic-form-title");

const topicNameInput = document.getElementById("topic-name");
const topicLevelInput = document.getElementById("topic-level");
const topicDescriptionInput = document.getElementById("topic-description");
const topicActiveInput = document.getElementById("topic-active");
const topicOrderInput = document.getElementById("topic-order");

const topicSearch = document.getElementById("topic-search");
const topicLevelFilter = document.getElementById("topic-level-filter");

const addTopicButton = document.getElementById("btn-add-topic");
const cancelTopicButton = document.getElementById("btn-cancel-topic");

function renderTopics() {
    const accordionEl = document.getElementById("topic-accordion");
    if (!accordionEl) return;

    const keyword = topicSearch.value.trim().toLowerCase();

    // Ghi nhớ các nhóm đang mở
    const openLevels = new Set();
    accordionEl.querySelectorAll(".accordion-item.open").forEach(function (item) {
        if (item.dataset.level) openLevels.add(item.dataset.level);
    });

    accordionEl.innerHTML = "";

    const levelNames = levels.map(l => l.name);
    topics.forEach(function (t) {
        if (!levelNames.includes(t.level)) levelNames.push(t.level);
    });

    let anyGroup = false;

    levelNames.forEach(function (levelName) {
        const levelTopics = topics
            .filter(function (t) {
                const matchLevel = t.level === levelName;
                const matchKeyword = !keyword ||
                    t.name.toLowerCase().includes(keyword) ||
                    (t.description || "").toLowerCase().includes(keyword);
                return matchLevel && matchKeyword;
            })
            .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

        const totalInLevel = topics.filter(t => t.level === levelName).length;
        if (keyword && levelTopics.length === 0) return;

        anyGroup = true;
        const isOpen = openLevels.has(levelName) || Boolean(keyword && levelTopics.length > 0);

        const item = document.createElement("div");
        item.className = "accordion-item" + (isOpen ? " open" : "");
        item.dataset.level = levelName;

        const header = document.createElement("button");
        header.type = "button";
        header.className = "accordion-header";

        const headerLeft = document.createElement("div");
        headerLeft.className = "accordion-header-left";

        const badge = document.createElement("span");
        badge.className = "accordion-badge";
        badge.textContent = levelName;

        const title = document.createElement("span");
        title.className = "accordion-title";
        title.textContent = "Cấp độ " + levelName;

        headerLeft.append(badge, title);

        const headerRight = document.createElement("div");
        headerRight.className = "accordion-header-right";

        const countEl = document.createElement("span");
        countEl.className = "accordion-count";
        countEl.textContent = (keyword ? levelTopics.length + "/" + totalInLevel : totalInLevel) + " chủ đề";

        const chevron = document.createElement("span");
        chevron.className = "accordion-chevron";
        chevron.textContent = "›";

        headerRight.append(countEl, chevron);
        header.append(headerLeft, headerRight);

        header.addEventListener("click", function () {
            item.classList.toggle("open");
        });

        const body = document.createElement("div");
        body.className = "accordion-body";

        if (levelTopics.length === 0) {
            const emptyEl = document.createElement("p");
            emptyEl.className = "accordion-empty";
            emptyEl.textContent = "Chưa có chủ đề nào ở cấp độ này.";
            body.appendChild(emptyEl);
        } else {
            levelTopics.forEach(function (topic) {
                const card = document.createElement("div");
                card.className = "topic-card";

                const infoDiv = document.createElement("div");
                infoDiv.className = "topic-card-info";

                const nameEl = document.createElement("span");
                nameEl.className = "topic-card-name";
                nameEl.textContent = topic.name;

                const descEl = document.createElement("span");
                descEl.className = "topic-card-desc";
                descEl.textContent = topic.description || "Chưa có mô tả";

                infoDiv.append(nameEl, descEl);

                const metaDiv = document.createElement("div");
                metaDiv.className = "topic-card-meta";

                const statusBadge = document.createElement("span");
                const isActive = Number(topic.is_active) === 1;
                statusBadge.className = isActive ? "badge-active" : "badge-inactive";
                statusBadge.textContent = isActive ? "Hoạt động" : "Ngừng";

                const orderEl = document.createElement("span");
                orderEl.className = "topic-card-order";
                orderEl.textContent = "#" + topic.display_order;

                metaDiv.append(statusBadge, orderEl);

                const actionsDiv = document.createElement("div");
                actionsDiv.className = "topic-card-actions";

                const editBtn = document.createElement("button");
                editBtn.textContent = "Sửa";
                editBtn.className = "btn-edit";
                editBtn.addEventListener("click", function () { editTopic(topic.id); });

                const deleteBtn = document.createElement("button");
                deleteBtn.textContent = "Xóa";
                deleteBtn.className = "btn-delete";
                deleteBtn.addEventListener("click", function () { deleteTopic(topic.id); });

                actionsDiv.append(editBtn, deleteBtn);
                card.append(infoDiv, metaDiv, actionsDiv);
                body.appendChild(card);
            });
        }

        item.append(header, body);
        accordionEl.appendChild(item);
    });

    if (!anyGroup) {
        const noResult = document.createElement("div");
        noResult.className = "accordion-no-result";
        noResult.textContent = "Không tìm thấy chủ đề phù hợp.";
        accordionEl.appendChild(noResult);
    }
}

function openTopicForm(topic = null) {
    topicForm.reset();
    updateTopicLevelOptions();
    topicFormContainer.classList.remove("hidden");

    if (topic) {
        topicFormTitle.textContent = "Sửa chủ đề";
        topicNameInput.value = topic.name;
        topicLevelInput.value = topic.level;
        topicDescriptionInput.value = topic.description;
        topicActiveInput.value = String(topic.is_active ?? 1);
        topicOrderInput.value = topic.display_order ?? 1;
        editingTopicId = topic.id;
    } else {
        topicFormTitle.textContent = "Thêm chủ đề";
        editingTopicId = null;
        topicActiveInput.value = "1";
        topicOrderInput.value = "1";
    }

    topicFormContainer.scrollIntoView({ behavior: "smooth", block: "center" });
    topicNameInput.focus();
}

function editTopic(id) {
    const topic = topics.find(item => item.id === id);
    if (topic) openTopicForm(topic);
}

function deleteTopic(id) {
    const topic = topics.find(item => item.id === id);
    if (!topic) return;

    const hasLessons = lessons.some(lesson => lesson.topicId === id);
    if (hasLessons) {
        alert("Không thể xóa chủ đề này vì vẫn còn bài học bên trong. Vui lòng xóa các bài học trước.");
        return;
    }

    const confirmed = confirm("Bạn có chắc muốn xóa chủ đề " + topic.name + "?");
    if (!confirmed) return;

    fetchAPI(`/topics/${id}`, "DELETE").then(() => loadAllData()).catch((error) => alert(error.message));
}

addTopicButton.addEventListener("click", function () {
    openTopicForm();
});

cancelTopicButton.addEventListener("click", function () {
    topicFormContainer.classList.add("hidden");
    topicForm.reset();
    editingTopicId = null;
});

topicForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = topicNameInput.value.trim();
    const level = topicLevelInput.value;
    const description = topicDescriptionInput.value.trim();
    const is_active = Number(topicActiveInput.value);
    const display_order = Number(topicOrderInput.value);

    if (!name || !level || !Number.isInteger(display_order) || display_order < 1 || ![0, 1].includes(is_active)) {
        alert("Vui lòng nhập đầy đủ thông tin hợp lệ.");
        return;
    }

    const duplicate = topics.some(function (topic) {
        return topic.name.toLowerCase() === name.toLowerCase() && topic.level === level && topic.id !== editingTopicId;
    });

    if (duplicate) {
        alert("Chủ đề này đã tồn tại trong cấp độ đã chọn.");
        return;
    }

    const levelObject = levels.find(item => item.name === level);
    if (!levelObject) {
        alert("Cấp độ không hợp lệ.");
        return;
    }
    const payload = {
        level_id: levelObject.id,
        name,
        description: description || null,
        display_order,
        quick_review_limit: editingTopicId !== null
            ? (topics.find(item => item.id === editingTopicId)?.quick_review_limit ?? 15)
            : 15,
        is_active: is_active === 1
    };
    try {
        if (editingTopicId !== null) {
            await fetchAPI(`/topics/${editingTopicId}`, "PATCH", payload);
        } else {
            await fetchAPI("/topics", "POST", payload);
        }
        await loadAllData();
        topicFormContainer.classList.add("hidden");
        topicForm.reset();
        editingTopicId = null;
    } catch (error) {
        alert(error.message);
    }
});

topicSearch.addEventListener("input", renderTopics);

/* ================================================================
   3. QUẢN LÝ BÀI HỌC (LESSONS) & TỪ VỰNG LỒNG BÊN TRONG
================================================================ */

const lessonForm = document.getElementById("lesson-form");
const lessonFormContainer = document.getElementById("lesson-form-container");
const lessonFormTitle = document.getElementById("lesson-form-title");

const lessonNameInput = document.getElementById("lesson-name");
const lessonTopicInput = document.getElementById("lesson-topic");
const lessonOrderInput = document.getElementById("lesson-order");
const lessonDescriptionInput = document.getElementById("lesson-description");
const lessonActiveInput = document.getElementById("lesson-active");

const lessonSearch = document.getElementById("lesson-search");
const lessonTopicFilter = document.getElementById("lesson-topic-filter");

const addLessonButton = document.getElementById("btn-add-lesson");
const cancelLessonButton = document.getElementById("btn-cancel-lesson");

function renderLessonTopicOptions() {
    if (!lessonTopicInput) return;
    const currentTopicValue = lessonTopicInput.value;

    lessonTopicInput.innerHTML = '<option value="">Chọn chủ đề</option>';

    if (lessonTopicFilter) {
        lessonTopicFilter.innerHTML = '<option value="">Tất cả chủ đề</option>';
    }

    topics.forEach(function (topic) {
        const formOption = document.createElement("option");
        formOption.value = topic.id;
        formOption.textContent = topic.name + " (" + topic.level + ")";
        lessonTopicInput.appendChild(formOption);

        if (lessonTopicFilter) {
            const filterOption = document.createElement("option");
            filterOption.value = topic.id;
            filterOption.textContent = topic.name + " (" + topic.level + ")";
            lessonTopicFilter.appendChild(filterOption);
        }
    });

    lessonTopicInput.value = currentTopicValue;
}

function renderLessons() {
    const accordionEl = document.getElementById("lesson-accordion");
    if (!accordionEl) return;

    const keyword = lessonSearch.value.trim().toLowerCase();

    // Ghi nhớ các chủ đề và bài học đang mở
    const openTopicIds = new Set();
    accordionEl.querySelectorAll(".accordion-item.open").forEach(function (item) {
        if (item.dataset.topicId) openTopicIds.add(item.dataset.topicId);
    });

    const openLessonIds = new Set();
    accordionEl.querySelectorAll(".lesson-item.open").forEach(function (item) {
        if (item.dataset.lessonId) openLessonIds.add(item.dataset.lessonId);
    });

    accordionEl.innerHTML = "";

    const sortedTopics = [].concat(topics).sort(function (a, b) {
        if (a.level !== b.level) return a.level.localeCompare(b.level);
        return (a.display_order || 0) - (b.display_order || 0);
    });

    let anyTopicMatch = false;

    sortedTopics.forEach(function (topic) {
        const topicLessons = lessons
            .filter(function (lesson) {
                if (lesson.topicId !== topic.id) return false;
                if (!keyword) return true;

                const matchLesson = lesson.name.toLowerCase().includes(keyword) ||
                    (lesson.description || "").toLowerCase().includes(keyword) ||
                    topic.name.toLowerCase().includes(keyword);

                const matchVocab = vocabularies.some(function (v) {
                    return v.lessonId === lesson.id && (
                        v.word.toLowerCase().includes(keyword) ||
                        v.meaning.toLowerCase().includes(keyword) ||
                        (v.example || "").toLowerCase().includes(keyword)
                    );
                });

                return matchLesson || matchVocab;
            })
            .sort((a, b) => (a.order || 0) - (b.order || 0));

        const totalInTopic = lessons.filter(l => l.topicId === topic.id).length;
        if (keyword && topicLessons.length === 0) return;

        anyTopicMatch = true;
        const isTopicOpen = openTopicIds.has(String(topic.id)) || Boolean(keyword && topicLessons.length > 0);

        /* CẤP 1: CHỦ ĐỀ */
        const topicItem = document.createElement("div");
        topicItem.className = "accordion-item" + (isTopicOpen ? " open" : "");
        topicItem.dataset.topicId = String(topic.id);

        const topicHeader = document.createElement("button");
        topicHeader.type = "button";
        topicHeader.className = "accordion-header";

        const headerLeft = document.createElement("div");
        headerLeft.className = "accordion-header-left";

        const badge = document.createElement("span");
        badge.className = "accordion-badge badge-topic-level";
        badge.textContent = topic.level;

        const titleBox = document.createElement("div");
        titleBox.className = "accordion-title-box";

        const title = document.createElement("span");
        title.className = "accordion-title";
        title.textContent = topic.name;

        if (topic.description) {
            const subDesc = document.createElement("span");
            subDesc.className = "accordion-subdesc";
            subDesc.textContent = topic.description;
            titleBox.append(title, subDesc);
        } else {
            titleBox.append(title);
        }

        headerLeft.append(badge, titleBox);

        const headerRight = document.createElement("div");
        headerRight.className = "accordion-header-right";

        const countEl = document.createElement("span");
        countEl.className = "accordion-count";
        countEl.textContent = (keyword ? topicLessons.length + "/" + totalInTopic : totalInTopic) + " bài học";

        const chevron = document.createElement("span");
        chevron.className = "accordion-chevron";
        chevron.textContent = "›";

        headerRight.append(countEl, chevron);
        topicHeader.append(headerLeft, headerRight);

        topicHeader.addEventListener("click", function () {
            topicItem.classList.toggle("open");
        });

        const topicBody = document.createElement("div");
        topicBody.className = "accordion-body";

        if (topicLessons.length === 0) {
            const emptyTopic = document.createElement("p");
            emptyTopic.className = "accordion-empty";
            emptyTopic.textContent = "Chưa có bài học nào trong chủ đề này.";
            topicBody.appendChild(emptyTopic);
        } else {
            topicLessons.forEach(function (lesson) {
                const lessonVocabs = vocabularies.filter(v => v.lessonId === lesson.id);

                const hasMatchedVocab = keyword && lessonVocabs.some(function (v) {
                    return v.word.toLowerCase().includes(keyword) ||
                        v.meaning.toLowerCase().includes(keyword) ||
                        (v.example || "").toLowerCase().includes(keyword);
                });

                const isLessonOpen = openLessonIds.has(String(lesson.id)) || Boolean(hasMatchedVocab);

                /* CẤP 2: BÀI HỌC */
                const lessonItem = document.createElement("div");
                lessonItem.className = "lesson-item" + (isLessonOpen ? " open" : "");
                lessonItem.dataset.lessonId = String(lesson.id);

                const lessonHeader = document.createElement("div");
                lessonHeader.className = "lesson-header";
                lessonHeader.title = "Bấm để xem danh sách từ vựng trong bài học này";

                const lHeaderLeft = document.createElement("div");
                lHeaderLeft.className = "lesson-header-left";

                const lChevron = document.createElement("span");
                lChevron.className = "lesson-chevron";
                lChevron.textContent = "›";

                const lIcon = document.createElement("span");
                lIcon.className = "lesson-icon";
                lIcon.textContent = "📖";

                const lInfo = document.createElement("div");
                lInfo.className = "lesson-info";

                const lName = document.createElement("span");
                lName.className = "lesson-name";
                lName.textContent = lesson.name;

                const lDesc = document.createElement("span");
                lDesc.className = "lesson-desc";
                lDesc.textContent = lesson.description || "Chưa có mô tả";

                lInfo.append(lName, lDesc);
                lHeaderLeft.append(lChevron, lIcon, lInfo);

                const lHeaderRight = document.createElement("div");
                lHeaderRight.className = "lesson-header-right";

                const lVocabCount = document.createElement("span");
                lVocabCount.className = "lesson-vocab-pill";
                lVocabCount.textContent = lessonVocabs.length + " từ vựng";

                const lStatusBadge = document.createElement("span");
                const isActive = Number(lesson.is_active) === 1;
                lStatusBadge.className = isActive ? "badge-active" : "badge-inactive";
                lStatusBadge.textContent = isActive ? "Hoạt động" : "Ngừng";

                const lOrder = document.createElement("span");
                lOrder.className = "lesson-order-badge";
                lOrder.textContent = "Lesson " + lesson.order;

                const lActions = document.createElement("div");
                lActions.className = "topic-card-actions";

                const btnAddVocab = document.createElement("button");
                btnAddVocab.type = "button";
                btnAddVocab.className = "btn-add-vocab-quick";
                btnAddVocab.textContent = "+ Từ vựng";
                btnAddVocab.title = "Thêm từ vựng mới vào bài học này";
                btnAddVocab.addEventListener("click", function (e) {
                    e.stopPropagation();
                    quickAddVocabularyForLesson(lesson.id);
                });

                const editBtn = document.createElement("button");
                editBtn.type = "button";
                editBtn.textContent = "Sửa";
                editBtn.className = "btn-edit";
                editBtn.addEventListener("click", function (e) {
                    e.stopPropagation();
                    editLesson(lesson.id);
                });

                const deleteBtn = document.createElement("button");
                deleteBtn.type = "button";
                deleteBtn.textContent = "Xóa";
                deleteBtn.className = "btn-delete";
                deleteBtn.addEventListener("click", function (e) {
                    e.stopPropagation();
                    deleteLesson(lesson.id);
                });

                lActions.append(btnAddVocab, editBtn, deleteBtn);
                lHeaderRight.append(lVocabCount, lStatusBadge, lOrder, lActions);
                lessonHeader.append(lHeaderLeft, lHeaderRight);

                lessonHeader.addEventListener("click", function () {
                    lessonItem.classList.toggle("open");
                });

                /* CẤP 3: TỪ VỰNG TRONG BÀI HỌC */
                const lessonBody = document.createElement("div");
                lessonBody.className = "lesson-body";

                const vocabSubHeader = document.createElement("div");
                vocabSubHeader.className = "vocab-sub-header";

                const vocabSubTitle = document.createElement("span");
                vocabSubTitle.className = "vocab-sub-title";
                vocabSubTitle.textContent = "Danh sách từ vựng (" + lessonVocabs.length + ")";

                const btnAddVocabHeader = document.createElement("button");
                btnAddVocabHeader.type = "button";
                btnAddVocabHeader.className = "btn-link-action";
                btnAddVocabHeader.textContent = "+ Thêm từ vựng";
                btnAddVocabHeader.addEventListener("click", function (e) {
                    e.stopPropagation();
                    quickAddVocabularyForLesson(lesson.id);
                });

                vocabSubHeader.append(vocabSubTitle, btnAddVocabHeader);
                lessonBody.appendChild(vocabSubHeader);

                if (lessonVocabs.length === 0) {
                    const emptyVocab = document.createElement("div");
                    emptyVocab.className = "vocab-empty-box";
                    emptyVocab.innerHTML = "<span>Bài học này chưa có từ vựng nào.</span>";

                    const btnEmptyAdd = document.createElement("button");
                    btnEmptyAdd.type = "button";
                    btnEmptyAdd.className = "btn-primary btn-sm";
                    btnEmptyAdd.textContent = "+ Thêm từ vựng ngay";
                    btnEmptyAdd.addEventListener("click", function (e) {
                        e.stopPropagation();
                        quickAddVocabularyForLesson(lesson.id);
                    });

                    emptyVocab.appendChild(btnEmptyAdd);
                    lessonBody.appendChild(emptyVocab);
                } else {
                    const tableWrapper = document.createElement("div");
                    tableWrapper.className = "vocab-subtable-container";

                    const table = document.createElement("table");
                    table.className = "vocab-subtable";

                    const thead = document.createElement("thead");
                    thead.innerHTML = "<tr>" +
                        "<th>Từ tiếng Anh</th>" +
                        "<th>Phiên âm</th>" +
                        "<th>Nghĩa tiếng Việt</th>" +
                        "<th>Loại từ</th>" +
                        "<th>Câu ví dụ</th>" +
                        "<th>Thao tác</th>" +
                        "</tr>";

                    const tbody = document.createElement("tbody");

                    lessonVocabs.forEach(function (vocab) {
                        const tr = document.createElement("tr");

                        const tdWord = document.createElement("td");
                        tdWord.className = "vocab-td-word";
                        tdWord.textContent = vocab.word;

                        const tdPronun = document.createElement("td");
                        tdPronun.className = "vocab-td-pronun pronun-cell";
                        const pronunSpan = document.createElement("span");
                        pronunSpan.textContent = vocab.pronunciation || "-";
                        tdPronun.appendChild(pronunSpan);
                        if (vocab.word) {
                            const speakBtn = document.createElement("button");
                            speakBtn.type = "button";
                            speakBtn.className = "btn-speak";
                            speakBtn.title = "Phát âm: " + vocab.word;
                            speakBtn.textContent = "🔊";
                            speakBtn.addEventListener("click", function (e) {
                                e.stopPropagation();
                                speakWord(vocab.word, speakBtn);
                            });
                            tdPronun.appendChild(speakBtn);
                        }

                        const tdMeaning = document.createElement("td");
                        tdMeaning.className = "vocab-td-meaning";
                        tdMeaning.textContent = vocab.meaning;

                        const tdType = document.createElement("td");
                        const typeBadge = document.createElement("span");
                        typeBadge.className = "vocab-type-badge";
                        typeBadge.textContent = vocab.type || "Khác";
                        tdType.appendChild(typeBadge);

                        const tdExample = document.createElement("td");
                        tdExample.className = "vocab-td-example";
                        tdExample.textContent = vocab.example || "-";

                        const tdActions = document.createElement("td");
                        tdActions.className = "vocab-td-actions";

                        const editVocabBtn = document.createElement("button");
                        editVocabBtn.type = "button";
                        editVocabBtn.className = "btn-edit";
                        editVocabBtn.textContent = "Sửa";
                        editVocabBtn.addEventListener("click", function (e) {
                            e.stopPropagation();
                            switchToPage("vocabulary");
                            editVocabulary(vocab.id);
                        });

                        const deleteVocabBtn = document.createElement("button");
                        deleteVocabBtn.type = "button";
                        deleteVocabBtn.className = "btn-delete";
                        deleteVocabBtn.textContent = "Xóa";
                        deleteVocabBtn.addEventListener("click", function (e) {
                            e.stopPropagation();
                            deleteVocabulary(vocab.id);
                        });

                        tdActions.append(editVocabBtn, deleteVocabBtn);
                        tr.append(tdWord, tdPronun, tdMeaning, tdType, tdExample, tdActions);
                        tbody.appendChild(tr);
                    });

                    table.append(thead, tbody);
                    tableWrapper.appendChild(table);
                    lessonBody.appendChild(tableWrapper);
                }

                lessonItem.append(lessonHeader, lessonBody);
                topicBody.appendChild(lessonItem);
            });
        }

        topicItem.append(topicHeader, topicBody);
        accordionEl.appendChild(topicItem);
    });

    if (!anyTopicMatch) {
        const noResult = document.createElement("div");
        noResult.className = "accordion-no-result";
        noResult.textContent = "Không tìm thấy bài học hoặc từ vựng phù hợp.";
        accordionEl.appendChild(noResult);
    }
}

function openLessonForm(lesson = null) {
    lessonForm.reset();
    renderLessonTopicOptions();
    lessonFormContainer.classList.remove("hidden");

    if (lesson) {
        lessonFormTitle.textContent = "Sửa bài học";
        lessonNameInput.value = lesson.name;
        lessonTopicInput.value = String(lesson.topicId);
        lessonOrderInput.value = lesson.order;
        lessonDescriptionInput.value = lesson.description;
        lessonActiveInput.value = String(lesson.is_active ?? 1);
        editingLessonId = lesson.id;
    } else {
        lessonFormTitle.textContent = "Thêm bài học";
        lessonOrderInput.value = 1;
        editingLessonId = null;
        lessonActiveInput.value = "1";
    }

    lessonFormContainer.scrollIntoView({ behavior: "smooth", block: "center" });
    lessonNameInput.focus();
}

function editLesson(id) {
    const lesson = lessons.find(item => item.id === id);
    if (lesson) openLessonForm(lesson);
}

function deleteLesson(id) {
    const lesson = lessons.find(item => item.id === id);
    if (!lesson) return;

    const hasVocabs = vocabularies.some(v => v.lessonId === id);
    if (hasVocabs) {
        alert("Không thể xóa bài học này vì vẫn còn từ vựng bên trong. Vui lòng xóa các từ vựng trước.");
        return;
    }

    const confirmed = confirm("Bạn có chắc muốn xóa bài học " + lesson.name + "?");
    if (!confirmed) return;

    fetchAPI(`/lessons/${id}`, "DELETE").then(() => loadAllData()).catch((error) => alert(error.message));
}

addLessonButton.addEventListener("click", function () {
    openLessonForm();
});

cancelLessonButton.addEventListener("click", function () {
    lessonFormContainer.classList.add("hidden");
    lessonForm.reset();
    editingLessonId = null;
});

lessonForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = lessonNameInput.value.trim();
    const topicId = Number(lessonTopicInput.value);
    const order = Number(lessonOrderInput.value);
    const description = lessonDescriptionInput.value.trim();
    const is_active = Number(lessonActiveInput.value);

    if (!name || !topicId || !Number.isInteger(order) || order < 1 || ![0, 1].includes(is_active)) {
        alert("Vui lòng nhập đầy đủ thông tin hợp lệ.");
        return;
    }

    const topicExists = topics.some(topic => topic.id === topicId);
    if (!topicExists) {
        alert("Vui lòng chọn một chủ đề hợp lệ.");
        return;
    }

    const duplicateOrder = lessons.some(function (lesson) {
        return lesson.topicId === topicId && lesson.order === order && lesson.id !== editingLessonId;
    });

    if (duplicateOrder) {
        alert("Thứ tự này đã được sử dụng trong chủ đề đã chọn.");
        return;
    }

    const current = editingLessonId !== null ? lessons.find(item => item.id === editingLessonId) : null;
    const payload = {
        topic_id: topicId,
        name,
        description: description || null,
        display_order: order,
        is_active: is_active === 1,
        pronunciation_passing_score: current?.pronunciationPassingScore ?? 70,
        pronunciation_max_attempts: current?.pronunciationMaxAttempts ?? 7
    };
    try {
        if (editingLessonId !== null) {
            await fetchAPI(`/lessons/${editingLessonId}`, "PATCH", payload);
        } else {
            await fetchAPI("/lessons", "POST", payload);
        }
        await loadAllData();
        lessonFormContainer.classList.add("hidden");
        lessonForm.reset();
        editingLessonId = null;
    } catch (error) {
        alert(error.message);
    }
});

lessonSearch.addEventListener("input", renderLessons);

/* ================================================================
   4. QUẢN LÝ TỪ VỰNG (VOCABULARY)
================================================================ */

const vocabularyList = document.getElementById("vocabulary-list");
const vocabularyForm = document.getElementById("vocabulary-form");
const vocabularyFormContainer = document.getElementById("vocabulary-form-container");
const vocabularyFormTitle = document.getElementById("vocabulary-form-title");

const vocabularyWordInput = document.getElementById("vocabulary-word");
const vocabularyMeaningInput = document.getElementById("vocabulary-meaning");
const vocabularyPronunciationInput = document.getElementById("vocabulary-pronunciation");
const vocabularyTypeInput = document.getElementById("vocabulary-type");
const vocabularyLessonInput = document.getElementById("vocabulary-lesson");
const vocabularyExampleInput = document.getElementById("vocabulary-example");

const vocabularySearch = document.getElementById("vocabulary-search");
const vocabularyLessonFilter = document.getElementById("vocabulary-lesson-filter");

const addVocabularyButton = document.getElementById("btn-add-vocabulary");
const cancelVocabularyButton = document.getElementById("btn-cancel-vocabulary");

/* ---- Hàm phát âm thanh (Web Speech API) ---- */
function speakWord(word, btnEl) {
    if (!("speechSynthesis" in window)) {
        alert("Trình duyệt của bạn không hỗ trợ phát âm thanh.");
        return;
    }
    // Hủy phát âm đang chạy
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(word);
    utter.lang = "en-US";
    utter.rate = 0.9;

    if (btnEl) {
        btnEl.classList.add("btn-speak--playing");
        utter.onend = function () { btnEl.classList.remove("btn-speak--playing"); };
        utter.onerror = function () { btnEl.classList.remove("btn-speak--playing"); };
    }

    window.speechSynthesis.speak(utter);
}

function renderVocabularyLessonOptions() {
    if (!vocabularyLessonInput || !vocabularyLessonFilter) return;

    const currentLessonValue = vocabularyLessonInput.value;
    const currentFilterValue = vocabularyLessonFilter.value;

    vocabularyLessonInput.innerHTML = '<option value="">Chọn bài học</option>';
    vocabularyLessonFilter.innerHTML = '<option value="">Tất cả bài học</option>';

    lessons.forEach(function (lesson) {
        const topicName = getTopicName(lesson.topicId);
        const label = lesson.name + " (" + topicName + ")";

        const formOption = document.createElement("option");
        formOption.value = lesson.id;
        formOption.textContent = label;
        vocabularyLessonInput.appendChild(formOption);

        const filterOption = document.createElement("option");
        filterOption.value = lesson.id;
        filterOption.textContent = label;
        vocabularyLessonFilter.appendChild(filterOption);
    });

    vocabularyLessonInput.value = currentLessonValue;
    vocabularyLessonFilter.value = currentFilterValue;
}

function renderVocabularies() {
    if (!vocabularyList) return;
    vocabularyList.innerHTML = "";

    const keyword = vocabularySearch ? vocabularySearch.value.trim().toLowerCase() : "";
    const selectedLesson = vocabularyLessonFilter ? vocabularyLessonFilter.value : "";

    const filteredVocabularies = vocabularies.filter(function (vocabulary) {
        const lessonName = getLessonName(vocabulary.lessonId);

        const matchesSearch =
            vocabulary.word.toLowerCase().includes(keyword) ||
            vocabulary.meaning.toLowerCase().includes(keyword) ||
            lessonName.toLowerCase().includes(keyword);

        const matchesLesson =
            selectedLesson === "" ||
            String(vocabulary.lessonId) === selectedLesson;

        return matchesSearch && matchesLesson;
    });

    if (filteredVocabularies.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 8;
        cell.textContent = "Không tìm thấy từ vựng phù hợp.";
        cell.style.textAlign = "center";
        row.appendChild(cell);
        vocabularyList.appendChild(row);
        return;
    }

    filteredVocabularies.forEach(function (vocabulary) {
        const row = document.createElement("tr");

        // ID
        const tdId = document.createElement("td");
        tdId.textContent = vocabulary.id;
        row.appendChild(tdId);

        // Từ tiếng Anh
        const tdWord = document.createElement("td");
        tdWord.textContent = vocabulary.word;
        row.appendChild(tdWord);

        // Nghĩa tiếng Việt
        const tdMeaning = document.createElement("td");
        tdMeaning.textContent = vocabulary.meaning;
        row.appendChild(tdMeaning);

        // Phiên âm + nút phát âm
        const tdPronun = document.createElement("td");
        tdPronun.className = "pronun-cell";
        const pronunText = document.createElement("span");
        pronunText.textContent = vocabulary.pronunciation || "Chưa có";
        tdPronun.appendChild(pronunText);
        if (vocabulary.word) {
            const speakBtn = document.createElement("button");
            speakBtn.type = "button";
            speakBtn.className = "btn-speak";
            speakBtn.title = "Phát âm: " + vocabulary.word;
            speakBtn.textContent = "🔊";
            speakBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                speakWord(vocabulary.word, speakBtn);
            });
            tdPronun.appendChild(speakBtn);
        }
        row.appendChild(tdPronun);

        // Loại từ
        const tdType = document.createElement("td");
        tdType.textContent = vocabulary.type;
        row.appendChild(tdType);

        // Bài học
        const tdLesson = document.createElement("td");
        tdLesson.textContent = getLessonName(vocabulary.lessonId);
        row.appendChild(tdLesson);

        // Câu ví dụ
        const tdExample = document.createElement("td");
        tdExample.textContent = vocabulary.example || "Chưa có";
        row.appendChild(tdExample);

        const actionCell = document.createElement("td");

        const editButton = document.createElement("button");
        editButton.textContent = "Sửa";
        editButton.className = "btn-edit";
        editButton.addEventListener("click", function () {
            editVocabulary(vocabulary.id);
        });

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Xóa";
        deleteButton.className = "btn-delete";
        deleteButton.addEventListener("click", function () {
            deleteVocabulary(vocabulary.id);
        });

        actionCell.append(editButton, deleteButton);
        row.appendChild(actionCell);
        vocabularyList.appendChild(row);
    });
}

function openVocabularyForm(vocabulary = null) {
    vocabularyForm.reset();
    renderVocabularyLessonOptions();
    vocabularyFormContainer.classList.remove("hidden");

    if (vocabulary) {
        vocabularyFormTitle.textContent = "Sửa từ vựng";
        vocabularyWordInput.value = vocabulary.word;
        vocabularyMeaningInput.value = vocabulary.meaning;
        vocabularyPronunciationInput.value = vocabulary.pronunciation;
        vocabularyTypeInput.value = vocabulary.type;
        vocabularyLessonInput.value = String(vocabulary.lessonId);
        vocabularyExampleInput.value = vocabulary.example;
        editingVocabularyId = vocabulary.id;
    } else {
        vocabularyFormTitle.textContent = "Thêm từ vựng";
        editingVocabularyId = null;
    }

    vocabularyFormContainer.scrollIntoView({ behavior: "smooth", block: "center" });
    vocabularyWordInput.focus();
}

function editVocabulary(id) {
    const vocabulary = vocabularies.find(item => item.id === id);
    if (vocabulary) openVocabularyForm(vocabulary);
}

function deleteVocabulary(id) {
    const vocabulary = vocabularies.find(item => item.id === id);
    if (!vocabulary) return;

    const confirmed = confirm("Bạn có chắc muốn xóa từ vựng " + vocabulary.word + "?");
    if (!confirmed) return;

    fetchAPI(`/words/${id}`, "DELETE").then(() => loadAllData()).catch((error) => alert(error.message));
}

addVocabularyButton.addEventListener("click", function () {
    openVocabularyForm();
});

cancelVocabularyButton.addEventListener("click", function () {
    vocabularyFormContainer.classList.add("hidden");
    vocabularyForm.reset();
    editingVocabularyId = null;
});

vocabularyForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const word = vocabularyWordInput.value.trim();
    const meaning = vocabularyMeaningInput.value.trim();
    const pronunciation = vocabularyPronunciationInput.value.trim();
    const type = vocabularyTypeInput.value;
    const lessonId = Number(vocabularyLessonInput.value);
    const example = vocabularyExampleInput.value.trim();

    if (!word || !meaning || !type || !lessonId) {
        alert("Vui lòng nhập đầy đủ thông tin bắt buộc.");
        return;
    }

    const lessonExists = lessons.some(lesson => lesson.id === lessonId);
    if (!lessonExists) {
        alert("Vui lòng chọn một bài học hợp lệ.");
        return;
    }

    const duplicateWord = vocabularies.some(function (vocabulary) {
        return vocabulary.word.toLowerCase() === word.toLowerCase() &&
            vocabulary.lessonId === lessonId &&
            vocabulary.id !== editingVocabularyId;
    });

    if (duplicateWord) {
        alert("Từ vựng này đã tồn tại trong bài học đã chọn.");
        return;
    }

    const payload = {
        lesson_id: lessonId,
        word,
        meaning,
        pronunciation: pronunciation || null,
        part_of_speech: type,
        example: example || null
    };
    try {
        if (editingVocabularyId !== null) {
            await fetchAPI(`/words/${editingVocabularyId}`, "PATCH", payload);
        } else {
            await fetchAPI("/words", "POST", payload);
        }
        await loadAllData();
        vocabularyFormContainer.classList.add("hidden");
        vocabularyForm.reset();
        editingVocabularyId = null;
    } catch (error) {
        alert(error.message);
    }
});

vocabularySearch.addEventListener("input", renderVocabularies);
vocabularyLessonFilter.addEventListener("change", renderVocabularies);

/* ================================================================
   5. THỐNG KÊ DASHBOARD
================================================================ */

function renderDashboardStats() {
    const elLevels = document.getElementById("stat-levels");
    const elTopics = document.getElementById("stat-topics");
    const elLessons = document.getElementById("stat-lessons");
    const elVocabs = document.getElementById("stat-vocabularies");

    if (elLevels) elLevels.textContent = levels.length;
    if (elTopics) elTopics.textContent = topics.length;
    if (elLessons) elLessons.textContent = lessons.length;
    if (elVocabs) elVocabs.textContent = vocabularies.length;

    renderVocabularyChart();
}

function renderVocabularyChart() {
    const chart = document.getElementById("vocabulary-chart");
    if (!chart) return;

    chart.innerHTML = "";

    if (lessons.length === 0) {
        chart.textContent = "Chưa có bài học để thống kê.";
        return;
    }

    const chartData = lessons.map(lesson => {
        const count = vocabularies.filter(v => v.lessonId === lesson.id).length;
        return { name: lesson.name, count: count };
    });

    const maxCount = Math.max(1, ...chartData.map(item => item.count));

    chartData.forEach(item => {
        const row = document.createElement("div");
        row.className = "chart-row";

        const label = document.createElement("div");
        label.className = "chart-label";
        label.textContent = item.name;
        label.title = item.name;

        const track = document.createElement("div");
        track.className = "chart-track";

        const bar = document.createElement("div");
        bar.className = "chart-bar";
        const width = item.count === 0 ? 0 : (item.count / maxCount) * 100;
        bar.style.width = width + "%";
        track.appendChild(bar);

        const value = document.createElement("div");
        value.className = "chart-value";
        value.textContent = item.count;

        row.append(label, track, value);
        chart.appendChild(row);
    });
}

/* ================================================================
   KHỞI TẠO TẤT CẢ DỮ LIỆU BAN ĐẦU
================================================================ */

function initApp() {
    renderLevels();
    updateTopicLevelOptions();
    renderTopics();
    renderLessonTopicOptions();
    renderLessons();
    renderVocabularyLessonOptions();
    renderVocabularies();
    renderDashboardStats();
    loadAllData(); // Gọi nạp dữ liệu từ API thay cho dữ liệu mẫu
}

initApp();
