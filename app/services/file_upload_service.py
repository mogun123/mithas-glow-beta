import os
import uuid
from typing import Optional
import boto3
from botocore.exceptions import ClientError
from app.config import get_settings

settings = get_settings()

class FileUploadService:
    """Service for handling file uploads to S3 or local storage"""
    
    def __init__(self):
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION
            )
            self.use_s3 = True
        else:
            self.use_s3 = False
            self.upload_dir = "uploads"
            os.makedirs(self.upload_dir, exist_ok=True)
    
    async def upload_file(
        self, 
        file_path: str, 
        file_name: str,
        content_type: str = "application/octet-stream"
    ) -> str:
        """Upload file and return URL"""
        try:
            unique_filename = f"{uuid.uuid4().hex}_{file_name}"
            
            if self.use_s3:
                return await self._upload_to_s3(file_path, unique_filename, content_type)
            else:
                return await self._upload_local(file_path, unique_filename)
        except Exception as e:
            raise Exception(f"File upload failed: {str(e)}")
    
    async def _upload_to_s3(
        self, 
        file_path: str, 
        unique_filename: str,
        content_type: str
    ) -> str:
        """Upload to AWS S3"""
        try:
            with open(file_path, 'rb') as f:
                self.s3_client.upload_fileobj(
                    f,
                    settings.AWS_S3_BUCKET,
                    unique_filename,
                    ExtraArgs={'ContentType': content_type}
                )
            
            url = f"https://{settings.AWS_S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{unique_filename}"
            return url
        except ClientError as e:
            raise Exception(f"S3 upload error: {str(e)}")
    
    async def _upload_local(self, file_path: str, unique_filename: str) -> str:
        """Upload to local storage"""
        import shutil
        dest_path = os.path.join(self.upload_dir, unique_filename)
        shutil.copy(file_path, dest_path)
        return f"/uploads/{unique_filename}"
    
    async def delete_file(self, file_url: str) -> bool:
        """Delete file"""
        try:
            if self.use_s3:
                file_key = file_url.split('/')[-1]
                self.s3_client.delete_object(
                    Bucket=settings.AWS_S3_BUCKET,
                    Key=file_key
                )
            else:
                file_path = file_url.replace("/uploads/", self.upload_dir + "/")
                if os.path.exists(file_path):
                    os.remove(file_path)
            return True
        except Exception as e:
            raise Exception(f"File deletion failed: {str(e)}")

# Singleton instance
_file_upload_service = None

def get_file_upload_service() -> FileUploadService:
    global _file_upload_service
    if _file_upload_service is None:
        _file_upload_service = FileUploadService()
    return _file_upload_service
