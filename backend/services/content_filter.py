"""Lọc từ tục tĩu / không phù hợp trong câu người học nói ở trang Luyện phát âm.

Danh sách phải giống hệt BANNED_WORDS / BANNED_STEMS trong frontend/user/js/pronounce.js.
Viết KHÔNG DẤU, chữ thường.
"""
import re
import unicodedata

BANNED_WORDS = {
    # tiếng Anh
    "fuck", "fucks", "fucked", "fucker", "fuckers", "fucking", "fuckin", "motherfucker", "motherfucking",
    "shit", "shits", "shitty", "bullshit", "bitch", "bitches", "bitchy", "bastard", "bastards",
    "ass", "asses", "asshole", "assholes", "jackass", "dumbass", "dick", "dicks", "dickhead",
    "cock", "cocks", "pussy", "pussies", "cunt", "cunts", "whore", "whores", "slut", "sluts",
    "piss", "pissed", "wanker", "twat", "prick", "bollocks", "crap", "damn", "goddamn",
    "nigger", "niggers", "nigga", "niggas", "faggot", "faggots", "fag", "fags", "retard", "retarded",
    "porn", "sex", "sexy", "nude", "boobs", "tits",
    # tiếng Việt (không dấu, viết tắt)
    "dit", "dkm", "dmm", "dcm", "dm", "dcmm", "vcl", "vkl", "vl", "clgt", "cc", "cl", "lon", "buoi", "cac", "deo", "du",
}
# Từ bắt đầu bằng các gốc này cũng bị chặn (vd: fuuuck, shitload, motherfuckers)
BANNED_STEMS = ("fuck", "fuk", "fuuu", "motherf", "shit", "bitch", "cunt", "nigg", "fagg", "whor", "slut", "dickhead")


def _plain(token: str) -> str:
    """Bỏ dấu tiếng Việt, chữ thường, chỉ giữ a-z 0-9 * và dấu nháy: "Địt" -> "dit"."""
    text = unicodedata.normalize("NFD", token.lower())
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = text.replace("đ", "d")
    return re.sub(r"[^a-z0-9*']", "", text)


def allowed_words(target: str) -> set[str]:
    """Các từ có trong từ / câu mẫu thì không bao giờ bị chặn."""
    return {_plain(w).replace("'", "") for w in re.split(r"[\s-]+", target or "") if _plain(w)}


def is_banned(token: str, allowed: set[str] | None = None) -> bool:
    word = _plain(token)
    if not word:
        return False
    if "*" in word:  # Chrome tự che từ tục thành "f***"
        return True
    bare = word.replace("'", "")
    if allowed and bare in allowed:
        return False
    return bare in BANNED_WORDS or bare.startswith(BANNED_STEMS)


def clean_text(text: str, target: str = "") -> tuple[str, int]:
    """Xoá từ cấm khỏi câu. Trả về (câu đã lọc, số từ bị bỏ qua)."""
    allowed = allowed_words(target)
    kept, removed = [], 0
    for token in (text or "").split():
        if is_banned(token, allowed):
            removed += 1
        else:
            kept.append(token)
    return " ".join(kept), removed