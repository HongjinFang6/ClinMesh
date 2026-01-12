import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { usePolling } from '../hooks/usePolling';
import { getJob } from '../api/jobs';
import { JobStatus } from '../utils/constants';
import { Card } from '../components/common/Card';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { OutputViewer } from '../components/jobs/OutputViewer';

export const JobDetailPage = () => {
  const { jobId } = useParams();
  const location = useLocation();
  const initialJob = useMemo(() => location.state?.job ?? null, [location.state]);
  const [cachedJob, setCachedJob] = useState(initialJob);
  const [useCacheOnly, setUseCacheOnly] = useState(
    initialJob?.status === JobStatus.SUCCEEDED || initialJob?.status === JobStatus.FAILED
  );

  const fetchJob = useCallback(() => {
    if (useCacheOnly && cachedJob) {
      return Promise.resolve(cachedJob);
    }
    return getJob(jobId);
  }, [useCacheOnly, cachedJob, jobId]);

  const shouldPoll = useCallback((data) => {
    return data?.status === JobStatus.QUEUED || data?.status === JobStatus.RUNNING;
  }, []);

  const { data: job, isLoading, error } = usePolling(fetchJob, shouldPoll);

  useEffect(() => {
    setCachedJob(initialJob);
    setUseCacheOnly(
      initialJob?.status === JobStatus.SUCCEEDED || initialJob?.status === JobStatus.FAILED
    );
  }, [initialJob, jobId]);

  useEffect(() => {
    if (!job) return;
    setCachedJob(job);
    if (job.status === JobStatus.SUCCEEDED || job.status === JobStatus.FAILED) {
      setUseCacheOnly(true);
    }
  }, [job]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Job</h2>
            <p className="text-red-600">
              {error.response?.status === 429
                ? "Too many requests. Please wait a moment and try again."
                : error.response?.data?.detail || "Failed to load job details"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !job) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            {job.name || `Job ${jobId.slice(0, 8)}`}
          </h1>
          {job.name && (
            <p className="text-sm text-gray-500 mt-1">ID: {jobId.slice(0, 8)}</p>
          )}
        </div>
        <StatusBadge status={job.status} />
      </div>

      <Card>
        <div className="space-y-4">
          {job.name && (
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="font-medium">{job.name}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-600">Created</p>
            <p className="font-medium">{new Date(job.created_at).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className="font-medium">{job.status}</p>
          </div>
        </div>
      </Card>

      {job.error_message && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-red-800">{job.error_message}</p>
        </div>
      )}

      {job.status === JobStatus.SUCCEEDED && (
        <OutputViewer jobId={jobId} jobStatus={job.status} />
      )}
    </div>
  );
};
