from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@postgres:5432/cvplatform"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # MinIO
    MINIO_ENDPOINT: str = "minio:9000"
    MINIO_EXTERNAL_ENDPOINT: str = "localhost:9000"  # External URL for presigned URLs
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "cv-platform"
    MINIO_SECURE: bool = False

    # Docker Registry
    REGISTRY_URL: str = "localhost:5001"

    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Celery
    CELERY_BROKER_URL: str = "redis://redis:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/0"

    # Container limits
    CONTAINER_CPU_LIMIT: str = "1"
    CONTAINER_MEMORY_LIMIT: str = "2g"
    CONTAINER_TIMEOUT: int = 60  # seconds

    # URLs
    PRESIGNED_URL_EXPIRY: int = 3600  # 1 hour

    class Config:
        env_file = ".env"


settings = Settings()
