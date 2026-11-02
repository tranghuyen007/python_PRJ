import asyncio
import edge_tts
from pathlib import Path

# Thư mục lưu âm thanh
AUDIO_DIR = Path("uploads/audio")
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

# Danh sách từ vựng
words = [
    "Apple",
    "Book",
    "Beautiful",
    "Happy",
    "School",
    "Friend",
    "Family",
    "Water",
    "Travel",
    "Computer",
    "Important",
    "Learn",
    "House",
    "Quickly",
    "Morning",
    "Difficult",
    "Listen",
    "Knowledge",
    "Healthy",
    "Experience"
]

async def generate_audio(word):
    filename = word.lower() + ".mp3"
    filepath = AUDIO_DIR / filename

    if filepath.exists():
        print(f"Already exists: {filename}")
        return

    communicate = edge_tts.Communicate(
        text=word,
        voice="en-US-JennyNeural"
    )

    await communicate.save(str(filepath))
    print(f"Generated: {filename}")

async def main():
    for word in words:
        await generate_audio(word)

asyncio.run(main())