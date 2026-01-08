#!/bin/bash

# ================================
# ClinAI Secrets Generator
# ================================
# This script generates secure random passwords for your .env file

set -e

echo "🔐 ClinAI Secrets Generator"
echo "================================"
echo ""

# Check if .env already exists
if [ -f .env ]; then
    read -p "⚠️  .env file already exists. Overwrite? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "Aborted. Your existing .env file was not modified."
        exit 0
    fi
    echo "Backing up existing .env to .env.backup..."
    cp .env .env.backup
fi

echo "Generating secure random passwords..."
echo ""

# Generate secure passwords
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
MINIO_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
SECRET_KEY=$(openssl rand -base64 64 | tr -d "\n")

# Prompt for domain
read -p "Enter your domain name (e.g., clinai.example.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
    DOMAIN="localhost"
    echo "Using default: localhost (for development only)"
fi

# Create .env file
cat > .env << EOF
# ================================
# ClinAI Production Configuration
# ================================
# Generated on: $(date)
# DO NOT commit this file to git!

# ================================
# Database Configuration
# ================================
POSTGRES_USER=clinai_user
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=clinai_production
DATABASE_URL=postgresql://clinai_user:${POSTGRES_PASSWORD}@postgres:5432/clinai_production

# ================================
# Redis Configuration
# ================================
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0

# ================================
# MinIO Object Storage
# ================================
MINIO_ROOT_USER=clinai_admin
MINIO_ROOT_PASSWORD=${MINIO_PASSWORD}
MINIO_ACCESS_KEY=clinai_admin
MINIO_SECRET_KEY=${MINIO_PASSWORD}
MINIO_ENDPOINT=minio:9000
MINIO_EXTERNAL_ENDPOINT=${DOMAIN}
MINIO_BUCKET_NAME=clinai-storage

# ================================
# Application Security
# ================================
SECRET_KEY=${SECRET_KEY}
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
ENABLE_AUTH=true

# ================================
# Celery Configuration
# ================================
CELERY_BROKER_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
CELERY_RESULT_BACKEND=redis://:${REDIS_PASSWORD}@redis:6379/0

# ================================
# Docker Registry
# ================================
REGISTRY_URL=localhost:5001

# ================================
# Application Configuration
# ================================
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO
ALLOWED_ORIGINS=https://${DOMAIN},https://www.${DOMAIN}
DOMAIN=${DOMAIN}

# ================================
# Rate Limiting
# ================================
RATE_LIMIT_ENABLED=true
RATE_LIMIT_DEFAULT=100 per hour
RATE_LIMIT_BUILD=10 per hour
RATE_LIMIT_INFERENCE=50 per hour
RATE_LIMIT_UPLOAD=20 per hour

# ================================
# Resource Limits
# ================================
MAX_UPLOAD_SIZE_MB=500
MAX_BUILD_TIME_SECONDS=1800
MAX_BUILD_MEMORY_GB=4
MAX_INFERENCE_TIME_SECONDS=300
MAX_INFERENCE_MEMORY_GB=4
MAX_INFERENCE_CPU_CORES=2
MAX_STORAGE_PER_USER_GB=10
EOF

# Set restrictive permissions
chmod 600 .env

echo "✅ .env file created successfully!"
echo ""
echo "📋 Generated Credentials:"
echo "================================"
echo "PostgreSQL Password: ${POSTGRES_PASSWORD}"
echo "Redis Password:      ${REDIS_PASSWORD}"
echo "MinIO Password:      ${MINIO_PASSWORD}"
echo ""
echo "⚠️  IMPORTANT: Save these credentials securely!"
echo "   The .env file has been created with restricted permissions (600)."
echo "   Make sure .env is in your .gitignore file."
echo ""
echo "🚀 Next steps:"
echo "   1. Review the .env file and adjust settings as needed"
echo "   2. Run: docker-compose -f docker-compose.prod.yml up -d"
echo "   3. Set up SSL certificates (see DEPLOYMENT.md)"
echo ""
