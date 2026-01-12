"""
Security middleware for rate limiting, input validation, and security headers
"""
import time
import hashlib
from typing import Dict, Optional
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.config import settings
import redis
import logging

logger = logging.getLogger(__name__)


# Redis client for rate limiting
try:
    redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
except Exception as e:
    logger.warning(f"Failed to connect to Redis for rate limiting: {e}")
    redis_client = None


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Token bucket rate limiting middleware using Redis
    """

    def __init__(self, app):
        super().__init__(app)
        self.enabled = settings.RATE_LIMIT_ENABLED and redis_client is not None

    def parse_rate_limit(self, limit_str: str) -> tuple[int, int]:
        """
        Parse rate limit string like '100 per hour' to (requests, seconds)
        """
        parts = limit_str.lower().split()
        if len(parts) != 3 or parts[1] != "per":
            return (100, 3600)  # Default: 100 per hour

        requests = int(parts[0])
        period = parts[2]

        period_map = {
            "second": 1,
            "minute": 60,
            "hour": 3600,
            "day": 86400,
        }

        seconds = period_map.get(period, 3600)
        return (requests, seconds)

    def get_rate_limit_for_path(self, path: str) -> tuple[int, int]:
        """
        Get rate limit based on the request path
        """
        if "/build" in path:
            return self.parse_rate_limit(settings.RATE_LIMIT_BUILD)
        elif "/jobs/" in path and "/run" not in path:
            # Job status checking (GET /api/jobs/{job_id}) - high limit for polling
            return self.parse_rate_limit(settings.RATE_LIMIT_JOB_STATUS)
        elif "/run" in path and "/jobs/" in path:
            return self.parse_rate_limit(settings.RATE_LIMIT_INFERENCE)
        elif "/upload" in path or "versions" in path:
            return self.parse_rate_limit(settings.RATE_LIMIT_UPLOAD)
        else:
            return self.parse_rate_limit(settings.RATE_LIMIT_DEFAULT)

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting if disabled or Redis unavailable
        if not self.enabled:
            return await call_next(request)

        # Skip rate limiting for CORS preflight
        if request.method == "OPTIONS":
            return await call_next(request)

        # Skip rate limiting for health checks
        if request.url.path in ["/health", "/docs", "/redoc", "/openapi.json"]:
            return await call_next(request)

        # Get client identifier (IP address or user ID if authenticated)
        client_ip = request.client.host
        auth_header = request.headers.get("Authorization")

        if auth_header and auth_header.startswith("Bearer "):
            # Use hash of token as identifier for authenticated users
            token = auth_header.split(" ")[1]
            client_id = hashlib.sha256(token.encode()).hexdigest()[:16]
        else:
            client_id = client_ip

        # Get rate limit for this path
        max_requests, window_seconds = self.get_rate_limit_for_path(request.url.path)

        # Redis key for this client and endpoint
        redis_key = f"rate_limit:{client_id}:{request.url.path}"

        try:
            # Get current request count
            current = redis_client.get(redis_key)

            if current is None:
                # First request in this window
                redis_client.setex(redis_key, window_seconds, 1)
                remaining = max_requests - 1
            else:
                current_count = int(current)

                if current_count >= max_requests:
                    # Rate limit exceeded
                    ttl = redis_client.ttl(redis_key)
                    return JSONResponse(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        content={
                            "detail": f"Rate limit exceeded. Try again in {ttl} seconds.",
                            "retry_after": ttl
                        },
                        headers={"Retry-After": str(ttl)}
                    )

                # Increment counter
                redis_client.incr(redis_key)
                remaining = max_requests - current_count - 1

            # Add rate limit headers
            response = await call_next(request)
            response.headers["X-RateLimit-Limit"] = str(max_requests)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            response.headers["X-RateLimit-Reset"] = str(int(time.time()) + window_seconds)

            return response

        except Exception as e:
            logger.error(f"Rate limiting error: {e}")
            # On error, allow the request to proceed
            return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add security headers to all responses
    """

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # HSTS (only in production with HTTPS)
        if settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response


def validate_file_upload(
    filename: str,
    file_size: int,
    max_size_mb: Optional[int] = None
) -> None:
    """
    Validate uploaded file

    Args:
        filename: Name of the uploaded file
        file_size: Size of the file in bytes
        max_size_mb: Maximum allowed size in MB (defaults to settings)

    Raises:
        HTTPException: If validation fails
    """
    if max_size_mb is None:
        max_size_mb = settings.MAX_UPLOAD_SIZE_MB

    # Check file size
    max_size_bytes = max_size_mb * 1024 * 1024
    if file_size > max_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {max_size_mb}MB"
        )

    # Check file extension
    file_ext = filename.lower().split(".")[-1] if "." in filename else ""
    allowed_extensions = [ext.lstrip(".") for ext in settings.ALLOWED_UPLOAD_EXTENSIONS]

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(settings.ALLOWED_UPLOAD_EXTENSIONS)}"
        )

    # Check for suspicious filenames
    suspicious_patterns = ["../", "..\\", "/etc/", "\\windows\\", ".env", ".git"]
    filename_lower = filename.lower()

    for pattern in suspicious_patterns:
        if pattern in filename_lower:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid filename"
            )


def validate_zip_contents(zip_path: str) -> None:
    """
    Validate contents of a ZIP file before extraction

    Args:
        zip_path: Path to the ZIP file

    Raises:
        HTTPException: If validation fails
    """
    import zipfile
    import os

    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_file:
            # Check for required files
            file_list = zip_file.namelist()

            if "predict.py" not in file_list:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ZIP file must contain predict.py"
                )

            if "requirements.txt" not in file_list:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ZIP file must contain requirements.txt"
                )

            # Check for path traversal attempts
            for filename in file_list:
                if filename.startswith("/") or ".." in filename:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid file path in ZIP: {filename}"
                    )

            # Check total extraction size
            total_size = sum(info.file_size for info in zip_file.infolist())
            max_size = settings.MAX_ZIP_EXTRACTION_SIZE_MB * 1024 * 1024

            if total_size > max_size:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Extracted size too large. Maximum is {settings.MAX_ZIP_EXTRACTION_SIZE_MB}MB"
                )

            # Check for suspicious files
            suspicious_extensions = [".exe", ".dll", ".so", ".dylib", ".sh", ".bat", ".cmd"]
            for filename in file_list:
                ext = os.path.splitext(filename)[1].lower()
                if ext in suspicious_extensions:
                    logger.warning(f"Suspicious file in ZIP: {filename}")
                    # Note: We log but don't block, as .so/.dylib might be legitimate Python extensions

    except zipfile.BadZipFile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or corrupted ZIP file"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating ZIP file: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error validating ZIP file: {str(e)}"
        )


def validate_requirements_txt(requirements_content: str) -> None:
    """
    Validate requirements.txt content for known malicious packages

    Args:
        requirements_content: Content of requirements.txt file

    Raises:
        HTTPException: If validation fails
    """
    # List of known malicious or suspicious package patterns
    # This is a basic example - in production, integrate with a package security service
    suspicious_patterns = [
        "subprocess",  # Package name (not the module)
        "os-",  # Typosquatting attempts
        "request ",  # Typosquatting (note the space)
    ]

    lines = requirements_content.lower().split("\n")

    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue

        for pattern in suspicious_patterns:
            if pattern in line:
                logger.warning(f"Suspicious package in requirements.txt: {line}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Suspicious package detected: {line}. Please review your dependencies."
                )
