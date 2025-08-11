import os
from dotenv import load_dotenv

load_dotenv(dotenv_path= "backend/.env")

MONGODB_URI = os.getenv("MONGODB_URI")
PORT = int(os.getenv("PORT", 8000))         # Default to 8000
db_name= os.getenv("db_name")

# print(MONGODB_URI)
# print(PORT)
# print(db_name)

if not MONGODB_URI:
    raise ValueError("MONGODB_URI is not set in the environment variables.")
if not PORT:
    raise ValueError("PORT is not set in the environment variables.")