from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Application
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@postgres:5432/cvplatform"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # MinIO
    MINIO_ENDPOINT: str = "minio:9000"
    MINIO_EXTERNAL_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "cv-platform"
    MINIO_SECURE: bool = False

    # Docker Registry
    REGISTRY_URL: str = "localhost:5001"

    # JWT Authentication
    SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    ENABLE_AUTH: bool = False  # Set to True in production

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    DOMAIN: str = "localhost"

    # Celery
    CELERY_BROKER_URL: str = "redis://redis:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/0"

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_DEFAULT: str = "100 per hour"
    RATE_LIMIT_BUILD: str = "10 per hour"
    RATE_LIMIT_INFERENCE: str = "50 per hour"
    RATE_LIMIT_UPLOAD: str = "20 per hour"

    # File Upload Limits
    MAX_UPLOAD_SIZE_MB: int = 500
    ALLOWED_UPLOAD_EXTENSIONS: List[str] = [".zip"]
    MAX_ZIP_EXTRACTION_SIZE_MB: int = 2000  # Limit extracted size

    # Container limits
    CONTAINER_CPU_LIMIT: str = "1"
    CONTAINER_MEMORY_LIMIT: str = "8g"
    CONTAINER_TIMEOUT: int = 300  # 5 minutes
    MAX_BUILD_TIME_SECONDS: int = 1800
    MAX_BUILD_MEMORY_GB: int = 4
    MAX_INFERENCE_TIME_SECONDS: int = 300
    MAX_INFERENCE_MEMORY_GB: int = 4
    MAX_INFERENCE_CPU_CORES: int = 2

    # Storage limits
    MAX_STORAGE_PER_USER_GB: int = 10

    # URLs
    PRESIGNED_URL_EXPIRY: int = 3600  # 1 hour

    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = ".env"


settings = Settings()
