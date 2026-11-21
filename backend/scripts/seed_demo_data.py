import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy.orm import Session

from app.database import SessionLocal, initialize_database
from models.curriculum import Lesson, LessonWord, Level, Topic, Word
from models.progress import UserWordProgress
from models.user import User
from services.user_service import password_hasher
from services.pronunciation_service import ensure_reference_audio


ADMIN_EMAIL = "admin@vocab.local"
ADMIN_USERNAME = "demo_admin"
USER_EMAIL = "learner@vocab.local"
USER_USERNAME = "demo_learner"

CURRICULUM = [
    {
        "name": "A1",
        "description": "Cấp độ cơ bản dành cho người mới bắt đầu.",
        "placement_test_enabled": 0,
        "topics": [
            {
                "name": "Everyday Life",
                "description": "Lời chào và những người quanh ta.",
                "lessons": [
                    (
                        "Greetings",
                        [
                            ("hello", "xin chào", "/həˈloʊ/", "interjection", "Hello, my name is Lan."),
                            ("good morning", "chào buổi sáng", "/ˌɡʊd ˈmɔːrnɪŋ/", "phrase", "Good morning, everyone."),
                            ("goodbye", "tạm biệt", "/ˌɡʊdˈbaɪ/", "interjection", "She waved goodbye."),
                            ("please", "làm ơn", "/pliːz/", "adverb", "Please open the door."),
                            ("thank you", "cảm ơn", "/ˈθæŋk juː/", "phrase", "Thank you for your help."),
                        ],
                    ),
                    (
                        "People",
                        [
                            ("person", "người", "/ˈpɜːrsən/", "noun", "A kind person helped me."),
                            ("friend", "bạn bè", "/frend/", "noun", "My friend lives nearby."),
                            ("child", "đứa trẻ", "/tʃaɪld/", "noun", "The child is reading a book."),
                            ("parent", "cha hoặc mẹ", "/ˈperənt/", "noun", "A parent came to the meeting."),
                            ("teacher", "giáo viên", "/ˈtiːtʃər/", "noun", "Our teacher speaks clearly."),
                        ],
                    ),
                ],
            },
            {
                "name": "Food and Drink",
                "description": "Các loại trái cây và món ăn quen thuộc.",
                "lessons": [
                    (
                        "Fruit",
                        [
                            ("apple", "quả táo", "/ˈæpəl/", "noun", "I ate an apple after lunch."),
                            ("banana", "quả chuối", "/bəˈnænə/", "noun", "The banana is ripe."),
                            ("orange", "quả cam", "/ˈɔːrɪndʒ/", "noun", "She peeled an orange."),
                            ("grape", "quả nho", "/ɡreɪp/", "noun", "He washed a grape."),
                            ("pear", "quả lê", "/per/", "noun", "A pear fell from the tree."),
                        ],
                    ),
                    (
                        "Meals",
                        [
                            ("bread", "bánh mì", "/bred/", "noun", "We bought fresh bread."),
                            ("rice", "cơm; gạo", "/raɪs/", "noun", "They eat rice for dinner."),
                            ("water", "nước", "/ˈwɔːtər/", "noun", "Please drink some water."),
                            ("milk", "sữa", "/mɪlk/", "noun", "The child poured a glass of milk."),
                            ("egg", "trứng", "/eɡ/", "noun", "I cooked an egg for breakfast."),
                        ],
                    ),
                ],
            },
        ],
    },
    {
        "name": "B1",
        "description": "Cấp độ trung cấp với chủ đề du lịch, học tập và công việc.",
        "placement_test_enabled": 1,
        "topics": [
            {
                "name": "Travel",
                "description": "Từ vựng cần thiết khi đi lại và du lịch.",
                "lessons": [
                    (
                        "Getting Around",
                        [
                            ("ticket", "vé", "/ˈtɪkɪt/", "noun", "I bought a ticket at the station."),
                            ("station", "nhà ga", "/ˈsteɪʃən/", "noun", "We waited at the station."),
                            ("train", "tàu hỏa", "/treɪn/", "noun", "The train arrived on time."),
                            ("airport", "sân bay", "/ˈerpɔːrt/", "noun", "The airport is very busy."),
                            ("luggage", "hành lý", "/ˈlʌɡɪdʒ/", "noun", "Her luggage is beside the door."),
                        ],
                    ),
                    (
                        "On the Road",
                        [
                            ("bus", "xe buýt", "/bʌs/", "noun", "The bus stops near my house."),
                            ("taxi", "xe taxi", "/ˈtæksi/", "noun", "We called a taxi after dinner."),
                            ("map", "bản đồ", "/mæp/", "noun", "He checked the map for directions."),
                            ("hotel", "khách sạn", "/hoʊˈtel/", "noun", "Our hotel is near the beach."),
                            ("journey", "chuyến đi", "/ˈdʒɜːrni/", "noun", "The journey took three hours."),
                        ],
                    ),
                ],
            },
            {
                "name": "Study and Work",
                "description": "Học tập, lớp học và môi trường làm việc.",
                "lessons": [
                    (
                        "Classroom",
                        [
                            ("lesson", "bài học", "/ˈlesən/", "noun", "Today's lesson is about animals."),
                            ("subject", "môn học", "/ˈsʌbdʒɪkt/", "noun", "Science is my favorite subject."),
                            ("notebook", "quyển vở", "/ˈnoʊtbʊk/", "noun", "She wrote the answer in her notebook."),
                            ("pencil", "bút chì", "/ˈpensəl/", "noun", "I sharpened my pencil."),
                            ("dictionary", "từ điển", "/ˈdɪkʃəneri/", "noun", "Use a dictionary to check the word."),
                        ],
                    ),
                    (
                        "Workplace",
                        [
                            ("office", "văn phòng", "/ˈɔːfɪs/", "noun", "The office closes at six."),
                            ("meeting", "cuộc họp", "/ˈmiːtɪŋ/", "noun", "Our meeting starts at nine."),
                            ("colleague", "đồng nghiệp", "/ˈkɑːliːɡ/", "noun", "A colleague shared the report."),
                            ("project", "dự án", "/ˈprɑːdʒekt/", "noun", "They finished the project early."),
                            ("deadline", "hạn chót", "/ˈdedlaɪn/", "noun", "The deadline is next Friday."),
                        ],
                    ),
                ],
            },
        ],
    },
    {
        "name": "C1",
        "description": "Cấp độ nâng cao với chủ đề công nghệ và môi trường.",
        "placement_test_enabled": 1,
        "topics": [
            {
                "name": "Technology",
                "description": "Thiết bị số, internet và giao tiếp trực tuyến.",
                "lessons": [
                    (
                        "Devices",
                        [
                            ("computer", "máy tính", "/kəmˈpjuːtər/", "noun", "The computer needs a software update."),
                            ("keyboard", "bàn phím", "/ˈkiːbɔːrd/", "noun", "This keyboard is comfortable to use."),
                            ("screen", "màn hình", "/skriːn/", "noun", "The screen looks bright outdoors."),
                            ("smartphone", "điện thoại thông minh", "/ˈsmɑːrtfoʊn/", "noun", "My smartphone has a new camera."),
                            ("charger", "bộ sạc", "/ˈtʃɑːrdʒər/", "noun", "I packed my charger for the trip."),
                        ],
                    ),
                    (
                        "Internet",
                        [
                            ("website", "trang web", "/ˈwebsaɪt/", "noun", "The website has useful information."),
                            ("password", "mật khẩu", "/ˈpæswɜːrd/", "noun", "Choose a strong password."),
                            ("message", "tin nhắn", "/ˈmesɪdʒ/", "noun", "I sent a message to my classmate."),
                            ("download", "tải xuống", "/ˌdaʊnˈloʊd/", "verb", "You can download the free guide."),
                            ("search", "tìm kiếm", "/sɜːrtʃ/", "verb", "We search online for reliable sources."),
                        ],
                    ),
                ],
            },
            {
                "name": "Environment",
                "description": "Thiên nhiên, khí hậu và các vấn đề môi trường.",
                "lessons": [
                    (
                        "Nature",
                        [
                            ("forest", "rừng", "/ˈfɔːrɪst/", "noun", "A narrow path crosses the forest."),
                            ("river", "sông", "/ˈrɪvər/", "noun", "The river flows through the valley."),
                            ("mountain", "núi", "/ˈmaʊntən/", "noun", "Clouds covered the mountain."),
                            ("ocean", "đại dương", "/ˈoʊʃən/", "noun", "The ocean was calm this morning."),
                            ("wildlife", "động vật hoang dã", "/ˈwaɪldlaɪf/", "noun", "The park protects local wildlife."),
                        ],
                    ),
                    (
                        "Climate",
                        [
                            ("climate", "khí hậu", "/ˈklaɪmət/", "noun", "The climate is changing quickly."),
                            ("pollution", "sự ô nhiễm", "/pəˈluːʃən/", "noun", "Air pollution affects many cities."),
                            ("recycle", "tái chế", "/ˌriːˈsaɪkəl/", "verb", "We recycle paper and glass."),
                            ("energy", "năng lượng", "/ˈenərdʒi/", "noun", "Solar panels produce clean energy."),
                            ("plastic", "nhựa", "/ˈplæstɪk/", "noun", "They avoid single-use plastic bags."),
                        ],
                    ),
                ],
            },
        ],
    },
]


def _get_or_create_account(
    db: Session,
    *,
    username: str,
    email: str,
    full_name: str,
    role: str,
    password_env: str,
) -> tuple[User, bool]:
    user = db.query(User).filter_by(email=email).first()
    if user is not None:
        if user.role != role or user.status != "ACTIVE":
            raise RuntimeError(f"Existing account {email} is not an active {role} account")
        return user, False

    password = os.environ.get(password_env)
    if not password or len(password) < 12:
        password = "AdminDemo2026!" if role == "ADMIN" else "UserDemo2026!"
    user = User(
        username=username,
        email=email,
        full_name=full_name,
        password_hash=password_hasher.hash(password),
        role=role,
        status="ACTIVE",
    )
    db.add(user)
    db.flush()
    return user, True


def _get_or_create_word(
    db: Session,
    definition: tuple[str, str, str, str, str],
) -> tuple[Word, bool]:
    word_text, meaning, pronunciation, part_of_speech, example = definition
    word = db.query(Word).filter_by(word=word_text).first()
    created = word is None
    if created:
        word = Word(
            word=word_text,
            meaning=meaning,
            pronunciation=pronunciation,
            part_of_speech=part_of_speech,
            example=example,
            is_active=1,
        )
        db.add(word)
        db.flush()
    return word, created


def seed_demo_data(db: Session) -> dict[str, int]:
    admin, admin_created = _get_or_create_account(
        db,
        username=ADMIN_USERNAME,
        email=ADMIN_EMAIL,
        full_name="Demo Administrator",
        role="ADMIN",
        password_env="DEMO_ADMIN_PASSWORD",
    )
    learner, learner_created = _get_or_create_account(
        db,
        username=USER_USERNAME,
        email=USER_EMAIL,
        full_name="Demo Learner",
        role="USER",
        password_env="DEMO_USER_PASSWORD",
    )

    counts = {
        "accounts_created": int(admin_created) + int(learner_created),
        "levels": 0,
        "topics": 0,
        "lessons": 0,
        "words": 0,
        "lesson_word_links": 0,
        "learned_demo_words": 0,
    }

    for level_order, level_data in enumerate(CURRICULUM, start=1):
        level = db.query(Level).filter_by(name=level_data["name"]).first()
        if level is None:
            level = Level(
                name=level_data["name"],
                description=level_data["description"],
                display_order=level_order,
                placement_test_enabled=level_data["placement_test_enabled"],
                placement_test_question_count=10,
                placement_test_passing_score=7,
                is_active=1,
            )
            db.add(level)
            db.flush()
            counts["levels"] += 1

        for topic_order, topic_data in enumerate(level_data["topics"], start=1):
            topic = (
                db.query(Topic)
                .filter_by(level_id=level.level_id, name=topic_data["name"])
                .first()
            )
            if topic is None:
                topic = Topic(
                    level_id=level.level_id,
                    name=topic_data["name"],
                    description=topic_data["description"],
                    display_order=topic_order,
                    quick_review_limit=15,
                    is_active=1,
                )
                db.add(topic)
                db.flush()
                counts["topics"] += 1

            for lesson_order, (lesson_name, definitions) in enumerate(
                topic_data["lessons"],
                start=1,
            ):
                lesson = (
                    db.query(Lesson)
                    .filter_by(topic_id=topic.topic_id, name=lesson_name)
                    .first()
                )
                if lesson is None:
                    lesson = Lesson(
                        topic_id=topic.topic_id,
                        name=lesson_name,
                        description=f"Sample vocabulary for {lesson_name.lower()}.",
                        display_order=lesson_order,
                        is_active=1,
                    )
                    db.add(lesson)
                    db.flush()
                    counts["lessons"] += 1

                for word_order, definition in enumerate(definitions, start=1):
                    word, word_created = _get_or_create_word(db, definition)
                    counts["words"] += int(word_created)
                    if db.query(LessonWord).filter_by(
                        lesson_id=lesson.lesson_id,
                        word_id=word.word_id,
                    ).first():
                        continue
                    db.add(
                        LessonWord(
                            lesson_id=lesson.lesson_id,
                            word_id=word.word_id,
                            display_order=word_order,
                        )
                    )
                    counts["lesson_word_links"] += 1
                    if (
                        level_data["name"] == "A1"
                        and topic_data["name"] == "Everyday Life"
                    ):
                        existing_progress = db.query(UserWordProgress).filter_by(
                            user_id=learner.user_id,
                            word_id=word.word_id,
                        ).first()
                        if existing_progress is None:
                            db.add(
                                UserWordProgress(
                                    user_id=learner.user_id,
                                    word_id=word.word_id,
                                    learned=1,
                                )
                            )
                            counts["learned_demo_words"] += 1

    db.commit()
    for word in db.query(Word).filter_by(is_active=1).all():
        try:
            ensure_reference_audio(word)
        except Exception:
            continue
    db.commit()
    return counts


def main() -> None:
    initialize_database()
    with SessionLocal() as db:
        counts = seed_demo_data(db)
    print("Demo data is ready.")
    print(f"Admin login: {ADMIN_EMAIL}")
    print(f"User login: {USER_EMAIL}")
    print("Demo password defaults: admin=AdminDemo2026!, user=UserDemo2026!")
    for name, count in counts.items():
        print(f"{name}: {count}")


if __name__ == "__main__":
    main()
