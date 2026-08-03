from fastapi import APIRouter

router = APIRouter()

@router.get("/file-upload")
async def file_upload_endpoint():
    return {"message": "File upload endpoint"}
