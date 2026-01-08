import React, { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { getModels } from '../api/models';
import { getJobs } from '../api/jobs';
import { Card } from '../components/common/Card';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { AuthContext } from '../context/AuthContext';

export const Dashboard = () => {
  const [allModels, setAllModels] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my-models');
  const { user } = useContext(AuthContext);

  useEffect(() => {
    Promise.all([getModels(), getJobs()])
      .then(([modelsData, jobsData]) => {
        setAllModels(modelsData);
        setJobs(jobsData.slice(0, 5));
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  const myModels = allModels.filter(model => model.owner_id === user?.id);
  const publicModels = allModels.filter(model => model.is_public && model.owner_id !== user?.id);

  const displayedModels = activeTab === 'my-models' ? myModels.slice(0, 5) : publicModels.slice(0, 5);

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
          <h3 className="text-lg font-semibold mb-2">My Models</h3>
          <p className="text-4xl font-bold text-primary-500">{myModels.length}</p>
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
            <h2 className="text-xl font-semibold">Models</h2>
            <Link to="/models" className="text-primary-500 hover:underline">View all</Link>
          </div>

          {/* Tabs */}
          <div className="flex space-x-4 mb-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('my-models')}
              className={`pb-2 px-1 font-medium text-sm transition-colors ${
                activeTab === 'my-models'
                  ? 'border-b-2 border-primary-500 text-primary-500'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              My Models ({myModels.length})
            </button>
            <button
              onClick={() => setActiveTab('public-models')}
              className={`pb-2 px-1 font-medium text-sm transition-colors ${
                activeTab === 'public-models'
                  ? 'border-b-2 border-primary-500 text-primary-500'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Public Models ({publicModels.length})
            </button>
          </div>

          <div className="space-y-3">
            {displayedModels.length > 0 ? (
              displayedModels.map(model => (
                <Card key={model.id}>
                  <Link to={`/models/${model.id}`}>
                    <h3 className="font-semibold text-lg hover:text-primary-500">{model.name}</h3>
                    <p className="text-gray-600 text-sm mb-2">{model.description || 'No description'}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${model.is_public ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {model.is_public ? 'Public' : 'Private'}
                      </span>
                      {model.owner_username && activeTab === 'public-models' && (
                        <span className="text-xs text-gray-600">by {model.owner_username}</span>
                      )}
                    </div>
                  </Link>
                </Card>
              ))
            ) : (
              <Card>
                <p className="text-gray-600 text-center py-4">
                  {activeTab === 'my-models'
                    ? <>No models yet. <Link to="/models" className="text-primary-500 hover:underline">Create your first model</Link></>
                    : 'No public models available yet.'
                  }
                </p>
              </Card>
            )}
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
