# ClinAI - Computer Vision Model Deployment Platform

A full-stack platform for deploying and running computer vision models with zero DevOps overhead. Simply upload your Python model code, and ClinAI automatically containerizes it, builds Docker images, and provides both a web UI and REST API for running inference.

## Overview

ClinAI is designed for data scientists and ML engineers who want to deploy their CV models without dealing with infrastructure complexity. The platform handles:

- **Model Packaging**: Upload a ZIP file with your Python code and dependencies
- **Automatic Containerization**: Builds Docker images without requiring a Dockerfile
- **Build Pipeline**: Automated image building with real-time logs and status tracking
- **Inference Execution**: Run predictions on images through a web UI or API
- **Resource Management**: Sandboxed execution with CPU/memory limits and network isolation
- **Storage**: S3-compatible object storage for models, inputs, and outputs

## Key Features

### Backend (FastAPI + Python)
- **Automatic Docker Image Building**: Upload `predict.py` + `requirements.txt` - no Dockerfile needed
- **JWT Authentication**: Secure user registration and login (currently disabled for MVP)
- **MinIO Object Storage**: S3-compatible storage with direct upload support
- **Celery Task Queues**: Separate workers for building and inference with real-time status updates
- **PostgreSQL Database**: Full SQLAlchemy ORM with Alembic migrations
- **Container Isolation**: Sandboxed execution with resource limits (1 CPU, 2GB RAM, no network)
- **Local Docker Registry**: Self-hosted registry for built model images

### Frontend (React + Vite)
- **Model Management**: Create, upload, and manage CV models
- **Build Monitoring**: Real-time build status and logs viewer
- **Inference Interface**: Interactive UI for uploading images and running predictions
- **Job Tracking**: Monitor inference jobs with status updates and result visualization
- **Responsive Design**: Built with Tailwind CSS for modern, clean UI

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│                      http://localhost:5174                       │
│           Vite Dev Server + Tailwind CSS + Axios                 │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (Port 8000)                   │
│  • REST API Endpoints   • JWT Auth   • File Uploads             │
└────┬──────────┬──────────┬─────────────┬────────────┬──────────┘
     │          │          │             │            │
     ▼          ▼          ▼             ▼            ▼
┌─────────┐ ┌──────┐ ┌─────────┐ ┌────────────┐ ┌──────────┐
│PostgreSQL│ │Redis │ │  MinIO  │ │Build Worker│ │Inference │
│(Port     │ │(Port │ │(Port    │ │  (Celery)  │ │ Worker   │
│ 5432)    │ │ 6379)│ │9000/9001)│ │            │ │ (Celery) │
└─────────┘ └──────┘ └─────────┘ └─────┬──────┘ └────┬─────┘
                                        │             │
                                        ▼             ▼
                                  ┌──────────────────────┐
                                  │  Docker Registry     │
                                  │  (Port 5001)         │
                                  └──────────────────────┘
```

### Data Flow

1. **Model Upload Flow**:
   ```
   User → Frontend → API → MinIO (package storage)
   API → Build Worker → Docker Build → Registry → Update DB
   ```

2. **Inference Flow**:
   ```
   User → Frontend → API → MinIO (input upload)
   API → Inference Worker → Pull Image → Run Container → MinIO (output)
   Frontend ← API ← Results from MinIO
   ```

## Project Structure

```
ClinAI/
├── docker-compose.yml              # Docker services orchestration
├── README.md
├── minio-init.sh                   # MinIO bucket initialization
│
├── backend/                        # FastAPI Backend
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini                 # Database migration config
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/               # Database migration scripts
│   ├── app/
│   │   ├── main.py                 # FastAPI app entry point
│   │   ├── config.py               # Environment configuration
│   │   ├── db.py                   # Database session management
│   │   ├── models.py               # SQLAlchemy ORM models
│   │   ├── schemas.py              # Pydantic request/response schemas
│   │   ├── auth.py                 # JWT authentication (disabled)
│   │   ├── storage.py              # MinIO storage client
│   │   ├── routes/
│   │   │   ├── users.py            # User registration/login endpoints
│   │   │   ├── models.py           # Model & version CRUD endpoints
│   │   │   └── jobs.py             # Inference job endpoints
│   │   └── tasks/
│   │       ├── celery_app.py       # Celery configuration
│   │       ├── build.py            # Docker image build task
│   │       └── inference.py        # Model inference task
│   └── runner/
│       └── runner.py               # Injected into containers to run predict.py
│
├── frontend/                       # React Frontend
│   ├── package.json
│   ├── vite.config.js              # Vite build configuration
│   ├── tailwind.config.js          # Tailwind CSS configuration
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── main.jsx                # React app entry point
│       ├── App.jsx                 # Root component with routing
│       ├── api/                    # API client functions
│       │   ├── client.js           # Axios instance
│       │   ├── models.js           # Model API calls
│       │   └── jobs.js             # Job API calls
│       ├── components/
│       │   ├── common/             # Reusable UI components
│       │   │   ├── Button.jsx
│       │   │   ├── Card.jsx
│       │   │   ├── StatusBadge.jsx
│       │   │   └── LoadingSpinner.jsx
│       │   ├── models/
│       │   │   └── UploadModelPackage.jsx
│       │   ├── jobs/
│       │   │   ├── ImageUpload.jsx
│       │   │   └── OutputViewer.jsx
│       │   ├── layout/
│       │   │   └── Layout.jsx      # Main layout with navigation
│       │   └── auth/
│       │       └── ProtectedRoute.jsx
│       ├── pages/
│       │   ├── LandingPage.jsx     # Homepage
│       │   ├── Dashboard.jsx       # User dashboard
│       │   ├── ModelsPage.jsx      # List of models
│       │   ├── ModelDetailPage.jsx # Model version details & upload
│       │   ├── InferencePage.jsx   # Run inference UI
│       │   ├── JobsPage.jsx        # List of inference jobs
│       │   └── JobDetailPage.jsx   # Job results viewer
│       ├── hooks/
│       │   └── usePolling.js       # Custom hook for polling API
│       ├── context/
│       │   └── AuthContext.jsx     # Authentication context (disabled)
│       └── utils/
│           └── constants.js        # Shared constants (status enums)
│
└── example-model/                  # Sample CV model for testing
    ├── predict.py                  # Example prediction function
    └── requirements.txt            # Model dependencies
```

## Quick Start

### Prerequisites

- **Docker and Docker Compose** (v2.0+)
- **Node.js** (v18+) and npm
- **curl** (optional, for API testing)

### 1. Start the Backend Services

```bash
cd ClinAI
docker compose up -d
```

This starts all backend services:
- **FastAPI Backend**: http://localhost:8000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **MinIO**: http://localhost:9000 (API), http://localhost:9001 (Console)
- **Docker Registry**: localhost:5001
- **Build Worker**: Celery worker for building images
- **Inference Worker**: Celery worker for running inference

Wait for all services to become healthy (~30 seconds):

```bash
docker compose ps
```

All services should show "healthy" status.

### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The React frontend will start on **http://localhost:5174**

### 3. Access the Application

Open your browser and navigate to **http://localhost:5174**

You'll see the ClinAI landing page with options to:
- **My Models**: Create and manage your CV models
- **Run Inference**: Run predictions on your models
- **Jobs**: View inference job history

### 4. Create Your First Model (Web UI)

#### Step 1: Create a Model Package

The platform requires a ZIP file containing:
- `predict.py`: Your model code with a `run()` function
- `requirements.txt`: Python dependencies

Create a test package using the example model:

```bash
cd example-model
zip -r ../grayscale-model.zip predict.py requirements.txt
cd ..
```

#### Step 2: Upload Model via Web UI

1. Click **"My Models"** in the navigation
2. Click **"Create New Model"**
3. Fill in:
   - **Model Name**: "Grayscale Converter"
   - **Description**: "Converts images to grayscale"
   - (Optional) Check **"Make public"**
4. Click **"Create Model"**
5. Click on your newly created model
6. Enter **Version Number**: "v1.0"
7. Choose your ZIP file (`grayscale-model.zip`)
8. Click **"Upload and Build"**

The platform will:
- Upload your package to MinIO
- Build a Docker image (watch the build logs in real-time!)
- Push the image to the local registry
- Mark the version as **READY** when complete

Building typically takes 1-3 minutes depending on dependencies.

#### Step 3: Run Inference

1. Click **"Run Inference"** in the navigation
2. Select your model version from the dropdown
3. Click **"Next: Upload Image"**
4. Upload a test image (any PNG/JPG)
5. Click **"Run Inference"**

You'll see:
- Job status updates (QUEUED → RUNNING → SUCCEEDED)
- Output images displayed when complete
- Option to download results

That's it! Your model is now deployed and running.

---

## Alternative: API Workflow with curl

If you prefer command-line interaction, here's the complete workflow using curl:

#### Step 1: Register a User

```bash
curl -X POST http://localhost:8000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "demo",
    "email": "demo@example.com",
    "password": "password123"
  }'
```

Expected response:
```json
{
  "id": "uuid-here",
  "username": "demo",
  "email": "demo@example.com",
  "created_at": "2024-01-01T00:00:00"
}
```

#### Step 2: Login to Get Token

```bash
curl -X POST "http://localhost:8000/api/users/login?username=demo&password=password123"
```

Expected response:
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

**Save the access token as an environment variable:**
```bash
export TOKEN="eyJ..."
```

#### Step 3: Create a Model

```bash
curl -X POST http://localhost:8000/api/models/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Grayscale Converter",
    "description": "Converts images to grayscale",
    "is_public": true
  }'
```

Expected response:
```json
{
  "id": "model-uuid",
  "name": "Grayscale Converter",
  "description": "Converts images to grayscale",
  "owner_id": "user-uuid",
  "is_public": true,
  "created_at": "2024-01-01T00:00:00"
}
```

**Save the model ID:**
```bash
export MODEL_ID="model-uuid"
```

#### Step 4: Create Model Version

```bash
curl -X POST http://localhost:8000/api/models/versions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"model_id\": \"$MODEL_ID\",
    \"version_number\": \"v1.0\"
  }"
```

Expected response:
```json
{
  "version_id": "version-uuid",
  "upload_url": "http://minio:9000/..."
}
```

**Save the version ID and upload URL:**
```bash
export VERSION_ID="version-uuid"
export UPLOAD_URL="http://..."
```

#### Step 5: Upload Model Package

```bash
curl -X PUT "$UPLOAD_URL" \
  --upload-file example-model/model.zip
```

#### Step 6: Trigger Build

```bash
curl -X POST "http://localhost:8000/api/models/versions/$VERSION_ID/build" \
  -H "Authorization: Bearer $TOKEN"
```

Expected response:
```json
{
  "version_id": "version-uuid",
  "status": "BUILDING",
  "message": "Build task enqueued"
}
```

#### Step 7: Check Build Status

```bash
curl -X GET "http://localhost:8000/api/models/versions/$VERSION_ID" \
  -H "Authorization: Bearer $TOKEN"
```

Wait until `status` changes from `BUILDING` to `READY`. You can check the `build_logs` field for details.

#### Step 8: Create Inference Job

```bash
curl -X POST http://localhost:8000/api/jobs/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"version_id\": \"$VERSION_ID\"
  }"
```

Expected response:
```json
{
  "job_id": "job-uuid",
  "upload_url": "http://minio:9000/..."
}
```

**Save the job ID and upload URL:**
```bash
export JOB_ID="job-uuid"
export JOB_UPLOAD_URL="http://..."
```

#### Step 9: Upload Input Image

Create a test image or use an existing one:

```bash
# Create a simple test image with Python
python3 -c "
from PIL import Image
import numpy as np
img = Image.fromarray(np.random.randint(0, 255, (200, 200, 3), dtype=np.uint8))
img.save('test_input.png')
"

# Upload it
curl -X PUT "$JOB_UPLOAD_URL" \
  --upload-file test_input.png
```

#### Step 10: Run Inference

```bash
curl -X POST "http://localhost:8000/api/jobs/$JOB_ID/run" \
  -H "Authorization: Bearer $TOKEN"
```

Expected response:
```json
{
  "id": "job-uuid",
  "version_id": "version-uuid",
  "user_id": "user-uuid",
  "status": "QUEUED",
  ...
}
```

#### Step 11: Check Job Status

```bash
curl -X GET "http://localhost:8000/api/jobs/$JOB_ID" \
  -H "Authorization: Bearer $TOKEN"
```

Wait until `status` changes to `SUCCEEDED`.

#### Step 12: Get Output URLs

```bash
curl -X GET "http://localhost:8000/api/jobs/$JOB_ID/outputs" \
  -H "Authorization: Bearer $TOKEN"
```

Expected response:
```json
{
  "job_id": "job-uuid",
  "status": "SUCCEEDED",
  "output_urls": [
    "http://minio:9000/cv-platform/job_outputs/job-uuid/output.png?..."
  ]
}
```

#### Step 13: Download Output

```bash
# Get the URL from the response
export OUTPUT_URL="http://..."

curl -o output_image.png "$OUTPUT_URL"
```

## Model Package Format

Your model package must be a ZIP file containing:

### Required Files

1. **predict.py** - Must define a `run` function:

```python
def run(input_path: str, output_dir: str) -> dict:
    """
    Args:
        input_path: Path to input image file
        output_dir: Directory to write output files

    Returns:
        dict: JSON-serializable metadata
    """
    # Your model code here
    # Read from input_path
    # Write outputs to output_dir
    # Return metadata
    pass
```

2. **requirements.txt** - Python dependencies:

```
Pillow==10.2.0
numpy==1.26.3
# Add your dependencies here
```

### Example Model

See `example-model/` directory for a complete working example.

## API Endpoints

### User Management

- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login and get JWT token

### Models

- `POST /api/models/` - Create a model
- `GET /api/models/` - List models (owned + public)
- `GET /api/models/{model_id}` - Get model details

### Model Versions

- `POST /api/models/versions` - Create version and get upload URL
- `GET /api/models/versions/{version_id}` - Get version details and build status
- `POST /api/models/versions/{version_id}/build` - Trigger Docker image build

### Inference Jobs

- `POST /api/jobs/` - Create job and get input upload URL
- `POST /api/jobs/{job_id}/run` - Start inference
- `GET /api/jobs/{job_id}` - Get job status
- `GET /api/jobs/{job_id}/outputs` - Get output download URLs
- `GET /api/jobs/` - List all user's jobs

## Database Schema

### Users
- id (UUID)
- username (unique)
- email (unique)
- hashed_password
- created_at

### Models
- id (UUID)
- name
- description
- owner_id (FK → users)
- is_public (boolean)
- created_at

### ModelVersions
- id (UUID)
- model_id (FK → models)
- version_number
- status (UPLOADING | BUILDING | READY | FAILED)
- package_path (MinIO path)
- docker_image
- docker_image_digest
- build_logs
- error_message
- created_at, updated_at

### Jobs
- id (UUID)
- version_id (FK → model_versions)
- user_id (FK → users)
- status (UPLOADING | QUEUED | RUNNING | SUCCEEDED | FAILED)
- input_path (MinIO path)
- output_paths (JSON array)
- error_message
- created_at, updated_at

## Container Execution Details

### Build Process

1. Download package from MinIO
2. Extract to temp directory
3. Generate Dockerfile with:
   - Base: `python:3.11-slim`
   - User code in `/app/user_code/`
   - Platform runner in `/app/runner/`
   - Install dependencies from requirements.txt
4. Build Docker image
5. Push to local registry as `localhost:5000/model-{version_id}:latest`
6. Run smoke test with dummy image
7. Update version status

### Inference Process

1. Download input image from MinIO
2. Pull Docker image from registry
3. Run container with:
   - Resource limits: 1 CPU, 2GB RAM
   - Network isolation: `--network=none`
   - Read-only input volume: `/workspace/in`
   - Read-write output volume: `/workspace/out`
   - 60-second timeout
4. Upload outputs to MinIO
5. Update job status

## Development

### Running Backend Locally

```bash
# Start all backend services
docker compose up -d

# View logs for specific services
docker compose logs -f api
docker compose logs -f build-worker
docker compose logs -f inference-worker

# Restart a specific service
docker compose restart api

# Stop all services
docker compose down

# Clean up (remove volumes and data)
docker compose down -v
```

### Running Frontend Locally

```bash
cd frontend

# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Database Migrations

```bash
# Create a new migration
docker compose exec api alembic revision --autogenerate -m "description"

# Apply migrations
docker compose exec api alembic upgrade head

# Rollback one migration
docker compose exec api alembic downgrade -1

# View migration history
docker compose exec api alembic history
```

### Database Maintenance

Useful scripts for database cleanup:

```bash
# Inspect all models and versions
docker compose exec api python /app/inspect_database.py

# Clean up orphaned model versions
docker compose exec api python /app/cleanup_orphaned_versions.py

# Delete test models
docker compose exec api python /app/delete_test_models.py
```

### Accessing Services

- **Frontend**: http://localhost:5174
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs (Swagger UI)
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)
- **PostgreSQL**: localhost:5432 (postgres/postgres/cvplatform)
- **Redis**: localhost:6379
- **Docker Registry**: http://localhost:5001/v2/_catalog

### Frontend Development Tips

- **Hot Module Replacement**: Vite provides instant updates on file changes
- **API Proxy**: Configured in `vite.config.js` to proxy `/api` to backend
- **Component Structure**: Follow atomic design (common → feature-specific → pages)
- **State Management**: Using React Context for auth, custom hooks for polling
- **Styling**: Tailwind CSS with custom configuration

## Troubleshooting

### Frontend Issues

#### Port 5173/5174 Already in Use
```bash
# Kill the process using the port
lsof -ti:5174 | xargs kill -9

# Or change the port in vite.config.js
```

#### npm install Fails with Rollup Error
```bash
# Remove node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

#### React Hooks Error After Upload
This was fixed in the latest version. If you still see it:
- Refresh the browser
- Check that you're on the latest code
- Clear browser cache

#### API Calls Failing (CORS/Network Errors)
- Ensure backend is running: `docker compose ps api`
- Check API is accessible: `curl http://localhost:8000/docs`
- Verify proxy settings in `vite.config.js`

### Backend Issues

#### Build Worker Fails

Check logs:
```bash
docker compose logs build-worker
```

Common issues:
- **Docker socket not mounted**: Ensure `/var/run/docker.sock` is mounted
- **Registry not accessible**: Check `docker compose logs registry`
- **Invalid package format**: ZIP must contain `predict.py` and `requirements.txt`
- **Build timeout**: Large dependencies may exceed timeout

#### Inference Worker Fails

Check logs:
```bash
docker compose logs inference-worker
```

Common issues:
- **Model not generating output files**: Check your `predict.py` writes to `output_dir`
- **Timeout exceeded**: Default 60s, increase if needed in `app/tasks/inference.py`
- **Memory limit exceeded**: Default 2GB, check Docker container limits
- **Image not found**: Ensure build completed successfully (status = READY)

#### Database Connection Issues

Ensure PostgreSQL is healthy:
```bash
docker compose ps postgres
```

Reset database:
```bash
docker compose down -v
docker compose up -d postgres
docker compose exec api alembic upgrade head
```

#### MinIO Connection Issues

Check MinIO health:
```bash
docker compose logs minio
docker compose logs minio-init
```

Test MinIO directly:
```bash
curl http://localhost:9000/minio/health/live
```

Access MinIO console at http://localhost:9001 (minioadmin/minioadmin)

#### Services Won't Start

Check for port conflicts:
```bash
lsof -i :8000  # API
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :9000  # MinIO
```

View all service statuses:
```bash
docker compose ps
```

## Technology Stack

### Backend
- **FastAPI** - Modern Python web framework with auto-generated API docs
- **SQLAlchemy** - Python ORM for database interactions
- **Alembic** - Database migration management
- **Celery** - Distributed task queue for async job processing
- **Redis** - Message broker for Celery and caching
- **PostgreSQL** - Relational database for structured data
- **MinIO** - S3-compatible object storage
- **Pydantic** - Data validation and settings management
- **Python-JOSE** - JWT token handling (currently disabled)
- **Docker SDK** - Programmatic Docker image building and container execution

### Frontend
- **React 18** - UI library with hooks
- **Vite** - Next-generation frontend build tool
- **React Router v6** - Client-side routing
- **Axios** - HTTP client for API calls
- **Tailwind CSS** - Utility-first CSS framework
- **ESLint** - Code linting and quality

### Infrastructure
- **Docker** - Container runtime for model isolation
- **Docker Compose** - Multi-container orchestration
- **Docker Registry** - Private image registry for built models
- **nginx** (planned) - Reverse proxy for production

## Security Considerations

⚠️ **This is an MVP for local development only. DO NOT deploy to production without addressing these security concerns:**

### Critical Security Issues
- **No Authentication**: JWT auth is implemented but currently disabled - all endpoints are public
- **Docker Socket Access**: Workers have access to Docker socket - can be exploited
- **No Input Validation**: Uploaded code is executed without sandboxing or scanning
- **Secrets in Code**: Database passwords and MinIO credentials are hardcoded
- **No Rate Limiting**: API can be abused with unlimited requests
- **HTTP Only**: All communication is unencrypted

### Production Checklist
- [ ] Enable and enforce JWT authentication on all endpoints
- [ ] Change all default passwords (`SECRET_KEY`, PostgreSQL, MinIO, etc.)
- [ ] Use proper secrets management (HashiCorp Vault, AWS Secrets Manager)
- [ ] Implement API rate limiting (per user, per endpoint)
- [ ] Add comprehensive input validation and sanitization
- [ ] Use HTTPS/TLS for all communication
- [ ] Restrict Docker socket access (use Docker API with TLS)
- [ ] Implement proper container sandboxing (gVisor, Kata Containers)
- [ ] Add virus/malware scanning for uploaded files
- [ ] Implement resource quotas per user (CPU, memory, storage)
- [ ] Add request logging and audit trails
- [ ] Set up monitoring and alerting (Prometheus, Grafana)
- [ ] Implement network policies and firewalls
- [ ] Use read-only filesystems where possible
- [ ] Add content security policies (CSP headers)
- [ ] Implement CORS properly (currently allows all origins)
- [ ] Add CSRF protection
- [ ] Scan dependencies for vulnerabilities
- [ ] Use environment-specific configs (dev/staging/prod)

## Future Enhancements

### Planned Features
- [ ] **GPU Support**: Add GPU-enabled inference workers
- [ ] **Model Versioning**: Better version management and rollback
- [ ] **Batch Inference**: Process multiple images in one job
- [ ] **Model Monitoring**: Track inference metrics, latency, errors
- [ ] **API Keys**: Per-user API keys for programmatic access
- [ ] **Webhooks**: Notify external systems when jobs complete
- [ ] **Model Marketplace**: Public model sharing and discovery
- [ ] **A/B Testing**: Deploy multiple versions and compare results
- [ ] **Auto-scaling**: Scale workers based on queue length
- [ ] **Cost Tracking**: Track resource usage per user/model

### Technical Improvements
- [ ] **Frontend Build**: Containerize frontend and serve via nginx
- [ ] **Unit Tests**: Add comprehensive test coverage
- [ ] **Integration Tests**: End-to-end testing with pytest
- [ ] **CI/CD Pipeline**: GitHub Actions for automated testing and deployment
- [ ] **Documentation**: OpenAPI/Swagger improvements, API client SDKs
- [ ] **Logging**: Structured logging with ELK stack
- [ ] **Caching**: Redis caching for frequently accessed data
- [ ] **Database Indexing**: Optimize queries with proper indexes
- [ ] **WebSockets**: Real-time job updates without polling

## Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Follow coding standards**:
   - Backend: Follow PEP 8 (Python)
   - Frontend: Use ESLint configuration provided
5. **Test your changes** thoroughly
6. **Commit with clear messages**: `git commit -m 'Add amazing feature'`
7. **Push to your fork**: `git push origin feature/amazing-feature`
8. **Submit a pull request** with a detailed description

### Development Guidelines
- Keep components small and focused
- Write meaningful commit messages
- Add comments for complex logic
- Update documentation when adding features
- Maintain backwards compatibility when possible

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

Built with modern tools and frameworks:
- FastAPI team for the excellent web framework
- React team for the UI library
- Docker for containerization technology
- MinIO for S3-compatible storage
- All open-source contributors

## Support

For questions, issues, or feedback:
- **GitHub Issues**: Report bugs and request features
- **Discussions**: Ask questions and share ideas
- **Documentation**: Check `/docs` endpoint when API is running

---

**Made with ❤️ for the ML/AI community**
