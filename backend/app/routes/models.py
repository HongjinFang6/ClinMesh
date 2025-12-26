from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.db import get_db
from app.models import User, Model, ModelVersion, ModelVersionStatus
from app.schemas import (
    ModelCreate, ModelResponse, ModelVersionCreate,
    ModelVersionResponse, PresignedUploadResponse, BuildTriggerResponse
)
from app.auth import get_current_user
from app.storage import storage
from app.tasks.celery_app import celery_app
from typing import Optional

router = APIRouter(prefix="/api/models", tags=["models"])


@router.post("/", response_model=ModelResponse, status_code=status.HTTP_201_CREATED)
async def create_model(
    model_data: ModelCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Create model with current user as owner
    new_model = Model(
        name=model_data.name,
        description=model_data.description,
        is_public=model_data.is_public,
        owner_id=current_user.id
    )
    db.add(new_model)
    db.commit()
    db.refresh(new_model)
    return new_model


@router.get("/", response_model=List[ModelResponse])
async def list_models(
    public_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List models:
    - If public_only=True: Return all public models (from any user)
    - If public_only=False: Return only current user's models (public and private)
    """
    query = db.query(Model)
    if public_only:
        # Show all public models
        query = query.filter(Model.is_public == True)
    else:
        # Show only current user's models
        query = query.filter(Model.owner_id == current_user.id)

    models = query.all()

    # Add owner username to each model
    result = []
    for model in models:
        model_dict = {
            "id": model.id,
            "name": model.name,
            "description": model.description,
            "owner_id": model.owner_id,
            "is_public": model.is_public,
            "created_at": model.created_at,
            "owner_username": None
        }

        # Get owner username if owner exists
        if model.owner_id:
            owner = db.query(User).filter(User.id == model.owner_id).first()
            if owner:
                model_dict["owner_username"] = owner.username

        result.append(model_dict)

    return result


# All /versions routes must come before /{model_id} to avoid routing conflicts
@router.get("/versions", response_model=List[ModelVersionResponse])
def list_model_versions(
    status: str = None,
    model_id: UUID = None,
    db: Session = Depends(get_db)
):
    """List all model versions, optionally filtered by status and/or model_id"""
    query = db.query(ModelVersion)
    if status:
        query = query.filter(ModelVersion.status == status)
    if model_id:
        query = query.filter(ModelVersion.model_id == model_id)
    versions = query.all()
    return versions


@router.post("/versions", response_model=PresignedUploadResponse)
def create_model_version(
    version_data: ModelVersionCreate,
    db: Session = Depends(get_db)
):
    # Verify model exists
    model = db.query(Model).filter(Model.id == version_data.model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    # Create version
    new_version = ModelVersion(
        model_id=version_data.model_id,
        version_number=version_data.version_number,
        status=ModelVersionStatus.UPLOADING
    )
    db.add(new_version)
    db.commit()
    db.refresh(new_version)

    # Generate presigned upload URL
    object_name = f"model_packages/{new_version.id}.zip"
    upload_url = storage.get_presigned_upload_url(object_name)

    # Update package path
    new_version.package_path = object_name
    db.commit()

    # Return API upload endpoint instead of presigned URL for browser compatibility
    upload_endpoint = f"/api/models/versions/{new_version.id}/upload"

    return {
        "version_id": new_version.id,
        "upload_url": upload_endpoint
    }


@router.get("/versions/{version_id}", response_model=ModelVersionResponse)
def get_model_version(
    version_id: UUID,
    db: Session = Depends(get_db)
):
    version = db.query(ModelVersion).filter(ModelVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    return version


@router.post("/versions/{version_id}/build", response_model=BuildTriggerResponse)
def trigger_build(
    version_id: UUID,
    db: Session = Depends(get_db)
):
    version = db.query(ModelVersion).filter(ModelVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    # Check status
    if version.status != ModelVersionStatus.UPLOADING:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot build version in status {version.status}"
        )

    # Update status and trigger build task
    version.status = ModelVersionStatus.BUILDING
    db.commit()

    # Enqueue build task
    from app.tasks.build import build_model_task
    build_model_task.delay(str(version_id))

    return {
        "version_id": version_id,
        "status": "BUILDING",
        "message": "Build task enqueued"
    }


@router.post("/versions/{version_id}/upload")
async def upload_model_package(
    version_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Proxy endpoint for uploading model package to MinIO."""
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Upload request received for version {version_id}")
    logger.info(f"File: {file.filename if file else 'None'}, Content-Type: {file.content_type if file else 'None'}")

    version = db.query(ModelVersion).filter(ModelVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    if version.status != ModelVersionStatus.UPLOADING:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot upload to version in status {version.status}"
        )

    try:
        # Save file temporarily
        import tempfile
        import os
        with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name

        # Upload to MinIO
        storage.upload_file(tmp_path, version.package_path)

        # Clean up temp file
        os.unlink(tmp_path)

        return {"message": "Upload successful", "version_id": version_id}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.delete("/versions/{version_id}")
def delete_model_version(
    version_id: UUID,
    db: Session = Depends(get_db)
):
    """Delete a model version"""
    version = db.query(ModelVersion).filter(ModelVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    db.delete(version)
    db.commit()
    return {"message": "Version deleted successfully"}


# This route must come after all /versions routes to avoid matching "versions" as a model_id
@router.get("/{model_id}", response_model=ModelResponse)
async def get_model(
    model_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    model = db.query(Model).filter(Model.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    # Check access: owner can access any model, others can only access public models
    if model.owner_id != current_user.id and not model.is_public:
        raise HTTPException(status_code=403, detail="Access denied")

    return model


@router.put("/{model_id}", response_model=ModelResponse)
async def update_model(
    model_id: UUID,
    model_data: ModelCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update model details - only owner can update"""
    model = db.query(Model).filter(Model.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    # Check ownership
    if model.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the model owner can update it")

    # Update fields
    model.name = model_data.name
    model.description = model_data.description
    model.is_public = model_data.is_public

    db.commit()
    db.refresh(model)
    return model


@router.delete("/{model_id}")
async def delete_model(
    model_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a model and all its versions - only owner can delete"""
    model = db.query(Model).filter(Model.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    # Check ownership
    if model.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the model owner can delete it")

    db.delete(model)
    db.commit()
    return {"message": "Model deleted successfully"}


@router.post("/{model_id}/copy", response_model=ModelResponse)
async def copy_model(
    model_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Copy a public model to your own collection"""
    # Get the original model
    original_model = db.query(Model).filter(Model.id == model_id).first()
    if not original_model:
        raise HTTPException(status_code=404, detail="Model not found")

    # Check if model is public (can only copy public models)
    if not original_model.is_public:
        raise HTTPException(status_code=403, detail="Can only copy public models")

    # Check if user is trying to copy their own model
    if original_model.owner_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot copy your own model")

    # Create a copy of the model
    new_model = Model(
        name=f"{original_model.name} (Copy)",
        description=f"Copied from {original_model.name}. Original description: {original_model.description or 'None'}",
        is_public=False,  # Copies are private by default
        owner_id=current_user.id
    )
    db.add(new_model)
    db.commit()
    db.refresh(new_model)

    # Copy all READY versions from the original model
    original_versions = db.query(ModelVersion).filter(
        ModelVersion.model_id == model_id,
        ModelVersion.status == ModelVersionStatus.READY
    ).all()

    for orig_version in original_versions:
        new_version = ModelVersion(
            model_id=new_model.id,
            version_number=orig_version.version_number,
            status=orig_version.status,
            package_path=orig_version.package_path,  # Reuse same package in MinIO
            docker_image=orig_version.docker_image,  # Reuse same Docker image
            docker_image_digest=orig_version.docker_image_digest,
            build_logs=orig_version.build_logs
        )
        db.add(new_version)

    db.commit()

    return new_model
