from fastapi import APIRouter

router = APIRouter()

@router.get("/ws")
async def ws_endpoint():
    return {"message": "WebSocket endpoint"}
