# backend/app/_hooks/gender_normalizer.py
from typing import Optional

ALLOWED_GENDERS = {"male", "female", "other"}

def normalize_gender(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    s = str(v).strip().lower()
    aliases = {
        "m": "male", "male": "male",
        "f": "female", "female": "female",
        "o": "other", "other": "other",
        "non-binary": "other", "nonbinary": "other", "nb": "other",
    }
    s = aliases.get(s, s)
    if s not in ALLOWED_GENDERS:
        raise ValueError(f"gender must be one of: {', '.join(sorted(ALLOWED_GENDERS))}")
    return s
