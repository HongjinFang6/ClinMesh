import apiClient from './client';

export const createJob = async (jobData) => {
  const response = await apiClient.post('/api/jobs/', jobData);
  return response.data;
};

export const runJob = async (jobId) => {
  const response = await apiClient.post(`/api/jobs/${jobId}/run`);
  return response.data;
};

export const getJob = async (jobId) => {
  const response = await apiClient.get(`/api/jobs/${jobId}`);
  return response.data;
};

export const getJobOutputs = async (jobId) => {
  const response = await apiClient.get(`/api/jobs/${jobId}/outputs`);
  return response.data;
};

export const getJobs = async () => {
  const response = await apiClient.get('/api/jobs/');
  return response.data;
};

export const uploadImageToPresignedUrl = async (uploadUrl, imageFile) => {
  // Create FormData for file upload
  const formData = new FormData();
  formData.append('file', imageFile);

  // Upload to API proxy endpoint
  const fullUrl = uploadUrl.startsWith('http') ? uploadUrl : `http://localhost:8000${uploadUrl}`;
  const response = await fetch(fullUrl, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Image upload failed');
  }
  return response;
};
