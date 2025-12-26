import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getModels } from '../api/models';
import { getJobs } from '../api/jobs';
import { Card } from '../components/common/Card';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const Dashboard = () => {
  const [models, setModels] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getModels(), getJobs()])
      .then(([modelsData, jobsData]) => {
        setModels(modelsData.slice(0, 5));
        setJobs(jobsData.slice(0, 5));
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const successfulJobs = jobs.filter(j => j.status === 'SUCCEEDED').length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage your CV models and inference jobs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <h3 className="text-lg font-semibold mb-2">Total Models</h3>
          <p className="text-4xl font-bold text-primary-500">{models.length}</p>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold mb-2">Total Jobs</h3>
          <p className="text-4xl font-bold text-primary-500">{jobs.length}</p>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold mb-2">Success Rate</h3>
          <p className="text-4xl font-bold text-green-500">
            {jobs.length ? Math.round((successfulJobs / jobs.length) * 100) : 0}%
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Recent Models</h2>
            <Link to="/models" className="text-primary-500 hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {models.map(model => (
              <Card key={model.id}>
                <Link to={`/models/${model.id}`}>
                  <h3 className="font-semibold text-lg hover:text-primary-500">{model.name}</h3>
                  <p className="text-gray-600 text-sm">{model.description || 'No description'}</p>
                </Link>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Recent Jobs</h2>
            <Link to="/jobs" className="text-primary-500 hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {jobs.map(job => (
              <Card key={job.id}>
                <div className="flex justify-between items-center">
                  <Link to={`/jobs/${job.id}`}>
                    <p className="font-medium">Job {job.id.slice(0, 8)}</p>
                  </Link>
                  <StatusBadge status={job.status} />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
