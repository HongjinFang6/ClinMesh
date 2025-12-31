import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFavoriteModels, getModels } from '../api/models';
import { getJobs } from '../api/jobs';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { StatusBadge } from '../components/common/StatusBadge';

export const DoctorDashboard = () => {
  const [favorites, setFavorites] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const [publicModels, setPublicModels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [favs, jobs, models] = await Promise.all([
        getFavoriteModels(),
        getJobs(),
        getModels(true) // Get public models
      ]);
      setFavorites(favs.slice(0, 3));
      setRecentJobs(jobs.slice(0, 5));
      setPublicModels(models.slice(0, 3));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const successfulJobs = recentJobs.filter(j => j.status === 'SUCCEEDED').length;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg shadow-lg p-8 text-white">
        <h1 className="text-4xl font-bold mb-2">Welcome to ClinMesh</h1>
        <p className="text-xl opacity-90">AI-powered medical image analysis at your fingertips</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-700">Favorite Models</h3>
              <p className="text-3xl font-bold text-primary-500">{favorites.length}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-700">Total Jobs</h3>
              <p className="text-3xl font-bold text-primary-500">{recentJobs.length}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-700">Success Rate</h3>
              <p className="text-3xl font-bold text-green-500">
                {recentJobs.length ? Math.round((successfulJobs / recentJobs.length) * 100) : 0}%
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/public-models')}
            className="flex items-center p-4 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
          >
            <div className="p-3 bg-primary-500 rounded-lg">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="ml-4 text-left">
              <h3 className="font-semibold text-gray-900">Browse AI Models</h3>
              <p className="text-sm text-gray-600">Explore available medical imaging models</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/favorites')}
            className="flex items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <div className="p-3 bg-blue-500 rounded-lg">
              <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <div className="ml-4 text-left">
              <h3 className="font-semibold text-gray-900">My Favorites</h3>
              <p className="text-sm text-gray-600">Quick access to your preferred models</p>
            </div>
          </button>
        </div>
      </Card>

      {/* Favorite Models */}
      {favorites.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Your Favorite Models</h2>
            <Button variant="secondary" onClick={() => navigate('/favorites')}>
              View All
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {favorites.map(model => (
              <Card key={model.id} className="hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{model.name}</h3>
                <p className="text-sm text-gray-600 mb-3">by {model.owner_username || 'Unknown'}</p>
                <p className="text-gray-700 mb-4 line-clamp-2">{model.description || 'No description'}</p>
                <Button
                  onClick={() => navigate(`/inference?modelId=${model.id}`)}
                  className="w-full"
                >
                  Use Model
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent Jobs */}
      {recentJobs.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Recent Analysis Jobs</h2>
            <Button variant="secondary" onClick={() => navigate('/jobs')}>
              View All Jobs
            </Button>
          </div>
          <Card>
            <div className="space-y-3">
              {recentJobs.slice(0, 5).map(job => (
                <div
                  key={job.id}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                  onClick={() => navigate(`/jobs/${job.id}`)}
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {job.name || `Job ${job.id.slice(0, 8)}`}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(job.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={job.status} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* No Jobs Yet */}
      {recentJobs.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No analysis jobs yet</h3>
            <p className="mt-2 text-sm text-gray-600">
              Get started by browsing available models and running your first analysis
            </p>
            <div className="mt-6">
              <Button onClick={() => navigate('/public-models')}>
                Browse Models
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
