# In a new file: routers/notifications_router.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..utils.connection_manager import manager

router = APIRouter(prefix="/ws")

@router.websocket("/notify/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    # When a client connects, register them with the manager
    print(f"In websocket endpoint")
    await manager.connect(websocket, user_id)
    try:
        # Loop indefinitely to keep the connection open
        while True:
            # You can add logic here to handle messages sent FROM the client if needed
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        # When the client disconnects, remove them from the manager
        manager.disconnect(user_id)
