placeholders = {"string", "String", "", None, 0}

def clean_placeholders(data: dict) -> dict:
    clean = {}
    for key, value in data.items():
        # If scalar, filter out placeholders
        if isinstance(value, (str, int, type(None))):
            if value in placeholders:
                continue
        # If dict, and you want to clean inside it too:
        if isinstance(value, dict):
            nested_clean = clean_placeholders(value)
            if nested_clean:  # Only add if not empty
                clean[key] = nested_clean
            continue
        clean[key] = value
    return clean

