import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getModels } from '../api/models';
import { Card } from '../components/common/Card';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const PublicModelsPage = () => {
  const [models, setModels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPublicModels();
  }, []);

  const fetchPublicModels = async () => {
    try {
      const data = await getModels(true); // Fetch only public models
      setModels(data);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Public Models</h1>
        <p className="text-gray-600 mt-2">
          Browse and use computer vision models shared by the community
        </p>
      </div>

      {models.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No public models yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Be the first to share a model with the community!
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {models.map(model => (
            <Card key={model.id}>
              <Link to={`/models/${model.id}`}>
                <h3 className="text-xl font-semibold hover:text-primary-500 mb-2">
                  {model.name}
                </h3>
                <p className="text-gray-600 text-sm mb-3">
                  {model.description || 'No description'}
                </p>
                {model.owner_username && (
                  <div className="flex items-center text-sm text-gray-500 mb-3">
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>by {model.owner_username}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                    Public
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(model.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
