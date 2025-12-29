from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models import ModelVersionStatus, JobStatus, UserRole


# User schemas
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: UserRole


class UserResponse(BaseModel):
    id: UUID
    username: str
    email: str
    role: UserRole
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[UUID] = None


# Model schemas
class ModelCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: bool = False


class ModelResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    owner_id: Optional[UUID]
    owner_username: Optional[str] = None  # Owner's username
    is_public: bool
    before_image_path: Optional[str] = None
    after_image_path: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ModelVersion schemas
class ModelVersionCreate(BaseModel):
    model_id: UUID
    version_number: str


class ModelVersionResponse(BaseModel):
    id: UUID
    model_id: UUID
    version_number: str
    status: ModelVersionStatus
    package_path: Optional[str]
    docker_image: Optional[str]
    docker_image_digest: Optional[str]
    build_logs: Optional[str]
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PresignedUploadResponse(BaseModel):
    version_id: UUID
    upload_url: str
    fields: Optional[dict] = None


class BuildTriggerResponse(BaseModel):
    version_id: UUID
    status: str
    message: str


# Job schemas
class JobCreate(BaseModel):
    version_id: UUID
    name: Optional[str] = None


class JobResponse(BaseModel):
    id: UUID
    version_id: UUID
    user_id: Optional[UUID]
    name: Optional[str]
    status: JobStatus
    input_path: Optional[str]
    output_paths: Optional[str]
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class JobInputUploadResponse(BaseModel):
    job_id: UUID
    upload_url: str


class JobOutputResponse(BaseModel):
    job_id: UUID
    status: JobStatus
    output_urls: List[str]


# Batch job schemas
class BatchJobCreate(BaseModel):
    version_id: UUID
    image_count: int
    filenames: List[str]
    name: Optional[str] = None  # Base name for the batch job


class BatchJobUploadUrl(BaseModel):
    filename: str
    url: str


class BatchJobResponse(BaseModel):
    job_id: UUID
    upload_urls: List[BatchJobUploadUrl]


# Multiple jobs schemas
class MultipleJobsCreate(BaseModel):
    version_id: UUID
    filenames: List[str]
    name_prefix: Optional[str] = None  # Prefix for auto-generated names


class SingleJobInfo(BaseModel):
    job_id: UUID
    upload_url: str
    filename: str
    name: Optional[str]  # Auto-generated name for this job


class BatchStatusRequest(BaseModel):
    job_ids: List[UUID]
