from fastapi import APIRouter

router = APIRouter()

@router.get("/notifications")
async def notifications_endpoint():
    return {"message": "Notifications endpoint"}
