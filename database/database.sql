PRAGMA foreign_keys = ON;

CREATE TABLE users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE levels (
    level_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,

    display_order INTEGER NOT NULL
);

CREATE TABLE topics (
    topic_id INTEGER PRIMARY KEY AUTOINCREMENT,

    level_id INTEGER NOT NULL,

    name TEXT NOT NULL,
    description TEXT,

    display_order INTEGER NOT NULL,

    FOREIGN KEY (level_id)
        REFERENCES levels(level_id)
        ON DELETE CASCADE,

    UNIQUE(level_id, name)
);

CREATE TABLE lessons (
    lesson_id INTEGER PRIMARY KEY AUTOINCREMENT,

    topic_id INTEGER NOT NULL,

    name TEXT NOT NULL,
    description TEXT,

    display_order INTEGER NOT NULL,

    FOREIGN KEY (topic_id)
        REFERENCES topics(topic_id)
        ON DELETE CASCADE,

    UNIQUE(topic_id, display_order)
);

CREATE TABLE user_lesson_progress (
    user_lesson_progress_id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER NOT NULL,
    lesson_id INTEGER NOT NULL,

    completed_items INTEGER NOT NULL DEFAULT 0,
    total_items INTEGER NOT NULL DEFAULT 0,

    is_completed INTEGER NOT NULL DEFAULT 0,

    started_at DATETIME,
    completed_at DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    FOREIGN KEY (lesson_id)
        REFERENCES lessons(lesson_id)
        ON DELETE CASCADE,

    UNIQUE(user_id, lesson_id),

    CHECK(completed_items >= 0),
    CHECK(total_items >= 0),
    CHECK(completed_items <= total_items),

    CHECK(is_completed IN (0, 1))
);

CREATE TABLE user_topic_progress (
    user_topic_progress_id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER NOT NULL,
    topic_id INTEGER NOT NULL,

    learned_count INTEGER NOT NULL DEFAULT 0,
    mastered_count INTEGER NOT NULL DEFAULT 0,

    last_studied_at DATETIME,
    last_reviewed_at DATETIME,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    FOREIGN KEY (topic_id)
        REFERENCES topics(topic_id)
        ON DELETE CASCADE,

    UNIQUE(user_id, topic_id),

    CHECK(learned_count >= 0),
    CHECK(mastered_count >= 0),
    CHECK(mastered_count <= learned_count)
);

CREATE TABLE user_daily_activity (
    activity_id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER NOT NULL,

    activity_date DATE NOT NULL,

    learned_count INTEGER NOT NULL DEFAULT 0,
    review_count INTEGER NOT NULL DEFAULT 0,
    quiz_count INTEGER NOT NULL DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    UNIQUE(user_id, activity_date),

    CHECK(learned_count >= 0),
    CHECK(review_count >= 0),
    CHECK(quiz_count >= 0)
);

CREATE TABLE tags (
    tag_id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE topic_tags (
    topic_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,

    PRIMARY KEY(topic_id, tag_id),

    FOREIGN KEY (topic_id)
        REFERENCES topics(topic_id)
        ON DELETE CASCADE,

    FOREIGN KEY (tag_id)
        REFERENCES tags(tag_id)
        ON DELETE CASCADE
);
 
CREATE TABLE review_sessions (
    review_session_id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER NOT NULL,
    topic_id INTEGER NOT NULL,

    review_type TEXT NOT NULL,

    total_items INTEGER NOT NULL DEFAULT 0,
    completed_items INTEGER NOT NULL DEFAULT 0,

    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    FOREIGN KEY (topic_id)
        REFERENCES topics(topic_id)
        ON DELETE CASCADE,

    CHECK(review_type IN ('NORMAL', 'FULL_TOPIC')),

    CHECK(total_items >= 0),
    CHECK(completed_items >= 0),
    CHECK(completed_items <= total_items)
);

CREATE TABLE words (
    word_id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT NOT NULL,
    meaning TEXT NOT NULL,
    pronunciation TEXT,
    part_of_speech TEXT,
    example TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE lesson_words (
    lesson_id INTEGER NOT NULL,
    word_id INTEGER NOT NULL,
    display_order INTEGER NOT NULL,

    PRIMARY KEY (lesson_id, word_id),

    FOREIGN KEY (lesson_id)
        REFERENCES lessons(lesson_id),

    FOREIGN KEY (word_id)
        REFERENCES words(word_id),

    UNIQUE (lesson_id, display_order)
);

CREATE TABLE user_word_progress (
    user_word_progress_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    word_id INTEGER NOT NULL,
    learned INTEGER DEFAULT 0,
    mastered INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    wrong_count INTEGER DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    last_reviewed_at DATETIME,
    next_review_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(user_id),

    FOREIGN KEY (word_id)
        REFERENCES words(word_id),

    UNIQUE (user_id, word_id)
);

CREATE TABLE review_session_items (
    session_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    review_session_id INTEGER NOT NULL,
    word_id INTEGER NOT NULL,
    is_answered INTEGER DEFAULT 0,
    is_correct INTEGER DEFAULT 0,
    answered_at DATETIME,

    FOREIGN KEY (review_session_id)
        REFERENCES review_sessions(review_session_id),

    FOREIGN KEY (word_id)
        REFERENCES words(word_id),

    UNIQUE (review_session_id, word_id)
);