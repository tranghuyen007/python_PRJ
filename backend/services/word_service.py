
import logging

from sqlalchemy.orm import Session
from models.curriculum import Word
from services.audio_service import generate_word_audio

logger = logging.getLogger(__name__)


async def create_word(db: Session, word_data):

    # 1. Tạo đối tượng từ vựng
    new_word = Word(
        word=word_data.word,
        meaning=word_data.meaning,
        pronunciation=word_data.pronunciation,
        part_of_speech=word_data.part_of_speech,
        example=word_data.example
    )

    # 2. Lưu từ vào database trước để lấy word_id
    db.add(new_word)
    db.commit()
    db.refresh(new_word)

    # 3. Tạo file âm thanh
    try:
        audio_url = await generate_word_audio(
            new_word.word_id,
            new_word.word
        )

        # 4. Lưu đường dẫn âm thanh vào database
        new_word.audio_url = audio_url
        db.commit()
        db.refresh(new_word)

    except Exception:
        # Từ vẫn được lưu dù tạo âm thanh thất bại
        db.rollback()
        logger.exception(
            "Failed to generate audio for word_id=%s",
            new_word.word_id
        )

    return new_word
