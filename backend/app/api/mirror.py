from fastapi import APIRouter

router = APIRouter()

@router.get("/mirror")
async def mirror_endpoint():
    return {"message": "Mirror endpoint"}
