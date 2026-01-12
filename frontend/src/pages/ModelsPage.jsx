import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getModels, createModel } from '../api/models';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { TagSelector } from '../components/models/TagSelector';
import { AdvancedFilterModal } from '../components/models/AdvancedFilterModal';
import { IMAGING_MODALITY_TAGS, ORGAN_TAGS } from '../constants/tags';

export const ModelsPage = () => {
  const navigate = useNavigate();
  const [models, setModels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_public: false,
    imaging_modality_tags: [],
    organ_tags: []
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [filters, setFilters] = useState({
    imaging_modality_tags: [],
    organ_tags: []
  });
  const [activeFilters, setActiveFilters] = useState({
    imaging_modality_tags: [],
    organ_tags: []
  });

  useEffect(() => {
    fetchModels();
  }, [activeFilters]);

  const fetchModels = async () => {
    try {
      const params = {};
      if (activeFilters.imaging_modality_tags.length > 0) {
        params.imaging_modality_tags = activeFilters.imaging_modality_tags.join(',');
      }
      if (activeFilters.organ_tags.length > 0) {
        params.organ_tags = activeFilters.organ_tags.join(',');
      }
      const data = await getModels(params);
      setModels(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilters = () => {
    setActiveFilters(filters);
    setShowAdvancedFilter(false);
  };

  const handleClearFilters = () => {
    const emptyFilters = { imaging_modality_tags: [], organ_tags: [] };
    setFilters(emptyFilters);
    setActiveFilters(emptyFilters);
    setShowAdvancedFilter(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    await createModel(formData);
    setFormData({
      name: '',
      description: '',
      is_public: false,
      imaging_modality_tags: [],
      organ_tags: []
    });
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

      {/* Search Bar and Advanced Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
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
        <Button
          onClick={() => setShowAdvancedFilter(true)}
          variant="secondary"
          className="flex items-center gap-2"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Advanced Search
          {(activeFilters.imaging_modality_tags.length > 0 || activeFilters.organ_tags.length > 0) && (
            <span className="bg-primary-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">
              {activeFilters.imaging_modality_tags.length + activeFilters.organ_tags.length}
            </span>
          )}
        </Button>
      </div>

      <AdvancedFilterModal
        isOpen={showAdvancedFilter}
        onClose={() => setShowAdvancedFilter(false)}
        filters={filters}
        onFiltersChange={setFilters}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />

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

            <TagSelector
              label="Imaging Modality (select all that apply)"
              tags={IMAGING_MODALITY_TAGS}
              selectedTags={formData.imaging_modality_tags}
              onChange={(tags) => setFormData({ ...formData, imaging_modality_tags: tags })}
            />

            <TagSelector
              label="Organ / Body Part (select all that apply)"
              tags={ORGAN_TAGS}
              selectedTags={formData.organ_tags}
              onChange={(tags) => setFormData({ ...formData, organ_tags: tags })}
            />

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
                {/* Before & After Demo Images Thumbnail */}
                {(model.before_image_path || model.after_image_path) && (
                  <div className="grid grid-cols-2 gap-2 -mx-6 -mt-6 mb-2">
                    {model.before_image_path && (
                      <div className="relative">
                        <img
                          src={`http://localhost:8000/api/models/${model.id}/demo/before`}
                          alt="Before"
                          className="w-full h-32 object-cover rounded-tl-lg"
                        />
                        <span className="absolute top-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                          Before
                        </span>
                      </div>
                    )}
                    {model.after_image_path && (
                      <div className="relative">
                        <img
                          src={`http://localhost:8000/api/models/${model.id}/demo/after`}
                          alt="After"
                          className={`w-full h-32 object-cover ${!model.before_image_path ? 'rounded-t-lg' : 'rounded-tr-lg'}`}
                        />
                        <span className="absolute top-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                          After
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">
                    {model.name}
                  </h3>
                </div>

                <p className="text-gray-700 line-clamp-3">
                  {model.description || 'No description available'}
                </p>

                {/* Tags */}
                {(model.imaging_modality_tags?.length > 0 || model.organ_tags?.length > 0) && (
                  <div className="space-y-2">
                    {model.imaging_modality_tags?.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Imaging Modality:</p>
                        <div className="flex flex-wrap gap-1">
                          {model.imaging_modality_tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full font-medium">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {model.organ_tags?.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Organ / Body Part:</p>
                        <div className="flex flex-wrap gap-1">
                          {model.organ_tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-secondary-100 text-secondary-700 text-xs rounded-full font-medium">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
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
