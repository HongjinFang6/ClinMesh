from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.db import get_db
from app.models import User, Model, ModelVersion, ModelVersionStatus, ModelFavorite
from app.schemas import (
    ModelCreate, ModelResponse, ModelVersionCreate,
    ModelVersionResponse, PresignedUploadResponse, BuildTriggerResponse
)
from app.auth import get_current_user, get_current_user_optional, get_developer_user
from app.storage import storage
from app.tasks.celery_app import celery_app
from typing import Optional

router = APIRouter(prefix="/api/models", tags=["models"])


@router.post("/", response_model=ModelResponse, status_code=status.HTTP_201_CREATED)
async def create_model(
    model_data: ModelCreate,
    current_user: User = Depends(get_developer_user),
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
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    List models:
    - If public_only=True: Return all public models (from any user) - no auth required
    - If public_only=False: Return only current user's models (public and private) - requires auth
    """
    query = db.query(Model)
    if public_only:
        # Show all public models (no auth required)
        query = query.filter(Model.is_public == True)
    else:
        # Show only current user's models (requires auth)
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to view your models"
            )
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
    current_user: User = Depends(get_developer_user),
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
    current_user: User = Depends(get_developer_user),
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
    current_user: User = Depends(get_developer_user),
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
    current_user: User = Depends(get_developer_user),
    db: Session = Depends(get_db)
):
    """Delete a model version"""
    version = db.query(ModelVersion).filter(ModelVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    db.delete(version)
    db.commit()
    return {"message": "Version deleted successfully"}


# Favorites routes must come before /{model_id} to avoid matching "favorites" as a model_id
@router.get("/favorites/list", response_model=List[ModelResponse])
async def list_favorite_models(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's favorited models"""
    favorites = db.query(ModelFavorite).filter(
        ModelFavorite.user_id == current_user.id
    ).all()

    if not favorites:
        return []

    model_ids = [fav.model_id for fav in favorites]
    models = db.query(Model).filter(Model.id.in_(model_ids)).all()

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


# This route must come after all /versions and /favorites routes to avoid matching them as a model_id
@router.get("/{model_id}", response_model=ModelResponse)
async def get_model(
    model_id: UUID,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    model = db.query(Model).filter(Model.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    # Check access: public models are accessible to everyone
    if not model.is_public:
        # Private models require authentication and ownership
        if not current_user:
            raise HTTPException(status_code=401, detail="Authentication required")
        if model.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    return model


@router.put("/{model_id}", response_model=ModelResponse)
async def update_model(
    model_id: UUID,
    model_data: ModelCreate,
    current_user: User = Depends(get_developer_user),
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
    current_user: User = Depends(get_developer_user),
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
    current_user: User = Depends(get_developer_user),
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


@router.post("/{model_id}/favorite")
async def favorite_model(
    model_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a model to user's favorites"""
    # Check if model exists
    model = db.query(Model).filter(Model.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    # Check if already favorited
    existing_favorite = db.query(ModelFavorite).filter(
        ModelFavorite.user_id == current_user.id,
        ModelFavorite.model_id == model_id
    ).first()

    if existing_favorite:
        raise HTTPException(status_code=400, detail="Model already favorited")

    # Create favorite
    favorite = ModelFavorite(
        user_id=current_user.id,
        model_id=model_id
    )
    db.add(favorite)
    db.commit()

    return {"message": "Model added to favorites"}


@router.delete("/{model_id}/favorite")
async def unfavorite_model(
    model_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a model from user's favorites"""
    favorite = db.query(ModelFavorite).filter(
        ModelFavorite.user_id == current_user.id,
        ModelFavorite.model_id == model_id
    ).first()

    if not favorite:
        raise HTTPException(status_code=404, detail="Favorite not found")

    db.delete(favorite)
    db.commit()

    return {"message": "Model removed from favorites"}


@router.post("/{model_id}/demo/upload-before")
async def upload_before_image(
    model_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_developer_user),
    db: Session = Depends(get_db)
):
    """Upload before demo image for a model"""
    model = db.query(Model).filter(Model.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    # Check ownership
    if model.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the model owner can upload demo images")

    try:
        # Delete old image if it exists
        if model.before_image_path:
            try:
                storage.delete_object(model.before_image_path)
            except Exception as e:
                # Log but don't fail if old image doesn't exist
                print(f"Warning: Could not delete old before image: {e}")

        # Save file temporarily
        import tempfile
        import os
        with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name

        # Upload to MinIO
        object_name = f"model_demos/{model_id}/before.png"
        storage.upload_file(tmp_path, object_name)

        # Clean up temp file
        os.unlink(tmp_path)

        # Update model record
        model.before_image_path = object_name
        db.commit()

        return {"message": "Before image uploaded successfully", "path": object_name}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/{model_id}/demo/upload-after")
async def upload_after_image(
    model_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_developer_user),
    db: Session = Depends(get_db)
):
    """Upload after demo image for a model"""
    model = db.query(Model).filter(Model.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    # Check ownership
    if model.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the model owner can upload demo images")

    try:
        # Delete old image if it exists
        if model.after_image_path:
            try:
                storage.delete_object(model.after_image_path)
            except Exception as e:
                # Log but don't fail if old image doesn't exist
                print(f"Warning: Could not delete old after image: {e}")

        # Save file temporarily
        import tempfile
        import os
        with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name

        # Upload to MinIO
        object_name = f"model_demos/{model_id}/after.png"
        storage.upload_file(tmp_path, object_name)

        # Clean up temp file
        os.unlink(tmp_path)

        # Update model record
        model.after_image_path = object_name
        db.commit()

        return {"message": "After image uploaded successfully", "path": object_name}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/{model_id}/demo/before")
async def download_before_image(
    model_id: UUID,
    db: Session = Depends(get_db)
):
    """Download before demo image"""
    from fastapi.responses import StreamingResponse
    import io

    model = db.query(Model).filter(Model.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    if not model.before_image_path:
        raise HTTPException(status_code=404, detail="No before image available")

    try:
        # Download from MinIO
        response = storage.client.get_object(storage.bucket, model.before_image_path)
        file_data = response.read()

        return StreamingResponse(
            io.BytesIO(file_data),
            media_type="image/png",
            headers={"Content-Disposition": "inline; filename=before.png"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")


@router.get("/{model_id}/demo/after")
async def download_after_image(
    model_id: UUID,
    db: Session = Depends(get_db)
):
    """Download after demo image"""
    from fastapi.responses import StreamingResponse
    import io

    model = db.query(Model).filter(Model.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    if not model.after_image_path:
        raise HTTPException(status_code=404, detail="No after image available")

    try:
        # Download from MinIO
        response = storage.client.get_object(storage.bucket, model.after_image_path)
        file_data = response.read()

        return StreamingResponse(
            io.BytesIO(file_data),
            media_type="image/png",
            headers={"Content-Disposition": "inline; filename=after.png"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")
