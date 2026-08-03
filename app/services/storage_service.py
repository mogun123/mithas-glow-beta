"""
AWS S3 / Cloudflare R2 Storage Service
Handles file uploads, downloads, and management
"""

import boto3
from typing import Optional, BinaryIO
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)

class StorageService:
    def __init__(self):
        self.settings = get_settings()
        self.s3_client = None
        self._initialize_s3()
    
    def _initialize_s3(self):
        """Initialize S3 client with credentials from environment"""
        try:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=self.settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=self.settings.AWS_SECRET_ACCESS_KEY,
                region_name=self.settings.AWS_REGION,
            )
            logger.info("S3 client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize S3 client: {e}")
            raise
    
    async def upload_file(
        self,
        file: BinaryIO,
        bucket: str,
        key: str,
        content_type: str = 'application/octet-stream'
    ) -> dict:
        """Upload file to S3"""
        try:
            self.s3_client.upload_fileobj(
                file,
                bucket,
                key,
                ExtraArgs={
                    'ContentType': content_type,
                    'ACL': 'public-read'
                }
            )
            
            url = f"https://{bucket}.s3.{self.settings.AWS_REGION}.amazonaws.com/{key}"
            logger.info(f"File uploaded: {key}")
            return {
                "success": True,
                "key": key,
                "url": url,
                "bucket": bucket
            }
        except Exception as e:
            logger.error(f"Upload failed: {e}")
            raise
    
    async def delete_file(self, bucket: str, key: str) -> dict:
        """Delete file from S3"""
        try:
            self.s3_client.delete_object(Bucket=bucket, Key=key)
            logger.info(f"File deleted: {key}")
            return {"success": True, "key": key}
        except Exception as e:
            logger.error(f"Delete failed: {e}")
            raise
    
    async def get_file_url(
        self,
        bucket: str,
        key: str,
        expires_in: int = 3600
    ) -> str:
        """Get signed URL for private files"""
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket, 'Key': key},
                ExpiresIn=expires_in
            )
            return url
        except Exception as e:
            logger.error(f"Failed to generate URL: {e}")
            raise
    
    async def list_files(self, bucket: str, prefix: str = '') -> list:
        """List files in bucket"""
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=bucket,
                Prefix=prefix
            )
            files = []
            if 'Contents' in response:
                for obj in response['Contents']:
                    files.append({
                        'key': obj['Key'],
                        'size': obj['Size'],
                        'modified': obj['LastModified'].isoformat()
                    })
            return files
        except Exception as e:
            logger.error(f"List failed: {e}")
            raise

# Singleton instance
_storage_service: Optional[StorageService] = None

def get_storage_service() -> StorageService:
    """Get or create storage service instance"""
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService()
    return _storage_service
