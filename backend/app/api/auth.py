from fastapi import APIRouter

router = APIRouter()

@router.get("/auth")
async def auth_endpoint():
    return {"message": "Auth endpoint"}
