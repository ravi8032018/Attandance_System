# auth_cookies.py
import os
from fastapi import Response

ENV = os.getenv("ENV", "development")
IS_PROD = ENV == "production"

COOKIE_NAME = "dept_user_token"
COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN")  # e.g. "your-backend.onrender.com" in prod

def set_auth_cookie(response: Response, token: str) -> None:
    cookie_doc= {
        "key": COOKIE_NAME,
        "value": token,
        "httponly": True,
        "secure": IS_PROD,                           # only secure in production
        "samesite": "none" if IS_PROD else "lax",    # cross-site in prod, easier in dev
        "domain": COOKIE_DOMAIN if IS_PROD else None,
        "path": "/",
        "max_age": 60 * 60 * 24 * 7,
    }
    print("--> in set_auth_cookie, cookie : ",cookie_doc)
    
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=IS_PROD,                           # only secure in production
        samesite="none" if IS_PROD else "lax",    # cross-site in prod, easier in dev
        domain=COOKIE_DOMAIN if IS_PROD else None,
        path="/",
        max_age=60 * 60 * 24 * 7,                 # 7 days, adjust as you like
    )
    print("--> out of set_auth_cookie")

def clear_auth_cookie(response: Response) -> None:
    cookie_doc= {
        "key": COOKIE_NAME,
        "domain": COOKIE_DOMAIN if IS_PROD else None,
        "path": "/",
    }
    print("--> in clear_auth_cookie, cookie : ",cookie_doc)
    response.delete_cookie(
        key=COOKIE_NAME,
        domain=COOKIE_DOMAIN if IS_PROD else None,
        path="/",
    )
    print("--> out of clear_auth_cookie")

