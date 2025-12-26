export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const ModelVersionStatus = {
  UPLOADING: 'UPLOADING',
  BUILDING: 'BUILDING',
  READY: 'READY',
  FAILED: 'FAILED'
};

export const JobStatus = {
  UPLOADING: 'UPLOADING',
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED'
};

export const POLLING_INTERVAL = 3000; // 3 seconds
