from datetime import datetime, date

def normalize_dates_for_mongo(obj):
    """Recursively converts any datetime.date to datetime.datetime for MongoDB storage."""
    if isinstance(obj, dict):
        return {k: normalize_dates_for_mongo(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [normalize_dates_for_mongo(v) for v in obj]
    if isinstance(obj, date) and not isinstance(obj, datetime):
        return datetime(obj.year, obj.month, obj.day)
    return obj
