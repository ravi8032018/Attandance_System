import asyncio
import os
import sys

# Ensure python path includes project root
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.app.db import db

async def run_migration():
    print("Consolidating database status schema to a single canonical 'status' field...")
    collections = ["Admins", "Faculty", "Students"]

    for col_name in collections:
        collection = db[col_name]

        # 1. Update any documents with account_status == "FROZEN" or status in ["frozen", "suspended"] to status: "frozen"
        frozen_query = {
            "$or": [
                {"account_status": {"$in": ["FROZEN", "frozen"]}},
                {"status": {"$in": ["FROZEN", "frozen", "SUSPENDED", "suspended"]}}
            ]
        }
        res_frozen = await collection.update_many(
            frozen_query,
            {"$set": {"status": "frozen"}}
        )
        print(f"[{col_name}] Updated {res_frozen.modified_count} user records to status: 'frozen'.")

        # 2. Ensure default status: 'active' for documents without status
        res_active = await collection.update_many(
            {"status": {"$exists": False}},
            {"$set": {"status": "active", "status_reason": None, "status_updated_at": None}}
        )
        print(f"[{col_name}] Initialized {res_active.modified_count} user records with default status: 'active'.")

        # 3. Remove legacy account_status field from all documents
        res_unset = await collection.update_many(
            {"account_status": {"$exists": True}},
            {"$unset": {"account_status": ""}}
        )
        print(f"[{col_name}] Removed legacy 'account_status' field from {res_unset.modified_count} user records.")

    print("Status unification migration completed successfully.")

if __name__ == "__main__":
    asyncio.run(run_migration())
