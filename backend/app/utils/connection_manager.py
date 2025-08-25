# In a new file: connection_manager.py

from fastapi import WebSocket
from typing import Dict
import json

class ConnectionManager:
    def __init__(self):
        # This dictionary will map a user_id to their WebSocket connection
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        print(f"User {user_id} connected.")

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            print(f"User {user_id} disconnected.")

    async def send_personal_message(self, message: dict, user_id: str):
        print(f"User: {user_id}, acive_connections: {(self.active_connections)}")
        if user_id in self.active_connections:
            websocket = self.active_connections[user_id]
            await websocket.send_text(json.dumps(message))
            print(f"Sent message to {user_id}: {message}")
        else:
            print(f"Could not send message: User {user_id} is not connected.")

# Create a single, global instance that your app will use
manager = ConnectionManager()
