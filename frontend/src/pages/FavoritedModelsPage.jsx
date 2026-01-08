import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFavoriteModels, unfavoriteModel } from '../api/models';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const FavoritedModelsPage = () => {
  const [models, setModels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const data = await getFavoriteModels();
      setModels(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load favorites');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnfavorite = async (modelId) => {
    try {
      await unfavoriteModel(modelId);
      setModels(models.filter(m => m.id !== modelId));
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to remove from favorites');
    }
  };

  const handleUseModel = (modelId) => {
    navigate(`/inference?modelId=${modelId}`);
  };

  // Filter models based on search query
  const filteredModels = models.filter(model =>
    model.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Favorite Models</h1>
        <p className="text-gray-600 mt-2">Quick access to your frequently used AI models</p>
      </div>

      {/* Search Bar */}
      {models.length > 0 && (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search models by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {models.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No favorites yet</h3>
            <p className="mt-2 text-sm text-gray-600">
              Browse public models and add your favorites for quick access
            </p>
            <div className="mt-6">
              <Button onClick={() => navigate('/public-models')}>
                Browse Public Models
              </Button>
            </div>
          </div>
        </Card>
      ) : filteredModels.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No models found</h3>
            <p className="mt-1 text-sm text-gray-500">Try a different search term</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModels.map(model => (
            <Card key={model.id} className="hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                <div>
                  <div className="flex items-start justify-between">
                    <h3 className="text-xl font-semibold text-gray-900">{model.name}</h3>
                    <button
                      onClick={() => handleUnfavorite(model.id)}
                      className="text-red-500 hover:text-red-700"
                      title="Remove from favorites"
                    >
                      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    by {model.owner_username || 'Unknown'}
                  </p>
                </div>

                <p className="text-gray-700 line-clamp-3">
                  {model.description || 'No description available'}
                </p>

                <div className="pt-4 border-t border-gray-200">
                  <Button
                    onClick={() => handleUseModel(model.id)}
                    className="w-full"
                  >
                    Use This Model
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
