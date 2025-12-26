#!/bin/sh

# Wait for MinIO to be ready
echo "Waiting for MinIO to be ready..."
until curl -f http://minio:9000/minio/health/live > /dev/null 2>&1; do
  sleep 1
done

echo "MinIO is ready. Configuring..."

# Configure mc client
mc alias set myminio http://minio:9000 minioadmin minioadmin

# Create bucket if it doesn't exist
mc mb myminio/cv-platform --ignore-existing

# Set anonymous download policy (public read)
mc anonymous set download myminio/cv-platform

# Set CORS so browser-based uploads to presigned URLs work
mc cors set myminio/cv-platform /minio-cors.json

echo "MinIO configuration complete!"
