import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createModelVersion, uploadToPresignedUrl, triggerBuild } from '../../api/models';
import { Button } from '../common/Button';

export const UploadModelPackage = ({ modelId }) => {
  const [file, setFile] = useState(null);
  const [versionNumber, setVersionNumber] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [showRequirements, setShowRequirements] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.name.endsWith('.zip')) {
      setFile(selectedFile);
      setError('');
    } else {
      setError('Please select a .zip file');
    }
  };

  const handleUpload = async () => {
    if (!file || !versionNumber) {
      setError('Please provide version number and select a file');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      // Step 1: Create version and get upload URL
      console.log('Step 1: Creating model version...');
      const { version_id, upload_url } = await createModelVersion({
        model_id: modelId,
        version_number: versionNumber
      });
      console.log('Version created:', version_id);
      console.log('Upload URL:', upload_url);

      // Step 2: Upload file to presigned URL
      console.log('Step 2: Uploading file to MinIO...');
      await uploadToPresignedUrl(upload_url, file);
      console.log('Upload successful');

      // Step 3: Trigger build
      console.log('Step 3: Triggering build...');
      await triggerBuild(version_id);
      console.log('Build triggered');

      // Navigate to version detail page
      navigate(`/models/${modelId}/versions/${version_id}`);
    } catch (err) {
      console.error('Upload error:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Upload failed';
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Package Requirements Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <button
          onClick={() => setShowRequirements(!showRequirements)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="font-medium text-blue-900">Package Requirements</span>
          </div>
          <svg
            className={`w-5 h-5 text-blue-600 transition-transform ${showRequirements ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showRequirements && (
          <div className="mt-4 space-y-4 text-sm text-gray-700">
            {/* Critical Requirements */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Your ZIP file MUST contain:</h4>
              <ul className="space-y-1 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span><strong>predict.py</strong> - Your model code with a <code className="bg-gray-100 px-1 rounded">run()</code> function</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span><strong>requirements.txt</strong> - Python dependencies (pinned versions)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">✗</span>
                  <span><strong>NO Dockerfile</strong> - Generated automatically</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">✗</span>
                  <span><strong>NO nested folders</strong> - Files must be at ZIP root</span>
                </li>
              </ul>
            </div>

            {/* predict.py example */}
            <div className="bg-white border border-gray-200 rounded p-3">
              <h4 className="font-semibold text-gray-900 mb-2">predict.py must include:</h4>
              <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
{`def run(input_path: str, output_dir: str) -> dict:
    """
    Args:
        input_path: Path to input image
        output_dir: Directory for outputs
    Returns:
        dict: JSON metadata
    """
    # Your model code here
    pass`}
              </pre>
            </div>

            {/* Quick checklist */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Quick Checklist:</h4>
              <ul className="space-y-1 ml-4 text-sm">
                <li>• Function named exactly <code className="bg-gray-100 px-1 rounded">run</code></li>
                <li>• Accepts <code className="bg-gray-100 px-1 rounded">input_path</code> and <code className="bg-gray-100 px-1 rounded">output_dir</code> parameters</li>
                <li>• Writes output files to <code className="bg-gray-100 px-1 rounded">output_dir</code></li>
                <li>• Returns a Python dict (JSON-serializable)</li>
                <li>• All dependencies in <code className="bg-gray-100 px-1 rounded">requirements.txt</code> with versions</li>
                <li>• Runs in &lt;60 seconds (will timeout otherwise)</li>
                <li>• No internet access (containers are isolated)</li>
              </ul>
            </div>

            {/* Common Errors */}
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <h4 className="font-semibold text-gray-900 mb-2">Common Errors:</h4>
              <ul className="space-y-1 text-xs">
                <li><strong>"predict.py not found"</strong> → Files in nested folder (must be at ZIP root)</li>
                <li><strong>"Module 'run' not found"</strong> → Function must be named exactly <code className="bg-gray-100 px-1 rounded">run</code></li>
                <li><strong>"No module named 'X'"</strong> → Add package to requirements.txt</li>
                <li><strong>"No output files found"</strong> → Write files to <code className="bg-gray-100 px-1 rounded">output_dir</code> parameter</li>
              </ul>
            </div>

            {/* Example command */}
            <div className="bg-gray-50 border border-gray-200 rounded p-3">
              <h4 className="font-semibold text-gray-900 mb-2">Create ZIP correctly:</h4>
              <pre className="text-xs overflow-x-auto">
{`cd your-model-directory
zip -r model.zip predict.py requirements.txt
# Verify: files should be at root
unzip -l model.zip`}
              </pre>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Version Number
        </label>
        <input
          type="text"
          value={versionNumber}
          onChange={(e) => setVersionNumber(e.target.value)}
          placeholder="e.g., v1.0"
          className="input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Model Package (.zip)
        </label>
        <input
          type="file"
          accept=".zip"
          onChange={handleFileChange}
          className="w-full"
        />
        {file && (
          <p className="text-sm text-gray-600 mt-1">
            Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      <Button onClick={handleUpload} disabled={isUploading || !file || !versionNumber}>
        {isUploading ? 'Uploading...' : 'Upload and Build'}
      </Button>
    </div>
  );
};
