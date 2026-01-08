import apiClient from './client';
import { getToken } from '../utils/storage';

export const createModel = async (modelData) => {
  const response = await apiClient.post('/api/models/', modelData);
  return response.data;
};

export const getModels = async (publicOnly = false) => {
  const params = publicOnly ? { public_only: true } : {};
  const response = await apiClient.get('/api/models/', { params });
  return response.data;
};

export const getModel = async (modelId) => {
  const response = await apiClient.get(`/api/models/${modelId}`);
  return response.data;
};

export const updateModel = async (modelId, modelData) => {
  const response = await apiClient.put(`/api/models/${modelId}`, modelData);
  return response.data;
};

export const deleteModel = async (modelId) => {
  const response = await apiClient.delete(`/api/models/${modelId}`);
  return response.data;
};

export const copyModel = async (modelId) => {
  const response = await apiClient.post(`/api/models/${modelId}/copy`);
  return response.data;
};

export const getModelVersions = async (status = null, modelId = null) => {
  const params = {};
  if (status) params.status = status;
  if (modelId) params.model_id = modelId;
  const response = await apiClient.get('/api/models/versions', { params });
  return response.data;
};

export const createModelVersion = async (versionData) => {
  const response = await apiClient.post('/api/models/versions', versionData);
  return response.data;
};

export const getModelVersion = async (versionId) => {
  const response = await apiClient.get(`/api/models/versions/${versionId}`);
  return response.data;
};

export const deleteModelVersion = async (versionId) => {
  const response = await apiClient.delete(`/api/models/versions/${versionId}`);
  return response.data;
};

export const triggerBuild = async (versionId) => {
  const response = await apiClient.post(`/api/models/versions/${versionId}/build`);
  return response.data;
};

// Upload via API proxy endpoint (no presigned URL needed)
export const uploadToPresignedUrl = async (uploadUrl, file, onProgress) => {
  console.log('Uploading to API endpoint:', uploadUrl);
  console.log('File size:', file.size, 'bytes');

  // Create FormData for file upload
  const formData = new FormData();
  formData.append('file', file);

  // Get auth token
  const token = getToken();

  // Upload to API proxy endpoint with progress tracking using XMLHttpRequest
  const fullUrl = uploadUrl.startsWith('http') ? uploadUrl : `http://localhost:8000${uploadUrl}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      });
    }

    xhr.addEventListener('load', () => {
      console.log('Upload response status:', xhr.status);
      console.log('Upload response ok:', xhr.status >= 200 && xhr.status < 300);

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response);
      } else {
        console.error('Upload error response:', xhr.responseText);
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed: Network error'));
    });

    xhr.open('POST', fullUrl);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
};

export const favoriteModel = async (modelId) => {
  const response = await apiClient.post(`/api/models/${modelId}/favorite`);
  return response.data;
};

export const unfavoriteModel = async (modelId) => {
  const response = await apiClient.delete(`/api/models/${modelId}/favorite`);
  return response.data;
};

export const getFavoriteModels = async () => {
  const response = await apiClient.get('/api/models/favorites/list');
  return response.data;
};
