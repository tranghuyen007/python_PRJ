from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.security import get_current_user, get_db
from models.curriculum import Word
from models.user import User
from services.pronunciation_service import assess_recording, get_reference_audio


router = APIRouter(prefix="/pronunciation", tags=["Pronunciation"])


@router.post("/assess")
def assess_pronunciation(
    word_id: int = Form(...),
    lesson_id: int = Form(...),
    target_text: str = Form(...),
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        audio_bytes = audio.file.read()
        if len(audio_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Audio is too large")
        extension = (audio.filename or "recording.webm").rsplit(".", 1)[-1].lower()
        if extension not in {"webm", "wav", "ogg", "m4a", "mp3"}:
            extension = "webm"
        return assess_recording(
            db,
            user,
            word_id=word_id,
            lesson_id=lesson_id,
            target_text=target_text,
            audio_bytes=audio_bytes,
            extension=extension,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.get("/words/{word_id}/reference-audio")
async def reference_audio(
    word_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    word = db.query(Word).filter_by(word_id=word_id, is_active=1).first()
    if word is None:
        raise HTTPException(status_code=404, detail="Word not found")
    try:
        path = await get_reference_audio(word)
        db.commit()
    except Exception as error:
        raise HTTPException(status_code=502, detail="Could not generate reference audio") from error
    return FileResponse(path, media_type="audio/mpeg", filename=f"{word.word}.mp3")
