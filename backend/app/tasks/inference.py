import os
import tempfile
import shutil
import docker
import logging
import json
import time
from app.tasks.celery_app import celery_app
from app.db import SessionLocal
from app.models import Job, JobStatus
from app.storage import storage
from app.config import settings
from uuid import UUID

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.inference.run_inference_task", bind=True)
def run_inference_task(self, job_id: str):
    """Run inference using a built model container."""
    db = SessionLocal()
    job_uuid = UUID(job_id)

    try:
        job = db.query(Job).filter(Job.id == job_uuid).first()
        if not job:
            raise ValueError(f"Job {job_id} not found")

        # Update status
        job.status = JobStatus.RUNNING
        db.commit()

        logger.info(f"Starting inference for job {job_id}")

        version = job.version
        if not version.docker_image:
            raise ValueError("Model version has no Docker image")

        # Create temp directories under /app/temp which is mounted from host
        # This allows Docker-in-Docker to mount these directories
        temp_base = '/app/temp'
        os.makedirs(temp_base, exist_ok=True)
        work_dir = tempfile.mkdtemp(dir=temp_base, prefix=f'job_{job_id}_')

        # Convert container path to host path for Docker volume mounts
        # /app is mounted from ./backend on the host (ClinAI/backend)
        # Get the absolute path to the backend directory on the host
        container_base = '/app'
        # __file__ is /app/app/tasks/inference.py, so go up 3 levels to get /app
        current_file = os.path.abspath(__file__)  # /app/app/tasks/inference.py
        app_root = os.path.dirname(os.path.dirname(os.path.dirname(current_file)))  # /app

        # This assumes we're running in Docker and /app is mounted from the host
        # The host path would be something like /Users/.../ClinAI/backend
        # For now, use an environment variable or hardcode the detection
        host_base = os.environ.get('HOST_BACKEND_PATH', app_root)
        host_work_dir = work_dir.replace(container_base, host_base)

        logger.info(f"Created work directory: {work_dir} (host: {host_work_dir})")
        try:
            input_dir = os.path.join(work_dir, "in")
            output_dir = os.path.join(work_dir, "out")
            host_input_dir = os.path.join(host_work_dir, "in")
            host_output_dir = os.path.join(host_work_dir, "out")
            os.makedirs(input_dir)
            os.makedirs(output_dir)

            # Download input image from MinIO
            input_ext = job.input_path.split('.')[-1]
            local_input_path = os.path.join(input_dir, f"input.{input_ext}")

            logger.info(f"Downloading input from {job.input_path}")
            storage.download_file(job.input_path, local_input_path)

            # Pull Docker image
            docker_client = docker.from_env()
            logger.info(f"Pulling image {version.docker_image}")

            try:
                docker_client.images.pull(version.docker_image)
            except docker.errors.ImageNotFound:
                # Image might already be local
                pass

            # Run container with resource limits and timeout
            logger.info(f"Running container {version.docker_image}")

            container = docker_client.containers.run(
                version.docker_image,
                remove=False,
                volumes={
                    host_input_dir: {'bind': '/workspace/in', 'mode': 'ro'},
                    host_output_dir: {'bind': '/workspace/out', 'mode': 'rw'}
                },
                network_mode='none',
                mem_limit=settings.CONTAINER_MEMORY_LIMIT,
                cpu_period=100000,
                cpu_quota=int(float(settings.CONTAINER_CPU_LIMIT) * 100000),
                detach=True
            )

            # Wait for container with timeout
            start_time = time.time()
            timeout = settings.CONTAINER_TIMEOUT

            try:
                result = container.wait(timeout=timeout)
                exit_code = result['StatusCode']

                if exit_code != 0:
                    logs = container.logs(stderr=True, stdout=True).decode('utf-8')
                    raise RuntimeError(f"Container exited with code {exit_code}. Logs: {logs}")

            except Exception as e:
                # Timeout or other error - kill container
                logger.error(f"Container execution error: {str(e)}")
                try:
                    container.kill()
                except:
                    pass
                raise RuntimeError(f"Inference timeout or error: {str(e)}")

            finally:
                # Cleanup container
                try:
                    container.remove()
                except:
                    pass

            # Check outputs
            output_files = os.listdir(output_dir)
            if not output_files:
                raise RuntimeError("No output files generated")

            logger.info(f"Output files generated: {output_files}")

            # Upload outputs to MinIO
            output_paths = []
            for filename in output_files:
                local_path = os.path.join(output_dir, filename)
                object_name = f"job_outputs/{job_id}/{filename}"

                logger.info(f"Uploading output {filename} to {object_name}")
                storage.upload_file(local_path, object_name)
                output_paths.append(object_name)

            # Update job status
            job.status = JobStatus.SUCCEEDED
            job.output_paths = json.dumps(output_paths)
            db.commit()

            logger.info(f"Inference completed successfully for job {job_id}")
        finally:
            # Clean up temp directory
            if 'work_dir' in locals():
                shutil.rmtree(work_dir, ignore_errors=True)

    except Exception as e:
        logger.error(f"Inference failed for job {job_id}: {str(e)}")

        job = db.query(Job).filter(Job.id == job_uuid).first()
        if job:
            job.status = JobStatus.FAILED
            job.error_message = str(e)
            db.commit()

        raise

    finally:
        db.close()
