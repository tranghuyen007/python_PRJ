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

        // Ẩn tất cả khu vực nội dung
        pages.forEach(function (page) {
            page.classList.add("hidden");
        });

        // Hiện khu vực được chọn
        document.getElementById(pageName)
            .classList.remove("hidden");

        // Cập nhật tiêu đề
        pageTitle.textContent = titles[pageName];

        // Cập nhật menu đang được chọn
        menuItems.forEach(function (menu) {
            menu.classList.remove("active");
        });

        item.classList.add("active");
    });
});
// Quản lý cấp độ
const levelList = document.getElementById("level-list");

let levels = [
    { id: 1, name: "A1", description: "Sơ cấp" },
    { id: 2, name: "A2", description: "Tiền trung cấp" },
    { id: 3, name: "B1", description: "Trung cấp" },
    { id: 4, name: "B2", description: "Trung cấp cao" },
    { id: 5, name: "C1", description: "Cao cấp" }
];

let editingId = null;

function renderLevels() {
    levelList.innerHTML = "";

    levels.forEach(function (level) {
        const row = document.createElement("tr");

        const idCell = document.createElement("td");
        idCell.textContent = level.id;

        const nameCell = document.createElement("td");
        nameCell.textContent = level.name;

        const descriptionCell = document.createElement("td");
        descriptionCell.textContent = level.description;

        row.append(idCell, nameCell, descriptionCell);
        levelList.appendChild(row);
    });
}

renderLevels();

// Quản lý chủ đề
const topicList = document.getElementById("topic-list");
const topicForm = document.getElementById("topic-form");
const topicFormContainer = document.getElementById("topic-form-container");
const topicFormTitle = document.getElementById("topic-form-title");

const topicNameInput = document.getElementById("topic-name");
const topicLevelInput = document.getElementById("topic-level");
const topicDescriptionInput = document.getElementById("topic-description");

const topicSearch = document.getElementById("topic-search");
const topicLevelFilter = document.getElementById("topic-level-filter");

const addTopicButton = document.getElementById("btn-add-topic");
const cancelTopicButton = document.getElementById("btn-cancel-topic");

let topics = [
    { id: 1, name: "Greetings", level: "A1", description: "Chào hỏi" },
    { id: 2, name: "Family", level: "A1", description: "Gia đình" },
    { id: 3, name: "Food", level: "A1", description: "Thức ăn" },
    { id: 4, name: "Travel", level: "A2", description: "Du lịch" },
    { id: 5, name: "Education", level: "B1", description: "Giáo dục" }
];

let editingTopicId = null;

function renderTopics() {
    topicList.innerHTML = "";

    const keyword = topicSearch.value.trim().toLowerCase();
    const selectedLevel = topicLevelFilter.value;

    const filteredTopics = topics.filter(function (topic) {
        const matchesName = topic.name.toLowerCase().includes(keyword);
        const matchesLevel =
            selectedLevel === "" || topic.level === selectedLevel;

        return matchesName && matchesLevel;
    });

    if (filteredTopics.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 5;
        cell.textContent = "Không tìm thấy chủ đề phù hợp.";
        cell.style.textAlign = "center";

        row.appendChild(cell);
        topicList.appendChild(row);
        return;
    }

    filteredTopics.forEach(function (topic) {
        const row = document.createElement("tr");

        const idCell = document.createElement("td");
        idCell.textContent = topic.id;

        const nameCell = document.createElement("td");
        nameCell.textContent = topic.name;

        const levelCell = document.createElement("td");
        levelCell.textContent = topic.level;

        const descriptionCell = document.createElement("td");
        descriptionCell.textContent = topic.description;

        const actionCell = document.createElement("td");

        const editButton = document.createElement("button");
        editButton.textContent = "Sửa";
        editButton.className = "btn-edit";
        editButton.addEventListener("click", function () {
            editTopic(topic.id);
        });

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Xóa";
        deleteButton.className = "btn-delete";
        deleteButton.addEventListener("click", function () {
            deleteTopic(topic.id);
        });

        actionCell.append(editButton, deleteButton);
        row.append(idCell, nameCell, levelCell, descriptionCell, actionCell);

        topicList.appendChild(row);
    });
}

function openTopicForm(topic = null) {
    topicForm.reset();
    topicFormContainer.classList.remove("hidden");

    if (topic) {
        topicFormTitle.textContent = "Sửa chủ đề";
        topicNameInput.value = topic.name;
        topicLevelInput.value = topic.level;
        topicDescriptionInput.value = topic.description;
        editingTopicId = topic.id;
    } else {
        topicFormTitle.textContent = "Thêm chủ đề";
        editingTopicId = null;
    }

    topicNameInput.focus();
}

function editTopic(id) {
    const topic = topics.find(function (item) {
        return item.id === id;
    });

    if (topic) {
        openTopicForm(topic);
    }
}

function deleteTopic(id) {
    const topic = topics.find(function (item) {
        return item.id === id;
    });

    if (!topic) return;

    const confirmed = confirm(
        "Bạn có chắc muốn xóa chủ đề " + topic.name + "?"
    );

    if (!confirmed) return;

    topics = topics.filter(function (item) {
        return item.id !== id;
    });

    renderTopics();
    renderDashboardStats();
}

addTopicButton.addEventListener("click", function () {
    openTopicForm();
});

cancelTopicButton.addEventListener("click", function () {
    topicFormContainer.classList.add("hidden");
    topicForm.reset();
    editingTopicId = null;
});

topicForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const name = topicNameInput.value.trim();
    const level = topicLevelInput.value;
    const description = topicDescriptionInput.value.trim();

    if (!name || !level) {
        alert("Vui lòng nhập tên chủ đề và chọn cấp độ.");
        return;
    }

    const duplicate = topics.some(function (topic) {
        return topic.name.toLowerCase() === name.toLowerCase()
            && topic.level === level
            && topic.id !== editingTopicId;
    });

    if (duplicate) {
        alert("Chủ đề này đã tồn tại trong cấp độ đã chọn.");
        return;
    }

    if (editingTopicId !== null) {
        const topic = topics.find(function (item) {
            return item.id === editingTopicId;
        });

        if (topic) {
            topic.name = name;
            topic.level = level;
            topic.description = description;
        }
    } else {
        const newId = topics.length > 0
            ? Math.max(...topics.map(function (item) {
                return item.id;
            })) + 1
            : 1;

        topics.push({
            id: newId,
            name: name,
            level: level,
            description: description
        });
    }

    renderTopics();
    renderDashboardStats();
    topicFormContainer.classList.add("hidden");
    topicForm.reset();
    editingTopicId = null;
});

topicSearch.addEventListener("input", renderTopics);
topicLevelFilter.addEventListener("change", renderTopics);

renderTopics();


const lessonList = document.getElementById("lesson-list");
const lessonForm = document.getElementById("lesson-form");
const lessonFormContainer = document.getElementById("lesson-form-container");
const lessonFormTitle = document.getElementById("lesson-form-title");

const lessonNameInput = document.getElementById("lesson-name");
const lessonTopicInput = document.getElementById("lesson-topic");
const lessonOrderInput = document.getElementById("lesson-order");
const lessonDescriptionInput = document.getElementById("lesson-description");

const lessonSearch = document.getElementById("lesson-search");
const lessonTopicFilter = document.getElementById("lesson-topic-filter");

const addLessonButton = document.getElementById("btn-add-lesson");
const cancelLessonButton = document.getElementById("btn-cancel-lesson");

let lessons = [
    {
        id: 1,
        name: "Basic Greetings",
        topicId: 1,
        order: 1,
        description: "Các từ vựng chào hỏi cơ bản"
    },
    {
        id: 2,
        name: "Introducing Yourself",
        topicId: 1,
        order: 2,
        description: "Giới thiệu bản thân"
    },
    {
        id: 3,
        name: "Family Members",
        topicId: 2,
        order: 1,
        description: "Từ vựng về gia đình"
    },
    {
        id: 4,
        name: "Food and Drinks",
        topicId: 3,
        order: 1,
        description: "Từ vựng về thức ăn và đồ uống"
    },
    {
        id: 5,
        name: "Planning a Trip",
        topicId: 4,
        order: 1,
        description: "Từ vựng về du lịch"
    }
];

let editingLessonId = null;

// Tìm tên chủ đề dựa vào ID
function getTopicName(topicId) {
    const topic = topics.find(function (item) {
        return item.id === topicId;
    });

    return topic ? topic.name + " (" + topic.level + ")" : "Chủ đề không tồn tại";
}

// Đổ danh sách chủ đề vào các ô lựa chọn
function renderLessonTopicOptions() {
    const currentTopicValue = lessonTopicInput.value;
    const currentFilterValue = lessonTopicFilter.value;

    lessonTopicInput.innerHTML =
        '<option value="">Chọn chủ đề</option>';

    lessonTopicFilter.innerHTML =
        '<option value="">Tất cả chủ đề</option>';

    topics.forEach(function (topic) {
        const formOption = document.createElement("option");
        formOption.value = topic.id;
        formOption.textContent = topic.name + " (" + topic.level + ")";
        lessonTopicInput.appendChild(formOption);

        const filterOption = document.createElement("option");
        filterOption.value = topic.id;
        filterOption.textContent = topic.name + " (" + topic.level + ")";
        lessonTopicFilter.appendChild(filterOption);
    });

    lessonTopicInput.value = currentTopicValue;
    lessonTopicFilter.value = currentFilterValue;
}

// Hiển thị danh sách bài học
function renderLessons() {
    lessonList.innerHTML = "";

    const keyword = lessonSearch.value.trim().toLowerCase();
    const selectedTopic = lessonTopicFilter.value;

    const filteredLessons = lessons
        .filter(function (lesson) {
            const topicName = getTopicName(lesson.topicId);

            const matchesSearch =
                lesson.name.toLowerCase().includes(keyword) ||
                topicName.toLowerCase().includes(keyword);

            const matchesTopic =
                selectedTopic === "" ||
                String(lesson.topicId) === selectedTopic;

            return matchesSearch && matchesTopic;
        })
        .sort(function (a, b) {
            if (a.topicId !== b.topicId) {
                return a.topicId - b.topicId;
            }

            return a.order - b.order;
        });

    if (filteredLessons.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 6;
        cell.textContent = "Không tìm thấy bài học phù hợp.";
        cell.style.textAlign = "center";

        row.appendChild(cell);
        lessonList.appendChild(row);
        return;
    }

    filteredLessons.forEach(function (lesson) {
        const row = document.createElement("tr");

        const idCell = document.createElement("td");
        idCell.textContent = lesson.id;

        const nameCell = document.createElement("td");
        nameCell.textContent = lesson.name;

        const topicCell = document.createElement("td");
        topicCell.textContent = getTopicName(lesson.topicId);

        const orderCell = document.createElement("td");
        orderCell.textContent = lesson.order;

        const descriptionCell = document.createElement("td");
        descriptionCell.textContent = lesson.description;

        const actionCell = document.createElement("td");

        const editButton = document.createElement("button");
        editButton.textContent = "Sửa";
        editButton.className = "btn-edit";

        editButton.addEventListener("click", function () {
            editLesson(lesson.id);
        });

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Xóa";
        deleteButton.className = "btn-delete";

        deleteButton.addEventListener("click", function () {
            deleteLesson(lesson.id);
        });

        actionCell.append(editButton, deleteButton);

        row.append(
            idCell,
            nameCell,
            topicCell,
            orderCell,
            descriptionCell,
            actionCell
        );

        lessonList.appendChild(row);
    });
}

// Mở biểu mẫu thêm hoặc sửa
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

        editingLessonId = lesson.id;
    } else {
        lessonFormTitle.textContent = "Thêm bài học";
        lessonOrderInput.value = 1;
        editingLessonId = null;
    }

    lessonNameInput.focus();
}

// Sửa bài học
function editLesson(id) {
    const lesson = lessons.find(function (item) {
        return item.id === id;
    });

    if (lesson) {
        openLessonForm(lesson);
    }
}

// Xóa bài học
function deleteLesson(id) {
    const lesson = lessons.find(function (item) {
        return item.id === id;
    });

    if (!lesson) return;

    const confirmed = confirm(
        "Bạn có chắc muốn xóa bài học " + lesson.name + "?"
    );

    if (!confirmed) return;

    lessons = lessons.filter(function (item) {
        return item.id !== id;
    });

    renderLessons();
    renderDashboardStats();
}

// Nút thêm bài học
addLessonButton.addEventListener("click", function () {
    openLessonForm();
});

// Nút hủy
cancelLessonButton.addEventListener("click", function () {
    lessonFormContainer.classList.add("hidden");
    lessonForm.reset();
    editingLessonId = null;
});

// Lưu bài học
lessonForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const name = lessonNameInput.value.trim();
    const topicId = Number(lessonTopicInput.value);
    const order = Number(lessonOrderInput.value);
    const description = lessonDescriptionInput.value.trim();

    if (!name || !topicId || !Number.isInteger(order) || order < 1) {
        alert("Vui lòng nhập đầy đủ thông tin hợp lệ.");
        return;
    }

    const topicExists = topics.some(function (topic) {
        return topic.id === topicId;
    });

    if (!topicExists) {
        alert("Vui lòng chọn một chủ đề hợp lệ.");
        return;
    }

    // Kiểm tra trùng thứ tự trong cùng chủ đề
    const duplicateOrder = lessons.some(function (lesson) {
        return lesson.topicId === topicId &&
            lesson.order === order &&
            lesson.id !== editingLessonId;
    });

    if (duplicateOrder) {
        alert("Thứ tự này đã được sử dụng trong chủ đề đã chọn.");
        return;
    }

    if (editingLessonId !== null) {
        const lesson = lessons.find(function (item) {
            return item.id === editingLessonId;
        });

        if (lesson) {
            lesson.name = name;
            lesson.topicId = topicId;
            lesson.order = order;
            lesson.description = description;
        }
    } else {
        const newId = lessons.length > 0
            ? Math.max(...lessons.map(function (item) {
                return item.id;
            })) + 1
            : 1;

        lessons.push({
            id: newId,
            name: name,
            topicId: topicId,
            order: order,
            description: description
        });
    }

    renderLessons();
    renderDashboardStats();

    lessonFormContainer.classList.add("hidden");
    lessonForm.reset();
    editingLessonId = null;
});

// Tìm kiếm và lọc
lessonSearch.addEventListener("input", renderLessons);
lessonTopicFilter.addEventListener("change", renderLessons);

// Khởi tạo
renderLessonTopicOptions();
renderLessons();

// ================================
// QUẢN LÝ TỪ VỰNG
// ================================

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

// Dữ liệu mẫu
let vocabularies = [
    {
        id: 1,
        word: "Hello",
        meaning: "Xin chào",
        pronunciation: "/həˈləʊ/",
        type: "Cụm từ",
        lessonId: 1,
        example: "Hello, how are you?"
    },
    {
        id: 2,
        word: "Goodbye",
        meaning: "Tạm biệt",
        pronunciation: "/ˌɡʊdˈbaɪ/",
        type: "Cụm từ",
        lessonId: 1,
        example: "Goodbye, see you tomorrow."
    },
    {
        id: 3,
        word: "Family",
        meaning: "Gia đình",
        pronunciation: "/ˈfæməli/",
        type: "Danh từ",
        lessonId: 3,
        example: "I love my family."
    },
    {
        id: 4,
        word: "Mother",
        meaning: "Mẹ",
        pronunciation: "/ˈmʌðər/",
        type: "Danh từ",
        lessonId: 3,
        example: "My mother is very kind."
    },
    {
        id: 5,
        word: "Travel",
        meaning: "Du lịch",
        pronunciation: "/ˈtrævəl/",
        type: "Động từ",
        lessonId: 5,
        example: "I want to travel around the world."
    }
];

let editingVocabularyId = null;

// Lấy tên bài học theo ID
function getLessonName(lessonId) {
    const lesson = lessons.find(item => item.id === lessonId);
    return lesson ? lesson.name : "Bài học không tồn tại";
}

// Tạo danh sách bài học trong các ô chọn
function renderVocabularyLessonOptions() {
    const currentLessonValue = vocabularyLessonInput.value;
    const currentFilterValue = vocabularyLessonFilter.value;

    vocabularyLessonInput.innerHTML =
        '<option value="">Chọn bài học</option>';

    vocabularyLessonFilter.innerHTML =
        '<option value="">Tất cả bài học</option>';

    lessons.forEach(lesson => {
        const formOption = document.createElement("option");
        formOption.value = lesson.id;
        formOption.textContent = lesson.name;
        vocabularyLessonInput.appendChild(formOption);

        const filterOption = document.createElement("option");
        filterOption.value = lesson.id;
        filterOption.textContent = lesson.name;
        vocabularyLessonFilter.appendChild(filterOption);
    });

    vocabularyLessonInput.value = currentLessonValue;
    vocabularyLessonFilter.value = currentFilterValue;
}

// Hiển thị danh sách từ vựng
function renderVocabularies() {
    vocabularyList.innerHTML = "";

    const keyword = vocabularySearch.value.trim().toLowerCase();
    const selectedLesson = vocabularyLessonFilter.value;

    const filteredVocabularies = vocabularies.filter(vocabulary => {
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

    filteredVocabularies.forEach(vocabulary => {
        const row = document.createElement("tr");

        const values = [
            vocabulary.id,
            vocabulary.word,
            vocabulary.meaning,
            vocabulary.pronunciation || "Chưa có",
            vocabulary.type,
            getLessonName(vocabulary.lessonId),
            vocabulary.example || "Chưa có"
        ];

        values.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

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

// Mở biểu mẫu thêm hoặc sửa
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

    vocabularyWordInput.focus();
}

// Sửa từ vựng
function editVocabulary(id) {
    const vocabulary = vocabularies.find(item => item.id === id);

    if (vocabulary) {
        openVocabularyForm(vocabulary);
    }
}

// Xóa từ vựng
function deleteVocabulary(id) {
    const vocabulary = vocabularies.find(item => item.id === id);

    if (!vocabulary) {
        return;
    }

    const confirmed = confirm(
        "Bạn có chắc muốn xóa từ vựng " + vocabulary.word + "?"
    );

    if (!confirmed) {
        return;
    }

    vocabularies = vocabularies.filter(item => item.id !== id);

    renderVocabularies();
    renderDashboardStats();
}

// Nút thêm từ vựng
addVocabularyButton.addEventListener("click", function () {
    openVocabularyForm();
});

// Nút hủy
cancelVocabularyButton.addEventListener("click", function () {
    vocabularyFormContainer.classList.add("hidden");
    vocabularyForm.reset();
    editingVocabularyId = null;
});

// Lưu từ vựng
vocabularyForm.addEventListener("submit", function (event) {
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

    const duplicateWord = vocabularies.some(vocabulary =>
        vocabulary.word.toLowerCase() === word.toLowerCase() &&
        vocabulary.lessonId === lessonId &&
        vocabulary.id !== editingVocabularyId
    );

    if (duplicateWord) {
        alert("Từ vựng này đã tồn tại trong bài học đã chọn.");
        return;
    }

    if (editingVocabularyId !== null) {
        const vocabulary = vocabularies.find(
            item => item.id === editingVocabularyId
        );

        if (vocabulary) {
            vocabulary.word = word;
            vocabulary.meaning = meaning;
            vocabulary.pronunciation = pronunciation;
            vocabulary.type = type;
            vocabulary.lessonId = lessonId;
            vocabulary.example = example;
        }
    } else {
        const newId = vocabularies.length > 0
            ? Math.max(...vocabularies.map(item => item.id)) + 1
            : 1;

        vocabularies.push({
            id: newId,
            word,
            meaning,
            pronunciation,
            type,
            lessonId,
            example
        });
    }

    renderVocabularies();
    renderDashboardStats();

    vocabularyFormContainer.classList.add("hidden");
    vocabularyForm.reset();
    editingVocabularyId = null;
});

// Tìm kiếm và lọc
vocabularySearch.addEventListener("input", renderVocabularies);
vocabularyLessonFilter.addEventListener("change", renderVocabularies);

// Khởi tạo giao diện
renderVocabularyLessonOptions();
renderVocabularies();

// ================================
// THỐNG KÊ VÀ BIỂU ĐỒ DASHBOARD
// ================================

function renderDashboardStats() {
    // Cập nhật số lượng tổng
    document.getElementById("stat-levels").textContent =
        levels.length;

    document.getElementById("stat-topics").textContent =
        topics.length;

    document.getElementById("stat-lessons").textContent =
        lessons.length;

    document.getElementById("stat-vocabularies").textContent =
        vocabularies.length;

    // Cập nhật biểu đồ từ vựng theo bài học
    renderVocabularyChart();
}

function renderVocabularyChart() {
    const chart = document.getElementById("vocabulary-chart");

    chart.innerHTML = "";

    if (lessons.length === 0) {
        chart.textContent = "Chưa có bài học để thống kê.";
        return;
    }

    // Đếm số từ vựng thuộc từng bài học
    const chartData = lessons.map(lesson => {
        const count = vocabularies.filter(
            vocabulary => vocabulary.lessonId === lesson.id
        ).length;

        return {
            name: lesson.name,
            count: count
        };
    });

    // Tìm số từ vựng lớn nhất để tính chiều dài cột
    const maxCount = Math.max(
        1,
        ...chartData.map(item => item.count)
    );

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

        const width = item.count === 0
            ? 0
            : (item.count / maxCount) * 100;

        bar.style.width = width + "%";
        track.appendChild(bar);

        const value = document.createElement("div");
        value.className = "chart-value";
        value.textContent = item.count;

        row.append(label, track, value);
        chart.appendChild(row);
    });
}

// Khởi tạo thống kê
renderDashboardStats();

