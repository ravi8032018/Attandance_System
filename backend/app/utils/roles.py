
def has_role(user: dict, role: str) -> bool:
    return role in user.get("role", [])

