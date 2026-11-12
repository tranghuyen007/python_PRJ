import edge_tts
from pathlib import Path

from app.database import DATABASE_FILE

BACKEND_DIR = DATABASE_FILE.parent
AUDIO_DIR = BACKEND_DIR / "uploads" / "audio"

AUDIO_DIR.mkdir(parents=True, exist_ok=True)


async def generate_word_audio(word_id: int, word: str):
    filename = f"word_{word_id}.mp3"
    filepath = AUDIO_DIR / filename

    communicate = edge_tts.Communicate(
        text=word,
        voice="en-US-JennyNeural"
    )

    await communicate.save(str(filepath))

    return f"/uploads/audio/{filename}"