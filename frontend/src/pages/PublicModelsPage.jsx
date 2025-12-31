import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getModels, favoriteModel, unfavoriteModel, getFavoriteModels } from '../api/models';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const PublicModelsPage = () => {
  const [models, setModels] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      const publicModels = await getModels(true); // Fetch only public models
      setModels(publicModels);

      // Only fetch favorites if authenticated
      if (isAuthenticated) {
        try {
          const favorites = await getFavoriteModels();
          setFavoriteIds(new Set(favorites.map(f => f.id)));
        } catch (error) {
          console.error('Failed to load favorites:', error);
        }
      } else {
        setFavoriteIds(new Set());
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFavoriteToggle = async (e, modelId) => {
    e.preventDefault();
    e.stopPropagation();

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      if (favoriteIds.has(modelId)) {
        await unfavoriteModel(modelId);
        setFavoriteIds(prev => {
          const next = new Set(prev);
          next.delete(modelId);
          return next;
        });
      } else {
        await favoriteModel(modelId);
        setFavoriteIds(prev => new Set([...prev, modelId]));
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
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
            <Card key={model.id} className="hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      {model.name}
                    </h3>
                    {model.owner_username && (
                      <div className="flex items-center text-sm text-gray-500">
                        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>by {model.owner_username}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleFavoriteToggle(e, model.id)}
                    className={`p-2 rounded-full transition-colors ${
                      favoriteIds.has(model.id)
                        ? 'text-red-500 hover:text-red-700'
                        : 'text-gray-400 hover:text-red-500'
                    }`}
                    title={favoriteIds.has(model.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <svg className="h-6 w-6" fill={favoriteIds.has(model.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                </div>

                <p className="text-gray-700 line-clamp-3">
                  {model.description || 'No description available'}
                </p>

                {/* Before & After Demo Images */}
                {(model.before_image_path || model.after_image_path) && (
                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">Demonstration:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {model.before_image_path && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Before</p>
                          <img
                            src={`http://localhost:8000/api/models/${model.id}/demo/before`}
                            alt="Before"
                            className="w-full h-24 object-cover rounded border border-gray-200"
                          />
                        </div>
                      )}
                      {model.after_image_path && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">After</p>
                          <img
                            src={`http://localhost:8000/api/models/${model.id}/demo/after`}
                            alt="After"
                            className="w-full h-24 object-cover rounded border border-gray-200"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="px-2 py-1 rounded bg-green-100 text-green-800 font-medium">
                    Public
                  </span>
                  <span>
                    {new Date(model.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="pt-3 border-t border-gray-200 space-y-2">
                  <Button
                    onClick={() => navigate(`/inference?modelId=${model.id}`)}
                    className="w-full"
                  >
                    Use This Model
                  </Button>
                  <Link to={`/models/${model.id}`} className="block">
                    <Button variant="secondary" className="w-full">
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
