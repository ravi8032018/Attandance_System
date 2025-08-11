# Centralizes DB connection logic,, import db wherever we need it later.

from motor.motor_asyncio import AsyncIOMotorClient
from backend.app.config import MONGODB_URI, db_name
from pymongo.mongo_client import MongoClient

client = AsyncIOMotorClient(MONGODB_URI)
# client = MongoClient(MONGODB_URI)
# client.admin.command('ping')
db = client.get_default_database()
# db = client[db_name]