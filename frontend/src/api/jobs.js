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

// Batch job creation - single job with multiple images
export const createBatchJob = async (jobData) => {
  const response = await apiClient.post('/api/jobs/batch', {
    version_id: jobData.version_id,
    image_count: jobData.image_count,
    filenames: jobData.filenames
  });
  return response.data;
};

// Create multiple individual jobs
export const createMultipleJobs = async (jobData) => {
  const response = await apiClient.post('/api/jobs/multiple', {
    version_id: jobData.version_id,
    filenames: jobData.filenames
  });
  return response.data;
};

// Upload multiple images to presigned URLs
export const uploadMultipleImages = async (uploadTasks) => {
  const results = await Promise.allSettled(
    uploadTasks.map(({ url, file }) =>
      uploadImageToPresignedUrl(url, file)
    )
  );

  return results.map((result, index) => ({
    filename: uploadTasks[index].file.name,
    success: result.status === 'fulfilled',
    error: result.status === 'rejected' ? result.reason.message : null
  }));
};

// Trigger multiple jobs
export const runMultipleJobs = async (jobIds) => {
  const results = await Promise.allSettled(
    jobIds.map(jobId => runJob(jobId))
  );

  return results.map((result, index) => ({
    jobId: jobIds[index],
    success: result.status === 'fulfilled',
    error: result.status === 'rejected' ? result.reason.message : null
  }));
};

// Get multiple jobs status (for polling)
export const getMultipleJobs = async (jobIds) => {
  const response = await apiClient.post('/api/jobs/batch-status', {
    job_ids: jobIds
  });
  return response.data;
};
