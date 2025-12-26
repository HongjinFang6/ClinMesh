import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePolling } from '../hooks/usePolling';
import { getModel, getModelVersions, getModelVersion, deleteModelVersion, copyModel } from '../api/models';
import { ModelVersionStatus } from '../utils/constants';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { UploadModelPackage } from '../components/models/UploadModelPackage';
import { ModelSettingsModal } from '../components/models/ModelSettingsModal';

// Helper to get current user ID from JWT token
const getCurrentUserId = () => {
  const token = localStorage.getItem('access_token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub;
  } catch (e) {
    return null;
  }
};

export const ModelDetailPage = () => {
  const { modelId, versionId } = useParams();
  const navigate = useNavigate();
  const [model, setModel] = useState(null);
  const [versions, setVersions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [deletingVersionId, setDeletingVersionId] = useState(null);
  const [isCopying, setIsCopying] = useState(false);

  const shouldPoll = (data) => {
    return data?.status === ModelVersionStatus.BUILDING;
  };

  // Always call usePolling (Rules of Hooks), but return null when no versionId
  const { data: version, isLoading: versionLoading, error: versionError } = usePolling(
    () => versionId ? getModelVersion(versionId) : Promise.resolve(null),
    shouldPoll
  );

  useEffect(() => {
    if (modelId && !versionId) {
      fetchModelDetails();
    }
  }, [modelId, versionId]);

  const fetchModelDetails = async () => {
    try {
      const [modelData, versionsData] = await Promise.all([
        getModel(modelId),
        getModelVersions(null, modelId)
      ]);
      setModel(modelData);
      setVersions(versionsData);
    } catch (err) {
      console.error('Error fetching model details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVersion = async (versionId, e) => {
    e.stopPropagation(); // Prevent navigating to version details

    if (!window.confirm('Are you sure you want to delete this version? This action cannot be undone.')) {
      return;
    }

    setDeletingVersionId(versionId);
    try {
      await deleteModelVersion(versionId);
      // Refresh versions list
      const versionsData = await getModelVersions(null, modelId);
      setVersions(versionsData);
    } catch (err) {
      console.error('Error deleting version:', err);
      alert('Failed to delete version');
    } finally {
      setDeletingVersionId(null);
    }
  };

  const handleModelUpdate = (updatedModel) => {
    setModel(updatedModel);
  };

  const handleCopyModel = async () => {
    if (!window.confirm('Copy this model to your collection? All ready versions will be copied.')) {
      return;
    }

    setIsCopying(true);
    try {
      const newModel = await copyModel(modelId);
      alert('Model copied successfully!');
      navigate(`/models/${newModel.id}`);
    } catch (err) {
      console.error('Error copying model:', err);
      alert(err.response?.data?.detail || 'Failed to copy model');
    } finally {
      setIsCopying(false);
    }
  };

  // If viewing a specific version
  if (versionId) {
    if (versionLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    if (versionError) return <div>Error loading version</div>;

    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button onClick={() => navigate(`/models/${modelId}`)} variant="secondary">
            ← Back to Model
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold">Model Version {version?.version_number}</h1>
          <div className="mt-4">
            <StatusBadge status={version?.status} />
          </div>
        </div>

        {version?.status === ModelVersionStatus.BUILDING && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <p className="text-yellow-800">Building Docker image... This may take a few minutes.</p>
          </div>
        )}

        {version?.status === ModelVersionStatus.READY && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4">
            <p className="text-green-800">Model is ready for inference!</p>
          </div>
        )}

        {version?.build_logs && (
          <Card>
            <h3 className="font-semibold mb-2">Build Logs</h3>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
              {version.build_logs}
            </pre>
          </Card>
        )}

        {version?.error_message && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <p className="text-red-800">{version.error_message}</p>
          </div>
        )}
      </div>
    );
  }

  // Show upload form
  if (showUpload) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button onClick={() => setShowUpload(false)} variant="secondary">
            ← Back to Model
          </Button>
        </div>
        <h1 className="text-3xl font-bold">Upload Model Version</h1>
        <Card>
          <UploadModelPackage modelId={modelId} />
        </Card>
      </div>
    );
  }

  // Show model details and versions list
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!model) {
    return <div>Model not found</div>;
  }

  const currentUserId = getCurrentUserId();
  const isOwner = model?.owner_id === currentUserId;
  const canCopy = model?.is_public && !isOwner;

  return (
    <div className="space-y-6">
      {/* Model Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{model.name}</h1>
          <p className="text-gray-600 mt-2">{model.description || 'No description'}</p>
          {model.owner_username && (
            <div className="flex items-center text-sm text-gray-500 mt-2">
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>by {model.owner_username}</span>
            </div>
          )}
        </div>
        <div className="flex space-x-3">
          {canCopy && (
            <Button
              onClick={handleCopyModel}
              variant="secondary"
              disabled={isCopying}
            >
              {isCopying ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2 inline" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Copying...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy to My Models
                </>
              )}
            </Button>
          )}
          {isOwner && (
            <>
              <Button onClick={() => setShowSettings(true)} variant="secondary">
                <svg className="h-5 w-5 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </Button>
              <Button onClick={() => setShowUpload(true)}>
                Upload New Version
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Model Info Card */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">Model Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Visibility</p>
            <span className={`inline-block mt-1 text-xs px-2 py-1 rounded ${
              model.is_public ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {model.is_public ? 'Public' : 'Private'}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500">Created</p>
            <p className="mt-1 font-medium">{new Date(model.created_at).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Model ID</p>
            <p className="mt-1 font-mono text-xs">{model.id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Versions</p>
            <p className="mt-1 font-medium">{versions.length}</p>
          </div>
        </div>
      </Card>

      {/* Versions List */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Model Versions</h2>
        </div>

        {versions.length === 0 ? (
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
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No versions yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              {isOwner ? 'Upload your first model version to get started.' : 'This model has no versions available yet.'}
            </p>
            {isOwner && (
              <div className="mt-6">
                <Button onClick={() => setShowUpload(true)}>
                  Upload First Version
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((ver) => (
              <div
                key={ver.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors cursor-pointer"
                onClick={() => navigate(`/models/${modelId}/versions/${ver.id}`)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-semibold text-lg">Version {ver.version_number}</h3>
                      <StatusBadge status={ver.status} />
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      <p>Created: {new Date(ver.created_at).toLocaleString()}</p>
                      {ver.updated_at !== ver.created_at && (
                        <p>Updated: {new Date(ver.updated_at).toLocaleString()}</p>
                      )}
                    </div>
                    {ver.error_message && (
                      <p className="mt-2 text-sm text-red-600">{ver.error_message}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {isOwner && (
                      <button
                        onClick={(e) => handleDeleteVersion(ver.id, e)}
                        disabled={deletingVersionId === ver.id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete version"
                      >
                        {deletingVersionId === ver.id ? (
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    )}
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Settings Modal */}
      {showSettings && (
        <ModelSettingsModal
          model={model}
          onClose={() => setShowSettings(false)}
          onUpdate={handleModelUpdate}
        />
      )}
    </div>
  );
};
