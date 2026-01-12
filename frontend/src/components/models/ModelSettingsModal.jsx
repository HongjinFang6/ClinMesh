import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateModel, deleteModel } from '../../api/models';
import { Button } from '../common/Button';
import { TagSelector } from './TagSelector';
import { IMAGING_MODALITY_TAGS, ORGAN_TAGS } from '../../constants/tags';

export const ModelSettingsModal = ({ model, onClose, onUpdate }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: model.name,
    description: model.description || '',
    is_public: model.is_public,
    imaging_modality_tags: model.imaging_modality_tags || [],
    organ_tags: model.organ_tags || []
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');
  const [beforeImage, setBeforeImage] = useState(null);
  const [afterImage, setAfterImage] = useState(null);
  const [isUploadingBefore, setIsUploadingBefore] = useState(false);
  const [isUploadingAfter, setIsUploadingAfter] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    setError('');

    try {
      const updated = await updateModel(model.id, formData);
      onUpdate(updated);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update model');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError('');

    try {
      await deleteModel(model.id);
      navigate('/models');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete model');
      setIsDeleting(false);
    }
  };

  const handleBeforeImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingBefore(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/models/${model.id}/demo/upload-before`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      setBeforeImage(file);
      alert('Before image uploaded successfully! The old image has been replaced.');
      // Trigger a page reload or model refetch to show new image
      window.location.reload();
    } catch (err) {
      setError('Failed to upload before image');
    } finally {
      setIsUploadingBefore(false);
    }
  };

  const handleAfterImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingAfter(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/models/${model.id}/demo/upload-after`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      setAfterImage(file);
      alert('After image uploaded successfully! The old image has been replaced.');
      // Trigger a page reload or model refetch to show new image
      window.location.reload();
    } catch (err) {
      setError('Failed to upload after image');
    } finally {
      setIsUploadingAfter(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Model Settings</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg mb-4">
              {error}
            </div>
          )}

          {!showDeleteConfirm ? (
            <>
              {/* Update Form */}
              <form onSubmit={handleUpdate} className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
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
                    id="is_public"
                    checked={formData.is_public}
                    onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                    className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_public" className="ml-2 text-sm text-gray-700">
                    Make this model public
                  </label>
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

                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-semibold mb-3">Demo Images (Before & After)</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Upload before and after images to demonstrate what your model does
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Before Image */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Before Image
                      </label>
                      {model.before_image_path && (
                        <img
                          src={`http://localhost:8000/api/models/${model.id}/demo/before`}
                          alt="Before"
                          className="w-full h-40 object-cover rounded-lg mb-2 border border-gray-200"
                        />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBeforeImageUpload}
                        disabled={isUploadingBefore}
                        className="block w-full text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded file:border-0
                          file:text-sm file:font-semibold
                          file:bg-primary-50 file:text-primary-700
                          hover:file:bg-primary-100
                          disabled:opacity-50"
                      />
                      {isUploadingBefore && (
                        <p className="text-sm text-gray-500 mt-1">Uploading...</p>
                      )}
                    </div>

                    {/* After Image */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        After Image
                      </label>
                      {model.after_image_path && (
                        <img
                          src={`http://localhost:8000/api/models/${model.id}/demo/after`}
                          alt="After"
                          className="w-full h-40 object-cover rounded-lg mb-2 border border-gray-200"
                        />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAfterImageUpload}
                        disabled={isUploadingAfter}
                        className="block w-full text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded file:border-0
                          file:text-sm file:font-semibold
                          file:bg-primary-50 file:text-primary-700
                          hover:file:bg-primary-100
                          disabled:opacity-50"
                      />
                      {isUploadingAfter && (
                        <p className="text-sm text-gray-500 mt-1">Uploading...</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button type="submit" disabled={isUpdating}>
                    {isUpdating ? 'Updating...' : 'Update Model'}
                  </Button>
                  <Button type="button" onClick={onClose} variant="secondary">
                    Cancel
                  </Button>
                </div>
              </form>

              {/* Danger Zone */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Deleting this model will permanently remove it and all its versions. This action cannot be undone.
                </p>
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete Model
                </Button>
              </div>
            </>
          ) : (
            // Delete Confirmation
            <div className="space-y-4">
              <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Are you absolutely sure?
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>This will permanently delete:</p>
                      <ul className="list-disc list-inside mt-2">
                        <li>Model: <strong>{model.name}</strong></li>
                        <li>All model versions</li>
                        <li>All associated data</li>
                      </ul>
                      <p className="mt-2">This action cannot be undone.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete Permanently'}
                </Button>
                <Button
                  onClick={() => setShowDeleteConfirm(false)}
                  variant="secondary"
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
