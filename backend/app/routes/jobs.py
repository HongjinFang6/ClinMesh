from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
import json
from app.db import get_db
from app.models import User, ModelVersion, Job, JobStatus, ModelVersionStatus
from app.schemas import JobCreate, JobResponse, JobInputUploadResponse, JobOutputResponse, BatchJobCreate, BatchJobResponse, MultipleJobsCreate, SingleJobInfo, BatchStatusRequest
from app.auth import get_current_user
from app.storage import storage

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.post("/", response_model=JobInputUploadResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    job_data: JobCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify version exists and is ready
    version = db.query(ModelVersion).filter(ModelVersion.id == job_data.version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Model version not found")

    if version.status != ModelVersionStatus.READY:
        raise HTTPException(
            status_code=400,
            detail=f"Model version is not ready (status: {version.status})"
        )

    # Create job with current user
    new_job = Job(
        version_id=job_data.version_id,
        user_id=current_user.id,
        name=job_data.name,
        status=JobStatus.UPLOADING
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    # Set input path
    object_name = f"job_inputs/{new_job.id}/input.png"
    new_job.input_path = object_name
    db.commit()

    # Return API upload endpoint instead of presigned URL
    upload_endpoint = f"/api/jobs/{new_job.id}/upload"

    return {
        "job_id": new_job.id,
        "upload_url": upload_endpoint
    }


@router.post("/batch", response_model=BatchJobResponse, status_code=status.HTTP_201_CREATED)
async def create_batch_job(
    job_data: BatchJobCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a single job that processes multiple images in batch."""
    # Verify version exists and is ready
    version = db.query(ModelVersion).filter(ModelVersion.id == job_data.version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Model version not found")

    if version.status != ModelVersionStatus.READY:
        raise HTTPException(
            status_code=400,
            detail=f"Model version is not ready (status: {version.status})"
        )

    # Create job with current user
    new_job = Job(
        version_id=job_data.version_id,
        user_id=current_user.id,
        name=job_data.name,
        status=JobStatus.UPLOADING
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    # Store input paths as JSON array
    input_paths = [f"job_inputs/{new_job.id}/{i}_{filename}"
                   for i, filename in enumerate(job_data.filenames)]
    new_job.input_path = json.dumps(input_paths)
    db.commit()

    # Generate upload URLs for each image
    upload_urls = []
    for i, filename in enumerate(job_data.filenames):
        upload_endpoint = f"/api/jobs/{new_job.id}/upload/{i}"
        upload_urls.append({
            "filename": filename,
            "url": upload_endpoint
        })

    return {
        "job_id": new_job.id,
        "upload_urls": upload_urls
    }


@router.post("/multiple", response_model=List[SingleJobInfo], status_code=status.HTTP_201_CREATED)
async def create_multiple_jobs(
    job_data: MultipleJobsCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create multiple individual jobs, one for each image."""
    # Verify version exists and is ready
    version = db.query(ModelVersion).filter(ModelVersion.id == job_data.version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Model version not found")

    if version.status != ModelVersionStatus.READY:
        raise HTTPException(
            status_code=400,
            detail=f"Model version is not ready (status: {version.status})"
        )

    # Create a job for each image
    created_jobs = []
    for idx, filename in enumerate(job_data.filenames):
        # Auto-generate job name: prefix (if provided) + filename (without extension)
        if job_data.name_prefix:
            # Use prefix + filename
            base_name = filename.rsplit('.', 1)[0]  # Remove extension
            job_name = f"{job_data.name_prefix} - {base_name}"
        else:
            # Just use filename without extension
            job_name = filename.rsplit('.', 1)[0]

        new_job = Job(
            version_id=job_data.version_id,
            user_id=current_user.id,
            name=job_name,
            status=JobStatus.UPLOADING
        )
        db.add(new_job)
        db.flush()  # Get the ID without committing

        # Set input path
        object_name = f"job_inputs/{new_job.id}/{filename}"
        new_job.input_path = object_name

        upload_endpoint = f"/api/jobs/{new_job.id}/upload"

        created_jobs.append({
            "job_id": new_job.id,
            "upload_url": upload_endpoint,
            "filename": filename,
            "name": job_name
        })

    db.commit()

    return created_jobs


@router.post("/batch-status", response_model=List[JobResponse])
async def get_batch_status(
    request: BatchStatusRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get status of multiple jobs at once."""
    jobs = db.query(Job).filter(
        Job.id.in_(request.job_ids),
        Job.user_id == current_user.id
    ).all()

    return jobs


@router.post("/{job_id}/run", response_model=JobResponse)
async def run_job(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Check ownership
    if job.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Check status
    if job.status != JobStatus.UPLOADING:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot run job in status {job.status}"
        )

    # Update status and enqueue inference task
    job.status = JobStatus.QUEUED
    db.commit()
    db.refresh(job)

    # Enqueue inference task
    from app.tasks.inference import run_inference_task
    run_inference_task.delay(str(job_id))

    return job


@router.post("/{job_id}/upload")
async def upload_job_input(
    job_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Proxy endpoint for uploading job input image to MinIO."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != JobStatus.UPLOADING:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot upload to job in status {job.status}"
        )

    try:
        # Save file temporarily
        import tempfile
        import os
        with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name

        # Upload to MinIO
        storage.upload_file(tmp_path, job.input_path)

        # Clean up temp file
        os.unlink(tmp_path)

        return {"message": "Upload successful", "job_id": job_id}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/{job_id}/upload/{index}")
async def upload_batch_job_input(
    job_id: UUID,
    index: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Proxy endpoint for uploading one image in a batch job to MinIO."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != JobStatus.UPLOADING:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot upload to job in status {job.status}"
        )

    try:
        # Parse input paths (for batch jobs, input_path is a JSON array)
        try:
            input_paths = json.loads(job.input_path)
            if not isinstance(input_paths, list):
                raise ValueError("Expected list of paths")
        except (json.JSONDecodeError, ValueError):
            raise HTTPException(
                status_code=400,
                detail="This job is not a batch job"
            )

        if index < 0 or index >= len(input_paths):
            raise HTTPException(
                status_code=400,
                detail=f"Index {index} out of range (0-{len(input_paths)-1})"
            )

        # Get the target path for this index
        target_path = input_paths[index]

        # Save file temporarily
        import tempfile
        import os
        with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name

        # Upload to MinIO
        storage.upload_file(tmp_path, target_path)

        # Clean up temp file
        os.unlink(tmp_path)

        return {"message": "Upload successful", "job_id": job_id, "index": index}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/{job_id}/download/{output_index}")
async def download_job_output(
    job_id: UUID,
    output_index: int,
    db: Session = Depends(get_db)
):
    """Proxy endpoint for downloading job output files from MinIO."""
    from fastapi.responses import StreamingResponse
    import io

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if not job.output_paths or job.status != JobStatus.SUCCEEDED:
        raise HTTPException(status_code=400, detail="No outputs available for this job")

    output_paths = json.loads(job.output_paths)
    if output_index >= len(output_paths):
        raise HTTPException(status_code=404, detail="Output index out of range")

    object_path = output_paths[output_index]

    try:
        # Download from MinIO
        response = storage.client.get_object(storage.bucket, object_path)

        # Stream the file content
        file_data = response.read()

        # Determine filename from path
        filename = object_path.split('/')[-1]

        return StreamingResponse(
            io.BytesIO(file_data),
            media_type="image/png",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Check ownership
    if job.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return job


@router.get("/{job_id}/outputs", response_model=JobOutputResponse)
async def get_job_outputs(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Check ownership
    if job.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Return API proxy endpoints instead of presigned URLs
    output_urls = []
    if job.output_paths and job.status == JobStatus.SUCCEEDED:
        output_paths = json.loads(job.output_paths)
        for idx, path in enumerate(output_paths):
            # Return API proxy endpoint for download
            url = f"/api/jobs/{job.id}/download/{idx}"
            output_urls.append(url)

    return {
        "job_id": job.id,
        "status": job.status,
        "output_urls": output_urls
    }


@router.get("/", response_model=List[JobResponse])
async def list_jobs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only return current user's jobs
    jobs = db.query(Job).filter(Job.user_id == current_user.id).order_by(Job.created_at.desc()).all()
    return jobs
