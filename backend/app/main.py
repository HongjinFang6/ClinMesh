from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
from app.routes import users, models, jobs

app = FastAPI(title="CV Model Deployment Platform", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(users.router)
app.include_router(models.router)
app.include_router(jobs.router)


@app.get("/health")
def health():
    return {"status": "healthy"}


# Mount static files (React build)
frontend_dist = Path(__file__).parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    # Mount static assets
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

    # Serve index.html for all non-API routes (SPA routing)
    @app.get("/{full_path:path}")
    def serve_react_app(full_path: str):
        # If path starts with 'api', let it 404 naturally
        if full_path.startswith("api/"):
            return {"error": "API endpoint not found"}

        # Serve index.html for all other paths
        index_file = frontend_dist / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return {"error": "Frontend not built"}
else:
    @app.get("/")
    def root():
        return {"message": "CV Model Deployment Platform API - Frontend not built. Run: cd frontend && npm run build"}
