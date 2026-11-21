import math
import subprocess
import tempfile
import asyncio
from pathlib import Path
from typing import Iterable

import soundfile as sf
import numpy as np
import edge_tts
from sqlalchemy.orm import Session

from models.curriculum import Lesson, Word
from models.pronunciation import PronunciationAttempt
from models.user import User


_ASSESSOR = None
_CACHE_DIR = Path(__file__).resolve().parents[1] / "uploads" / "audio"


def _get_assessor():
    global _ASSESSOR
    if _ASSESSOR is None:
        from pronounce_assess import PronounceAssessModel

        _ASSESSOR = PronounceAssessModel()
    return _ASSESSOR


def decode_audio(audio_bytes: bytes, extension: str = "webm") -> np.ndarray:
    _CACHE_DIR.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=f".{extension}", delete=False) as source:
        source.write(audio_bytes)
        source_path = source.name

    wav_path = source_path + ".wav"
    try:
        import imageio_ffmpeg

        result = subprocess.run(
            [
                imageio_ffmpeg.get_ffmpeg_exe(),
                "-v",
                "error",
                "-y",
                "-i",
                source_path,
                "-vn",
                "-ac",
                "1",
                "-ar",
                "16000",
                "-f",
                "wav",
                wav_path,
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        if result.returncode != 0:
            detail = result.stderr.decode("utf-8", "replace").strip()
            raise ValueError(
                "Could not decode the recorded audio"
                + (f": {detail[-300:]}" if detail else "")
            )
        audio, wav_sample_rate = sf.read(wav_path, dtype="float32", always_2d=False)
        if wav_sample_rate != 16000:
            raise ValueError("Decoded audio sample rate is invalid")
        if hasattr(audio, "mean") and getattr(audio, "ndim", 1) > 1:
            audio = audio.mean(axis=1)
        if len(audio) == 0:
            raise ValueError("Recorded audio contains no usable signal")
        return audio.astype(np.float32)
    except ValueError:
        raise
    except Exception as error:
        raise ValueError(f"Could not decode the recorded audio: {type(error).__name__}: {error}") from error
    finally:
        try:
            Path(source_path).unlink(missing_ok=True)
            wav_candidate = Path(source_path + ".wav")
            wav_candidate.unlink(missing_ok=True)
        except Exception:
            pass


def _chunks(audio: np.ndarray, chunk_size: int = 8000) -> Iterable[np.ndarray]:
    for start in range(0, len(audio), chunk_size):
        chunk = audio[start:start + chunk_size]
        if len(chunk):
            yield chunk.astype(np.float32)


def _character_results(target: str, phoneme_events: list[dict]) -> list[dict]:
    chars = list(target.strip())
    if not chars:
        return []

    statuses = ["correct"] * len(chars)
    bad_positions = [
        event.get("position")
        for event in phoneme_events
        if event.get("label") in {"mispronounced", "omitted"}
        and event.get("position") is not None
    ]
    if bad_positions:
        count = max(len(bad_positions), 1)
        for position in bad_positions:
            char_index = min(len(chars) - 1, round(position * len(chars) / max(count, 1)))
            statuses[char_index] = "wrong"
    return [{"character": char, "status": status} for char, status in zip(chars, statuses)]


def assess_recording(
    db: Session,
    user: User,
    word_id: int,
    lesson_id: int,
    target_text: str,
    audio_bytes: bytes,
    extension: str,
) -> dict:
    word = db.query(Word).filter_by(word_id=word_id, is_active=1).first()
    if word is None:
        raise ValueError("Word not found")

    lesson = db.query(Lesson).filter_by(lesson_id=lesson_id, is_active=1).first()
    if lesson is None:
        raise ValueError("Lesson not found")

    target = (target_text or word.word).strip()
    audio = decode_audio(audio_bytes, extension)
    if len(audio) < 1600:
        raise ValueError("Recorded audio is too short")

    assessor = _get_assessor()
    assessor.set_sentence(target)
    events = []
    prosody = {}
    for event in assessor.stream_decode(_chunks(audio), sample_rate=16000):
        if event.label == "prosody":
            prosody = {
                "monotony_score": event.monotony_score,
                "rhythm_score": event.rhythm_score,
                "boundary_score": event.boundary_score,
                "speaking_rate": event.speaking_rate,
            }
            continue
        events.append({
            "phoneme": event.phoneme,
            "position": event.position,
            "label": event.label,
            "decoded": event.decoded,
            "gop": event.gop,
        })

    if not events:
        raise ValueError("No pronunciation phonemes could be detected")

    weights = {"correct": 1.0, "mispronounced": 0.35, "omitted": 0.0, "insertion": 0.10}
    reference_events = [event for event in events if event["position"] is not None]
    phoneme_score = sum(weights.get(event["label"], 0.0) for event in reference_events)
    if reference_events:
        phoneme_score = round(100 * phoneme_score / len(reference_events))
    else:
        phoneme_score = 0

    gop_values = [
        float(event["gop"])
        for event in reference_events
        if event.get("gop") is not None and math.isfinite(float(event["gop"]))
    ]
    gop_score = round(100 * sum(gop_values) / len(gop_values)) if gop_values else phoneme_score
    overall = round(0.75 * phoneme_score + 0.25 * gop_score)

    character_results = _character_results(target, events)

    attempt = PronunciationAttempt(
        user_id=user.user_id,
        word_id=word.word_id,
        lesson_id=lesson.lesson_id,
        word=word.word.strip().lower(),
        mode="word",
        target_text=target,
        transcript="",
        score=overall,
        overall_score=overall,
        character_results=character_results,
        phoneme_results=events,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    attempts = (
        db.query(PronunciationAttempt)
        .filter_by(user_id=user.user_id, lesson_id=lesson.lesson_id, word_id=word.word_id)
        .count()
    )
    passed = overall >= lesson.pronunciation_passing_score
    exhausted = attempts >= lesson.pronunciation_max_attempts

    return {
        "attempt_id": attempt.attempt_id,
        "word": word.word,
        "target_text": target,
        "score": overall,
        "passed": passed,
        "attempt": attempts,
        "max_attempts": lesson.pronunciation_max_attempts,
        "passing_score": lesson.pronunciation_passing_score,
        "advance": passed or exhausted,
        "characters": character_results,
        "phonemes": events,
        "prosody": prosody,
    }


async def get_reference_audio(word: Word, force: bool = False) -> Path:
    cache_dir = _CACHE_DIR
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_path = cache_dir / f"word_{word.word_id}.mp3"
    if force and cache_path.exists():
        cache_path.unlink()
    if not cache_path.exists():
        communicate = edge_tts.Communicate(
            text=word.word,
            voice="en-US-JennyNeural",
        )
        await communicate.save(str(cache_path))
    word.reference_audio_path = str(cache_path)
    return cache_path


def ensure_reference_audio(word: Word, force: bool = False) -> Path:
    """Tạo file mẫu đồng bộ cho luồng admin/create/update."""
    return asyncio.run(get_reference_audio(word, force=force))
