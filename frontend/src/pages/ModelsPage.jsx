import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getModels, createModel } from '../api/models';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const ModelsPage = () => {
  const navigate = useNavigate();
  const [models, setModels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', is_public: false });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const data = await getModels();
      setModels(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    await createModel(formData);
    setFormData({ name: '', description: '', is_public: false });
    setShowCreateForm(false);
    fetchModels();
  };

  // Filter models based on search query
  const filteredModels = models.filter(model =>
    model.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Models</h1>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : 'Create New Model'}
        </Button>
      </div>

      {/* Search Bar */}
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

      {showCreateForm && (
        <Card>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input"
                rows="3"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_public}
                onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                className="mr-2"
              />
              <label className="text-sm text-gray-700">Make public</label>
            </div>
            <Button type="submit">Create Model</Button>
          </form>
        </Card>
      )}

      {filteredModels.length === 0 ? (
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
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchQuery ? 'No models found' : 'No models yet'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery
                ? 'Try a different search term'
                : "Click 'Create New Model' to get started."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModels.map(model => (
            <Card key={model.id} className="hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">
                    {model.name}
                  </h3>
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
                  <span className={`px-2 py-1 rounded font-medium ${
                    model.is_public ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {model.is_public ? 'Public' : 'Private'}
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
