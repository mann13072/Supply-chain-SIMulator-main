import os
from datetime import datetime, timedelta
from typing import Optional

import hashlib
import hmac
import secrets
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database import get_db
from models import User

SECRET_KEY = os.environ.get("JWT_SECRET", "dev-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24
IS_PRODUCTION = os.environ.get("JWT_SECRET") is not None

bearer_scheme = HTTPBearer(auto_error=False)


# Cloudflare's WebCrypto caps PBKDF2 at 100,000 iterations.
PBKDF2_ITERATIONS = 100000


async def _pbkdf2_sha256(password: bytes, salt: bytes, iterations: int) -> bytes:
    # Pyodide's hashlib has no pbkdf2_hmac, so Workers use native WebCrypto.
    if os.environ.get("CLOUDFLARE_WORKER") != "1":
        return hashlib.pbkdf2_hmac("sha256", password, salt, iterations)
    from js import Object, crypto
    from pyodide.ffi import to_js
    key = await crypto.subtle.importKey(
        "raw", to_js(password), "PBKDF2", False, to_js(["deriveBits"])
    )
    params = to_js(
        {"name": "PBKDF2", "hash": "SHA-256", "salt": to_js(salt), "iterations": iterations},
        dict_converter=Object.fromEntries,
    )
    bits = await crypto.subtle.deriveBits(params, key, 256)
    return bits.to_bytes()


async def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = await _pbkdf2_sha256(password.encode("utf-8"), bytes.fromhex(salt), PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${digest.hex()}"


async def verify_password(plain: str, hashed: str) -> bool:
    try:
        method, count, salt, expected = hashed.split("$")
        if method != "pbkdf2_sha256" or not 0 < int(count) <= PBKDF2_ITERATIONS:
            return False
        digest = await _pbkdf2_sha256(plain.encode("utf-8"), bytes.fromhex(salt), int(count))
        return hmac.compare_digest(digest.hex(), expected)
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: str, email: str) -> str:
    if not SECRET_KEY:
        raise HTTPException(status_code=503, detail="Authentication secret is not configured.")
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {"sub": user_id, "email": email, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


async def _get_or_create_dev_user(db: Session) -> User:
    """Return a local dev user, creating one if it doesn't exist."""
    dev_email = "dev@localhost"
    user = db.query(User).filter(User.email == dev_email).first()
    if not user:
        user = User(
            email=dev_email,
            hashed_password=await hash_password("devdevdev"),
            name="Dev User",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    # In local/dev mode, skip auth and use a dev user automatically
    if not IS_PRODUCTION and not credentials:
        return await _get_or_create_dev_user(db)

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user
