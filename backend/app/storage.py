from minio import Minio
from minio.error import S3Error
from app.config import settings
from typing import Optional
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


class StorageClient:
    def __init__(self):
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
        )
        self.bucket = settings.MINIO_BUCKET
        self._ensure_bucket()

    def _ensure_bucket(self):
        """Ensure the bucket exists, create if it doesn't."""
        try:
            if not self.client.bucket_exists(self.bucket):
                self.client.make_bucket(self.bucket)
                logger.info(f"Created bucket: {self.bucket}")
        except S3Error as e:
            logger.error(f"Error ensuring bucket exists: {e}")

    def get_presigned_upload_url(self, object_name: str, expires: int = None) -> str:
        """Generate a presigned URL for uploading an object."""
        if expires is None:
            expires = settings.PRESIGNED_URL_EXPIRY
        try:
            url = self.client.presigned_put_object(
                self.bucket,
                object_name,
                expires=timedelta(seconds=expires)
            )
            # Replace internal endpoint with external endpoint for browser access
            # This preserves the AWS signature while changing the hostname
            url = url.replace(f"http://{settings.MINIO_ENDPOINT}", f"http://{settings.MINIO_EXTERNAL_ENDPOINT}")
            return url
        except S3Error as e:
            logger.error(f"Error generating presigned upload URL: {e}")
            raise

    def get_presigned_download_url(self, object_name: str, expires: int = None) -> str:
        """Generate a presigned URL for downloading an object."""
        if expires is None:
            expires = settings.PRESIGNED_URL_EXPIRY
        try:
            url = self.client.presigned_get_object(
                self.bucket,
                object_name,
                expires=timedelta(seconds=expires)
            )
            # Replace internal endpoint with external endpoint for browser access
            # This preserves the AWS signature while changing the hostname
            url = url.replace(f"http://{settings.MINIO_ENDPOINT}", f"http://{settings.MINIO_EXTERNAL_ENDPOINT}")
            return url
        except S3Error as e:
            logger.error(f"Error generating presigned download URL: {e}")
            raise

    def download_file(self, object_name: str, file_path: str):
        """Download a file from MinIO to local path."""
        try:
            self.client.fget_object(self.bucket, object_name, file_path)
        except S3Error as e:
            logger.error(f"Error downloading file {object_name}: {e}")
            raise

    def upload_file(self, file_path: str, object_name: str):
        """Upload a file from local path to MinIO."""
        try:
            self.client.fput_object(self.bucket, object_name, file_path)
        except S3Error as e:
            logger.error(f"Error uploading file {object_name}: {e}")
            raise

    def list_objects(self, prefix: str):
        """List objects with a given prefix."""
        try:
            objects = self.client.list_objects(self.bucket, prefix=prefix, recursive=True)
            return [obj.object_name for obj in objects]
        except S3Error as e:
            logger.error(f"Error listing objects with prefix {prefix}: {e}")
            raise

    def delete_object(self, object_name: str):
        """Delete an object from MinIO."""
        try:
            self.client.remove_object(self.bucket, object_name)
        except S3Error as e:
            logger.error(f"Error deleting object {object_name}: {e}")
            raise


# Singleton instance
storage = StorageClient()
