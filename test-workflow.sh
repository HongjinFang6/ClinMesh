#!/bin/bash
# Complete workflow test script
# This script demonstrates the full platform workflow

set -e

API_URL="http://localhost:8000"

echo "========================================="
echo "CV Model Deployment Platform - Test Workflow"
echo "========================================="
echo ""

# Check if API is running
echo "1. Checking if API is running..."
if ! curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" | grep -q "200"; then
    echo "ERROR: API is not running. Please start with: docker compose up"
    exit 1
fi
echo "✓ API is running"
echo ""

# Create model
echo "2. Creating model..."
MODEL_RESPONSE=$(curl -s -X POST "$API_URL/api/models/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Grayscale Converter Test",
    "description": "Automated test model",
    "is_public": true
  }')

MODEL_ID=$(echo "$MODEL_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
if [ -z "$MODEL_ID" ]; then
    echo "ERROR: Failed to create model"
    echo "$MODEL_RESPONSE"
    exit 1
fi
echo "✓ Model created: $MODEL_ID"
echo ""

# Create model version
echo "3. Creating model version..."
VERSION_RESPONSE=$(curl -s -X POST "$API_URL/api/models/versions" \
  -H "Content-Type: application/json" \
  -d "{
    \"model_id\": \"$MODEL_ID\",
    \"version_number\": \"v1.0-test\"
  }")

VERSION_ID=$(echo "$VERSION_RESPONSE" | grep -o '"version_id":"[^"]*' | cut -d'"' -f4)
UPLOAD_URL=$(echo "$VERSION_RESPONSE" | grep -o '"upload_url":"[^"]*' | cut -d'"' -f4)

if [ -z "$VERSION_ID" ]; then
    echo "ERROR: Failed to create version"
    echo "$VERSION_RESPONSE"
    exit 1
fi
echo "✓ Version created: $VERSION_ID"
echo ""

# Create model package
echo "4. Creating model package..."
cd example-model
zip -q -r model.zip predict.py requirements.txt
cd ..
echo "✓ Package created"
echo ""

# Upload package
echo "5. Uploading model package..."
if curl -s --resolve "minio:9000:127.0.0.1" -X PUT "$UPLOAD_URL" --upload-file example-model/model.zip -o /dev/null; then
    echo "✓ Package uploaded"
else
    echo "ERROR: Failed to upload package"
    exit 1
fi
echo ""

# Trigger build
echo "6. Triggering build..."
BUILD_RESPONSE=$(curl -s -X POST "$API_URL/api/models/versions/$VERSION_ID/build")
echo "✓ Build triggered"
echo ""

# Wait for build to complete
echo "7. Waiting for build to complete..."
BUILD_STATUS="BUILDING"
RETRIES=0
MAX_RETRIES=30

while [ "$BUILD_STATUS" = "BUILDING" ] && [ $RETRIES -lt $MAX_RETRIES ]; do
    sleep 5
    STATUS_RESPONSE=$(curl -s -X GET "$API_URL/api/models/versions/$VERSION_ID")
    BUILD_STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
    echo "  Status: $BUILD_STATUS (attempt $((RETRIES+1))/$MAX_RETRIES)"
    RETRIES=$((RETRIES+1))
done

if [ "$BUILD_STATUS" = "READY" ]; then
    echo "✓ Build completed successfully"
elif [ "$BUILD_STATUS" = "FAILED" ]; then
    echo "ERROR: Build failed"
    echo "$STATUS_RESPONSE"
    exit 1
else
    echo "ERROR: Build timeout"
    exit 1
fi
echo ""

# Create test input image
echo "8. Creating test input image..."
python3 -c "
from PIL import Image
import numpy as np
img = Image.fromarray(np.random.randint(0, 255, (200, 200, 3), dtype=np.uint8))
img.save('test_input.png')
" 2>/dev/null || {
    echo "ERROR: Failed to create test image. Make sure PIL and numpy are installed."
    exit 1
}
echo "✓ Test image created"
echo ""

# Create job
echo "9. Creating inference job..."
JOB_RESPONSE=$(curl -s -X POST "$API_URL/api/jobs/" \
  -H "Content-Type: application/json" \
  -d "{
    \"version_id\": \"$VERSION_ID\"
  }")

JOB_ID=$(echo "$JOB_RESPONSE" | grep -o '"job_id":"[^"]*' | cut -d'"' -f4)
JOB_UPLOAD_URL=$(echo "$JOB_RESPONSE" | grep -o '"upload_url":"[^"]*' | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
    echo "ERROR: Failed to create job"
    echo "$JOB_RESPONSE"
    exit 1
fi
echo "✓ Job created: $JOB_ID"
echo ""

# Upload input image
echo "10. Uploading input image..."
if curl -s --resolve "minio:9000:127.0.0.1" -X PUT "$JOB_UPLOAD_URL" --upload-file test_input.png -o /dev/null; then
    echo "✓ Input image uploaded"
else
    echo "ERROR: Failed to upload input image"
    exit 1
fi
echo ""

# Run inference
echo "11. Running inference..."
RUN_RESPONSE=$(curl -s -X POST "$API_URL/api/jobs/$JOB_ID/run")
echo "✓ Inference job started"
echo ""

# Wait for inference to complete
echo "12. Waiting for inference to complete..."
JOB_STATUS="QUEUED"
RETRIES=0
MAX_RETRIES=20

while [[ "$JOB_STATUS" = "QUEUED" || "$JOB_STATUS" = "RUNNING" ]] && [ $RETRIES -lt $MAX_RETRIES ]; do
    sleep 3
    JOB_STATUS_RESPONSE=$(curl -s -X GET "$API_URL/api/jobs/$JOB_ID")
    JOB_STATUS=$(echo "$JOB_STATUS_RESPONSE" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
    echo "  Status: $JOB_STATUS (attempt $((RETRIES+1))/$MAX_RETRIES)"
    RETRIES=$((RETRIES+1))
done

if [ "$JOB_STATUS" = "SUCCEEDED" ]; then
    echo "✓ Inference completed successfully"
elif [ "$JOB_STATUS" = "FAILED" ]; then
    echo "ERROR: Inference failed"
    echo "$JOB_STATUS_RESPONSE"
    exit 1
else
    echo "ERROR: Inference timeout"
    exit 1
fi
echo ""

# Get output URLs
echo "13. Getting output URLs..."
OUTPUT_RESPONSE=$(curl -s -X GET "$API_URL/api/jobs/$JOB_ID/outputs")

OUTPUT_URL=$(echo "$OUTPUT_RESPONSE" | grep -o '"output_urls":\["[^"]*' | cut -d'"' -f4)

if [ -z "$OUTPUT_URL" ]; then
    echo "ERROR: Failed to get output URL"
    echo "$OUTPUT_RESPONSE"
    exit 1
fi
echo "✓ Output URL retrieved"
echo ""

# Download output
echo "14. Downloading output image..."
if curl -s --resolve "minio:9000:127.0.0.1" -o output_image.png "$OUTPUT_URL"; then
    echo "✓ Output image downloaded: output_image.png"
else
    echo "ERROR: Failed to download output"
    exit 1
fi
echo ""

echo "========================================="
echo "✓ WORKFLOW TEST COMPLETED SUCCESSFULLY!"
echo "========================================="
echo ""
echo "Summary:"
echo "  Model ID: $MODEL_ID"
echo "  Version ID: $VERSION_ID"
echo "  Job ID: $JOB_ID"
echo "  Output: output_image.png"
echo ""
echo "You can view the grayscale output image at: output_image.png"
