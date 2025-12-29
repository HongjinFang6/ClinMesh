import React, { useState, useMemo } from 'react';
import { OutputViewer } from './OutputViewer';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';
import { JobStatus } from '../../utils/constants';

export const MultiJobResultsViewer = ({ jobStatuses, onRetryJobs }) => {
  const [expandedJobs, setExpandedJobs] = useState(new Set());

  const stats = useMemo(() => {
    const jobArray = Object.values(jobStatuses);
    const totalJobs = jobArray.length;
    const succeededCount = jobArray.filter(j => j.status === JobStatus.SUCCEEDED).length;
    const failedCount = jobArray.filter(j => j.status === JobStatus.FAILED).length;

    const failedJobIds = jobArray
      .filter(j => j.status === JobStatus.FAILED)
      .map(j => j.id);

    return { totalJobs, succeededCount, failedCount, failedJobIds };
  }, [jobStatuses]);

  const toggleJobExpanded = (jobId) => {
    const newExpanded = new Set(expandedJobs);
    if (newExpanded.has(jobId)) {
      newExpanded.delete(jobId);
    } else {
      newExpanded.add(jobId);
    }
    setExpandedJobs(newExpanded);
  };

  const handleRetryAll = () => {
    if (onRetryJobs && stats.failedJobIds.length > 0) {
      onRetryJobs(stats.failedJobIds);
    }
  };

  const handleRetryJob = (jobId) => {
    if (onRetryJobs) {
      onRetryJobs([jobId]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-50 border rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-gray-900">{stats.totalJobs}</div>
          <div className="text-sm text-gray-600 mt-1">Total Jobs</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-green-700">{stats.succeededCount}</div>
          <div className="text-sm text-green-600 mt-1">Succeeded</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-red-700">{stats.failedCount}</div>
          <div className="text-sm text-red-600 mt-1">Failed</div>
        </div>
      </div>

      {/* Retry All Button */}
      {stats.failedCount > 0 && onRetryJobs && (
        <Button onClick={handleRetryAll} variant="secondary">
          Retry All Failed Jobs ({stats.failedCount})
        </Button>
      )}

      {/* Results List */}
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-800 mb-2">Job Results</h3>
        {Object.entries(jobStatuses).map(([jobId, job]) => (
          <div key={jobId} className="border rounded-lg overflow-hidden bg-white shadow-sm">
            {/* Accordion Header */}
            <button
              onClick={() => toggleJobExpanded(jobId)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 text-left">
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${expandedJobs.has(jobId) ? 'rotate-90' : ''}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="font-medium text-gray-700 truncate" title={job.name || job.filename || jobId}>
                  {job.name || job.filename || `Job ${jobId.substring(0, 8)}...`}
                </span>
              </div>
              <StatusBadge status={job.status} />
            </button>

            {/* Accordion Content */}
            {expandedJobs.has(jobId) && (
              <div className="p-4 bg-gray-50 border-t">
                {job.status === JobStatus.SUCCEEDED ? (
                  <div>
                    <p className="text-sm text-gray-600 mb-3">Inference completed successfully</p>
                    <OutputViewer jobId={jobId} jobStatus={job.status} />
                  </div>
                ) : job.status === JobStatus.FAILED ? (
                  <div className="space-y-3">
                    <div className="bg-red-50 border-l-4 border-red-400 p-3">
                      <p className="text-sm font-medium text-red-800">Error</p>
                      <p className="text-sm text-red-700 mt-1">
                        {job.error_message || 'Inference failed'}
                      </p>
                    </div>
                    {onRetryJobs && (
                      <Button
                        onClick={() => handleRetryJob(jobId)}
                        variant="secondary"
                        size="sm"
                      >
                        Retry This Job
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">
                    Job is still {job.status.toLowerCase()}...
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
