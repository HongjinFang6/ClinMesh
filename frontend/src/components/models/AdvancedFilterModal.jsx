import React from 'react';
import { Button } from '../common/Button';
import { IMAGING_MODALITY_TAGS, ORGAN_TAGS } from '../../constants/tags';

export const AdvancedFilterModal = ({ isOpen, onClose, filters, onFiltersChange, onApply, onClear }) => {
  if (!isOpen) return null;

  const toggleTag = (category, tag) => {
    const currentTags = filters[category];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    onFiltersChange({ ...filters, [category]: newTags });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Advanced Search</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Imaging Modality Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Filter by Imaging Modality
              </label>
              <div className="flex flex-wrap gap-2">
                {IMAGING_MODALITY_TAGS.map(tag => {
                  const isSelected = filters.imaging_modality_tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag('imaging_modality_tags', tag)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-primary-500 text-white hover:bg-primary-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Organ Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Filter by Organ / Body Part
              </label>
              <div className="flex flex-wrap gap-2">
                {ORGAN_TAGS.map(tag => {
                  const isSelected = filters.organ_tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag('organ_tags', tag)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-secondary-500 text-white hover:bg-secondary-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex space-x-3 mt-8">
            <Button onClick={onApply} className="flex-1">
              Apply Filters
            </Button>
            <Button onClick={onClear} variant="secondary" className="flex-1">
              Clear All
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
