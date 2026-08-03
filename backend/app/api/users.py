from fastapi import APIRouter

router = APIRouter()

@router.get("/users")
async def users_endpoint():
    return {"message": "Users endpoint"}
