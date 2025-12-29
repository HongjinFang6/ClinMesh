import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getJobs } from '../api/jobs';
import { Card } from '../components/common/Card';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const JobsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const data = await getJobs();
      setJobs(data);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">All Inference Jobs</h1>

      <div className="space-y-4">
        {jobs.map(job => (
          <Card key={job.id}>
            <Link to={`/jobs/${job.id}`}>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">
                    {job.name || `Job ${job.id.slice(0, 8)}`}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Created: {new Date(job.created_at).toLocaleString()}
                  </p>
                  {job.name && (
                    <p className="text-xs text-gray-500">ID: {job.id.slice(0, 8)}</p>
                  )}
                </div>
                <StatusBadge status={job.status} />
              </div>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
};
