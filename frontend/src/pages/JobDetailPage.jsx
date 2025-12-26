import React from 'react';
import { useParams } from 'react-router-dom';
import { usePolling } from '../hooks/usePolling';
import { getJob } from '../api/jobs';
import { JobStatus } from '../utils/constants';
import { Card } from '../components/common/Card';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { OutputViewer } from '../components/jobs/OutputViewer';

export const JobDetailPage = () => {
  const { jobId } = useParams();

  const shouldPoll = (data) => {
    return data?.status === JobStatus.QUEUED || data?.status === JobStatus.RUNNING;
  };

  const { data: job, isLoading } = usePolling(() => getJob(jobId), shouldPoll);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Job {jobId.slice(0, 8)}</h1>
        <StatusBadge status={job?.status} />
      </div>

      <Card>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">Created</p>
            <p className="font-medium">{new Date(job?.created_at).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className="font-medium">{job?.status}</p>
          </div>
        </div>
      </Card>

      {job?.error_message && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-red-800">{job.error_message}</p>
        </div>
      )}

      {job?.status === JobStatus.SUCCEEDED && (
        <OutputViewer jobId={jobId} jobStatus={job.status} />
      )}
    </div>
  );
};
