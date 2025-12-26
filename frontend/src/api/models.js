import apiClient from './client';

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
export const uploadToPresignedUrl = async (uploadUrl, file) => {
  console.log('Uploading to API endpoint:', uploadUrl);
  console.log('File size:', file.size, 'bytes');

  // Create FormData for file upload
  const formData = new FormData();
  formData.append('file', file);

  // Upload to API proxy endpoint
  const fullUrl = uploadUrl.startsWith('http') ? uploadUrl : `http://localhost:8000${uploadUrl}`;
  const response = await fetch(fullUrl, {
    method: 'POST',
    body: formData
  });

  console.log('Upload response status:', response.status);
  console.log('Upload response ok:', response.ok);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Upload error response:', errorText);
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }

  return response;
};
