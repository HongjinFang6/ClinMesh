import os
import tempfile
import zipfile
import shutil
import docker
import logging
from app.tasks.celery_app import celery_app
from app.db import SessionLocal
from app.models import ModelVersion, ModelVersionStatus
from app.storage import storage
from app.config import settings
from uuid import UUID

logger = logging.getLogger(__name__)


RUNNER_SCRIPT = """import sys
import json
import os
import traceback

sys.path.insert(0, '/app/user_code')

try:
    from predict import run

    input_path = '/workspace/in/input.png'
    output_dir = '/workspace/out'

    # Find the actual input file
    input_files = os.listdir('/workspace/in')
    if input_files:
        input_path = os.path.join('/workspace/in', input_files[0])

    result = run(input_path, output_dir)

    # Verify at least one output file was created
    output_files = os.listdir(output_dir)
    if not output_files:
        raise RuntimeError("No output files generated")

    print(json.dumps({"status": "success", "result": result}))

except Exception as e:
    error_msg = traceback.format_exc()
    print(json.dumps({"status": "error", "error": str(e), "traceback": error_msg}), file=sys.stderr)
    sys.exit(1)
"""


DOCKERFILE_TEMPLATE = """FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    python3-dev \\
    gcc \\
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy user code and requirements
COPY user_code/ /app/user_code/
COPY runner/ /app/runner/

# Install Python dependencies
RUN pip install --no-cache-dir -r /app/user_code/requirements.txt

# Set entrypoint
ENTRYPOINT ["python", "/app/runner/runner.py"]
"""


@celery_app.task(name="app.tasks.build.build_model_task", bind=True)
def build_model_task(self, version_id: str):
    """Build a Docker image from uploaded model package."""
    db = SessionLocal()
    version_uuid = UUID(version_id)
    build_logs = []

    try:
        version = db.query(ModelVersion).filter(ModelVersion.id == version_uuid).first()
        if not version:
            raise ValueError(f"Version {version_id} not found")

        build_logs.append(f"Starting build for version {version_id}")

        # Create temp directory for build context
        with tempfile.TemporaryDirectory() as build_dir:
            # Download package from MinIO
            package_path = os.path.join(build_dir, "package.zip")
            build_logs.append(f"Downloading package from {version.package_path}")
            storage.download_file(version.package_path, package_path)

            # Extract package
            user_code_dir = os.path.join(build_dir, "user_code")
            os.makedirs(user_code_dir)
            build_logs.append("Extracting package")

            with zipfile.ZipFile(package_path, 'r') as zip_ref:
                zip_ref.extractall(user_code_dir)

            # Verify required files
            if not os.path.exists(os.path.join(user_code_dir, "predict.py")):
                raise ValueError("predict.py not found in package")
            if not os.path.exists(os.path.join(user_code_dir, "requirements.txt")):
                raise ValueError("requirements.txt not found in package")

            build_logs.append("Package validated")

            # Create runner directory
            runner_dir = os.path.join(build_dir, "runner")
            os.makedirs(runner_dir)

            with open(os.path.join(runner_dir, "runner.py"), "w") as f:
                f.write(RUNNER_SCRIPT)

            # Create Dockerfile
            with open(os.path.join(build_dir, "Dockerfile"), "w") as f:
                f.write(DOCKERFILE_TEMPLATE)

            build_logs.append("Build context prepared")

            # Build Docker image
            docker_client = docker.from_env()
            image_tag = f"{settings.REGISTRY_URL}/model-{version_id}:latest"

            build_logs.append(f"Building Docker image: {image_tag}")

            image, build_output = docker_client.images.build(
                path=build_dir,
                tag=image_tag,
                rm=True,
                forcerm=True
            )

            for line in build_output:
                if 'stream' in line:
                    build_logs.append(line['stream'].strip())

            build_logs.append("Docker image built successfully")

            # Push to local registry
            build_logs.append(f"Pushing to registry: {image_tag}")

            for line in docker_client.images.push(image_tag, stream=True, decode=True):
                if 'status' in line:
                    build_logs.append(f"Push: {line['status']}")

            # Get image digest
            image.reload()
            image_digest = image.id

            build_logs.append(f"Image pushed successfully. Digest: {image_digest}")

            # Skip smoke test for now (volume mounting issues on some platforms)
            build_logs.append("Skipping smoke test")

            # Update version status
            version.status = ModelVersionStatus.READY
            version.docker_image = image_tag
            version.docker_image_digest = image_digest
            version.build_logs = "\n".join(build_logs)
            db.commit()

            build_logs.append("Build completed successfully")
            logger.info(f"Build completed for version {version_id}")

    except Exception as e:
        logger.error(f"Build failed for version {version_id}: {str(e)}")
        build_logs.append(f"ERROR: {str(e)}")

        version = db.query(ModelVersion).filter(ModelVersion.id == version_uuid).first()
        if version:
            version.status = ModelVersionStatus.FAILED
            version.error_message = str(e)
            version.build_logs = "\n".join(build_logs)
            db.commit()

        raise

    finally:
        db.close()
