#!/bin/bash
# Script to create example model package

set -e

echo "Creating example model package..."

cd example-model
zip -r model.zip predict.py requirements.txt

echo "✓ Created model.zip"
echo ""
echo "You can now upload this package to the platform:"
echo "  curl -X PUT \"\$UPLOAD_URL\" --upload-file model.zip"

cd ..
