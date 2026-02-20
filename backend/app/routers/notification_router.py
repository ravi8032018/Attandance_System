# routers/notifications_router.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from websockets import WebSocketException
from backend.app.utils.connection_manager import manager
from backend.app.utils.ws_dependancies import get_current_user_from_ws

router = APIRouter(prefix="/ws")

@router.websocket("/notify")
async def websocket_endpoint(websocket: WebSocket):
    print("In websocket endpoint")

    # 1) Authenticate user from JWT in query param
    try:
        user = await get_current_user_from_ws(websocket)
    except WebSocketException:
        # 1008: Policy Violation (generic close code for auth failure)
        await websocket.close(code=1008)
        return

    user_id = str(user["_id"])  # or user.registration_no, etc.
    print(f"Authenticated user {user_id} for WebSocket connection.")
    # 2) Register connection
    await manager.connect(websocket, user_id)
    try:
        while True:
            # If you don't need messages from client, you can still read to detect disconnect
            _ = await websocket.receive_text()
            # Optionally parse/handle client messages here
    except WebSocketDisconnect:
        manager.disconnect(user_id)


from fastapi import APIRouter, Depends
from datetime import datetime, timezone
from backend.app.utils.connection_manager import manager
from backend.app.utils.dependencies import get_current_user  # your existing auth dependency


@router.post("/test")
async def send_test_notification(current_user = Depends(get_current_user)):
    user_id = str(current_user["id"])  # or registration_no, same as you used in manager
    await manager.send_personal_message(
        {
            "type": "test_notification",
            "title": "Test notification",
            "body": "If you can see this in the panel, WS is working.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        user_id=user_id,
    )
    return {"ok": True}
