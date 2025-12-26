import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createModelVersion, uploadToPresignedUrl, triggerBuild } from '../../api/models';
import { Button } from '../common/Button';

export const UploadModelPackage = ({ modelId }) => {
  const [file, setFile] = useState(null);
  const [versionNumber, setVersionNumber] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
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
