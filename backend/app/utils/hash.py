
import asyncio

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"])
# , deprecated="auto"
async def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def varify_hash(plain_password: str, hashed_password: str) -> bool:
    # print(plain_password, hashed_password)
    return pwd_context.verify(plain_password, hashed_password)

