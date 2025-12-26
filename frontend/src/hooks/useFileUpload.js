import { useState } from 'react';

export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  const uploadFile = async (uploadUrl, file, contentType = 'application/zip') => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);

      // Upload to API proxy endpoint
      const fullUrl = uploadUrl.startsWith('http') ? uploadUrl : `http://localhost:8000${uploadUrl}`;
      const response = await fetch(fullUrl, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      setUploadProgress(100);
      setIsUploading(false);
      return response;
    } catch (err) {
      setError(err.message);
      setIsUploading(false);
      throw err;
    }
  };

  return { uploadFile, isUploading, uploadProgress, error };
};
