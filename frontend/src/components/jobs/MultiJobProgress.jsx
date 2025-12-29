import React, { useMemo } from 'react';
import { StatusBadge } from '../common/StatusBadge';
import { JobStatus } from '../../utils/constants';

export const MultiJobProgress = ({ jobStatuses, filenames }) => {
  const stats = useMemo(() => {
    const jobArray = Object.values(jobStatuses);
    const totalCount = jobArray.length;
    const completedCount = jobArray.filter(j =>
      j.status === JobStatus.SUCCEEDED || j.status === JobStatus.FAILED
    ).length;
    const succeededCount = jobArray.filter(j => j.status === JobStatus.SUCCEEDED).length;
    const failedCount = jobArray.filter(j => j.status === JobStatus.FAILED).length;
    const runningCount = jobArray.filter(j => j.status === JobStatus.RUNNING).length;
    const queuedCount = jobArray.filter(j => j.status === JobStatus.QUEUED).length;

    return {
      totalCount,
      completedCount,
      succeededCount,
      failedCount,
      runningCount,
      queuedCount,
      percentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
    };
  }, [jobStatuses]);

  const getStatusIcon = (status) => {
    switch (status) {
      case JobStatus.SUCCEEDED:
        return (
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case JobStatus.FAILED:
        return (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case JobStatus.RUNNING:
        return (
          <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        );
      case JobStatus.QUEUED:
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getDisplayNameForJob = (jobId) => {
    const job = jobStatuses[jobId];
    // Prefer job name, then filename, then fallback
    return job?.name || job?.filename || filenames?.[jobId] || `Job ${jobId.substring(0, 8)}...`;
  };

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <div>
        <div className="flex justify-between mb-2">
          <span className="font-medium text-gray-700">
            Job Progress ({stats.completedCount}/{stats.totalCount})
          </span>
          <span className="font-medium text-gray-700">{stats.percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-primary-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${stats.percentage}%` }}
          />
        </div>

        {/* Stats Summary */}
        <div className="flex gap-4 mt-3 text-sm">
          {stats.succeededCount > 0 && (
            <span className="text-green-600">
              {stats.succeededCount} succeeded
            </span>
          )}
          {stats.failedCount > 0 && (
            <span className="text-red-600">
              {stats.failedCount} failed
            </span>
          )}
          {stats.runningCount > 0 && (
            <span className="text-blue-600">
              {stats.runningCount} running
            </span>
          )}
          {stats.queuedCount > 0 && (
            <span className="text-yellow-600">
              {stats.queuedCount} queued
            </span>
          )}
        </div>
      </div>

      {/* Individual Job Status List */}
      <div className="border rounded-lg bg-gray-50 max-h-96 overflow-y-auto">
        <div className="divide-y">
          {Object.entries(jobStatuses).map(([jobId, job]) => (
            <div
              key={jobId}
              className="flex items-center gap-3 p-3 hover:bg-gray-100 transition-colors"
            >
              <div className="flex-shrink-0">
                {getStatusIcon(job.status)}
              </div>
              <span className="flex-1 text-sm text-gray-700 truncate" title={getDisplayNameForJob(jobId)}>
                {getDisplayNameForJob(jobId)}
              </span>
              <StatusBadge status={job.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
