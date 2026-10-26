
from jose import JWTError, jwt

from services.auth_service import SECRET_KEY, ALGORITHM


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        # Token phải có subject là user_id.
        subject = payload.get("sub")

        if subject is None:
            raise ValueError("Invalid token")

        return payload

    except JWTError as error:
        raise ValueError("Invalid or expired token") from error
