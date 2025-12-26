from celery import Celery
from app.config import settings

celery_app = Celery(
    "cv_platform",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.build", "app.tasks.inference"]
)

# Configure task routes
celery_app.conf.task_routes = {
    "app.tasks.build.*": {"queue": "build"},
    "app.tasks.inference.*": {"queue": "inference"},
}

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)
