import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getModelVersions, getModels, getModel } from '../api/models';
import { createJob, uploadImageToPresignedUrl, runJob, createBatchJob, createMultipleJobs, uploadMultipleImages, runMultipleJobs } from '../api/jobs';
import { usePolling } from '../hooks/usePolling';
import { useMultiplePolling } from '../hooks/useMultiplePolling';
import { getJob } from '../api/jobs';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { FolderImageUpload } from '../components/jobs/FolderImageUpload';
import { OutputViewer } from '../components/jobs/OutputViewer';
import { MultiJobProgress } from '../components/jobs/MultiJobProgress';
import { MultiJobResultsViewer } from '../components/jobs/MultiJobResultsViewer';
import { StatusBadge } from '../components/common/StatusBadge';
import { JobStatus } from '../utils/constants';

export const InferencePage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const modelIdFromUrl = searchParams.get('modelId');
  const [versions, setVersions] = useState([]);
  const [models, setModels] = useState({});
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [processingMode, setProcessingMode] = useState('individual');
  const [jobName, setJobName] = useState('');
  const [jobId, setJobId] = useState(null);
  const [jobIds, setJobIds] = useState([]);
  const [step, setStep] = useState(1); // 1: select model, 2: upload image, 3: running, 4: view results
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  useEffect(() => {
    fetchReadyVersions();
  }, [modelIdFromUrl]);

  const fetchReadyVersions = async () => {
    try {
      // If modelId is provided in URL, fetch that specific model
      if (modelIdFromUrl) {
        const modelData = await getModel(modelIdFromUrl);
        setSelectedModel(modelData);

        // Fetch only versions for this model
        const versionsData = await getModelVersions('READY', modelIdFromUrl);
        setVersions(versionsData);

        // Set the model in the models map
        setModels({ [modelData.id]: modelData });

        // Auto-select first version if available
        if (versionsData.length > 0) {
          setSelectedVersionId(versionsData[0].id);
          setStep(2); // Move to upload step
        }
      } else {
        // Fetch all READY versions
        const versionsData = await getModelVersions('READY');
        setVersions(versionsData);

        // Fetch model details for each version
        // If authenticated, get user's models; otherwise get public models
        const modelsData = await getModels(!isAuthenticated);
        const modelsMap = {};
        modelsData.forEach(model => {
          modelsMap[model.id] = model;
        });
        setModels(modelsMap);
      }
    } catch (err) {
      setError('Failed to load ready models');
    }
  };

  const handleRunInference = async () => {
    if (!selectedVersionId || selectedFiles.length === 0) {
      setError('Please select a model and upload an image');
      return;
    }

    setError('');
    setWarning('');

    try {
      if (selectedFiles.length === 1) {
        // Single image mode - use existing workflow
        await handleSingleImageInference();
      } else if (processingMode === 'batch') {
        await handleBatchInference();
      } else {
        await handleIndividualInference();
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to run inference');
    }
  };

  const handleSingleImageInference = async () => {
    const { job_id, upload_url } = await createJob({
      version_id: selectedVersionId,
      name: jobName || null
    });
    await uploadImageToPresignedUrl(upload_url, selectedFiles[0]);
    await runJob(job_id);
    setJobId(job_id);
    setStep(3);
  };

  const handleBatchInference = async () => {
    try {
      // 1. Create batch job
      const { job_id, upload_urls } = await createBatchJob({
        version_id: selectedVersionId,
        image_count: selectedFiles.length,
        filenames: selectedFiles.map(f => f.name),
        name: jobName || null
      });

      // 2. Upload all images
      const uploadTasks = upload_urls.map((item) => ({
        url: item.url,
        file: selectedFiles.find(f => f.name === item.filename)
      }));
      const uploadResults = await uploadMultipleImages(uploadTasks);

      // 3. Check for failures
      const failed = uploadResults.filter(r => !r.success);
      if (failed.length === uploadResults.length) {
        throw new Error('All uploads failed');
      } else if (failed.length > 0) {
        setWarning(`${failed.length} image${failed.length > 1 ? 's' : ''} failed to upload and will be skipped`);
      }

      // 4. Run the batch job
      await runJob(job_id);

      setJobId(job_id);
      setStep(3);
    } catch (err) {
      // Fallback: Use individual jobs if batch endpoint not implemented
      if (err.response?.status === 405 || err.response?.status === 404) {
        setWarning('Batch endpoint not available. Falling back to individual jobs...');
        await handleIndividualInferenceFallback();
      } else {
        throw err;
      }
    }
  };

  const handleIndividualInference = async () => {
    try {
      // 1. Create all jobs
      const jobs = await createMultipleJobs({
        version_id: selectedVersionId,
        filenames: selectedFiles.map(f => f.name),
        name_prefix: jobName || null
      });

      // 2. Upload images
      const uploadTasks = jobs.map(job => ({
        url: job.upload_url,
        file: selectedFiles.find(f => f.name === job.filename)
      }));

      const uploadResults = await uploadMultipleImages(uploadTasks);

      // 3. Track successful uploads
      const successfulJobs = jobs.filter(job => {
        const uploadResult = uploadResults.find(r => r.filename === job.filename);
        return uploadResult && uploadResult.success;
      });

      if (successfulJobs.length === 0) {
        throw new Error('All uploads failed');
      }

      const failed = uploadResults.filter(r => !r.success);
      if (failed.length > 0) {
        setWarning(`${failed.length} image${failed.length > 1 ? 's' : ''} failed to upload and will be skipped`);
      }

      // 4. Run successful jobs
      await runMultipleJobs(successfulJobs.map(j => j.job_id));

      setJobIds(jobs.map(j => j.job_id));
      setStep(3);
    } catch (err) {
      // Fallback: Use existing single job endpoint for each image
      if (err.response?.status === 405 || err.response?.status === 404) {
        setWarning('Multiple jobs endpoint not available. Using legacy method...');
        await handleIndividualInferenceFallback();
      } else {
        throw err;
      }
    }
  };

  const handleIndividualInferenceFallback = async () => {
    // Use existing createJob endpoint for each file
    const createdJobs = [];

    for (const file of selectedFiles) {
      try {
        // Auto-generate job name
        const base_name = file.name.split('.').slice(0, -1).join('.') || file.name;
        const job_name = jobName ? `${jobName} - ${base_name}` : base_name;

        // Create individual job
        const { job_id, upload_url } = await createJob({
          version_id: selectedVersionId,
          name: job_name
        });

        // Upload image
        await uploadImageToPresignedUrl(upload_url, file);

        // Run job
        await runJob(job_id);

        createdJobs.push({ id: job_id, filename: file.name });
      } catch (err) {
        setWarning(prev => `${prev}\nFailed to process ${file.name}`);
      }
    }

    if (createdJobs.length === 0) {
      throw new Error('All jobs failed to create');
    }

    setJobIds(createdJobs.map(j => j.id));
    setStep(3);
  };

  const shouldPoll = (data) => {
    return data?.status === JobStatus.QUEUED || data?.status === JobStatus.RUNNING;
  };

  // Always call usePolling hook (never conditionally) to comply with Rules of Hooks
  const { data: job } = usePolling(
    () => jobId ? getJob(jobId) : Promise.resolve(null),
    shouldPoll
  );

  // Use multiple polling for individual mode
  const { jobStatuses, isComplete: multiJobsComplete } = useMultiplePolling(
    jobIds.length > 0 ? jobIds : null
  );

  // Automatically move to results when job succeeds (single/batch mode)
  useEffect(() => {
    if (job?.status === JobStatus.SUCCEEDED && step === 3) {
      setStep(4);
    }
  }, [job?.status, step]);

  // Automatically move to results when all jobs complete (individual mode)
  useEffect(() => {
    if (jobIds.length > 0 && multiJobsComplete && step === 3) {
      setStep(4);
    }
  }, [jobIds.length, multiJobsComplete, step]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Run Inference</h1>

      {/* Sign-in reminder for non-authenticated users */}
      {!isAuthenticated && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                You can use models without signing in, but{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="font-medium underline hover:text-blue-800"
                >
                  sign in
                </button>
                {' '}to save your analysis history and track your jobs.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step indicators */}
      <div className="flex items-center justify-center space-x-4">
        <div className={`px-4 py-2 rounded-lg ${step >= 1 ? 'bg-primary-500 text-white' : 'bg-gray-200'}`}>
          1. Select Model
        </div>
        <div className={`px-4 py-2 rounded-lg ${step >= 2 ? 'bg-primary-500 text-white' : 'bg-gray-200'}`}>
          2. Upload Image
        </div>
        <div className={`px-4 py-2 rounded-lg ${step >= 3 ? 'bg-primary-500 text-white' : 'bg-gray-200'}`}>
          3. Running
        </div>
        <div className={`px-4 py-2 rounded-lg ${step >= 4 ? 'bg-primary-500 text-white' : 'bg-gray-200'}`}>
          4. Results
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      {warning && (
        <div className="bg-yellow-50 text-yellow-700 px-4 py-2 rounded-lg">
          {warning}
        </div>
      )}

      {step === 1 && (
        <Card>
          <h2 className="text-xl font-semibold mb-4">
            {selectedModel ? `Using Model: ${selectedModel.name}` : 'Select Model Version'}
          </h2>

          {selectedModel && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>{selectedModel.name}</strong>
                {selectedModel.description && ` - ${selectedModel.description}`}
              </p>
              {selectedModel.owner_username && (
                <p className="text-xs text-blue-600 mt-1">
                  by {selectedModel.owner_username}
                </p>
              )}
            </div>
          )}

          {versions.length === 0 ? (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <p className="text-yellow-800">
                {selectedModel
                  ? `No ready versions found for ${selectedModel.name}. The model owner needs to upload a version first.`
                  : 'No ready models found. Please upload and build a model first.'}
              </p>
            </div>
          ) : (
            <>
              <select
                value={selectedVersionId}
                onChange={(e) => setSelectedVersionId(e.target.value)}
                className="input mb-4"
              >
                <option value="">Choose a model version...</option>
                {versions
                  .filter(version => {
                    const model = models[version.model_id];
                    return model && model.name; // Only show versions with valid parent models
                  })
                  .map(version => {
                    const model = models[version.model_id];
                    return (
                      <option key={version.id} value={version.id}>
                        {model.name} - Version {version.version_number}
                      </option>
                    );
                  })}
              </select>
              <Button onClick={() => setStep(2)} disabled={!selectedVersionId}>
                Next: Upload Image
              </Button>
            </>
          )}
        </Card>
      )}

      {step === 2 && (
        <Card>
          <h2 className="text-xl font-semibold mb-4">Upload Input Image(s)</h2>
          <FolderImageUpload
            onFilesSelect={setSelectedFiles}
            onProcessingModeChange={setProcessingMode}
            onJobNameChange={setJobName}
          />

          {/* Info banner about processing mode */}
          {selectedFiles.length > 1 && (
            <div className="mt-4 bg-blue-50 border-l-4 border-blue-400 p-4">
              <p className="text-blue-800">
                {processingMode === 'batch'
                  ? `All ${selectedFiles.length} images will be processed in a single batch job`
                  : `${selectedFiles.length} separate jobs will be created, one per image`
                }
              </p>
            </div>
          )}

          <div className="mt-4 flex space-x-4">
            <Button onClick={() => setStep(1)} variant="secondary">
              Back
            </Button>
            <Button onClick={handleRunInference} disabled={selectedFiles.length === 0}>
              Run Inference
            </Button>
          </div>
        </Card>
      )}

      {step >= 3 && (jobIds.length > 0 ? Object.keys(jobStatuses).length > 0 : job) && (
        <Card>
          <div className="space-y-4">
            {/* Individual mode - multiple jobs */}
            {jobIds.length > 0 && Object.keys(jobStatuses).length > 0 ? (
              <>
                <h2 className="text-xl font-semibold">Inference Jobs ({jobIds.length} jobs)</h2>

                {step === 3 && (
                  <div>
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                      <p className="text-yellow-800">Processing your images... This may take a moment.</p>
                    </div>
                    <MultiJobProgress jobStatuses={jobStatuses} />
                  </div>
                )}

                {step === 4 && (
                  <MultiJobResultsViewer
                    jobStatuses={jobStatuses}
                    onRetryJobs={null}
                  />
                )}
              </>
            ) : (
              /* Single/Batch mode - single job */
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    {selectedFiles.length > 1 ? `Batch Inference Job (${selectedFiles.length} images)` : 'Inference Job'}
                  </h2>
                  <StatusBadge status={job.status} />
                </div>

                {(job.status === JobStatus.QUEUED || job.status === JobStatus.RUNNING) && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <p className="text-yellow-800">
                      {selectedFiles.length > 1
                        ? `Processing batch of ${selectedFiles.length} images... This may take a moment.`
                        : 'Processing your image... This may take a moment.'
                      }
                    </p>
                  </div>
                )}

                {job.status === JobStatus.FAILED && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4">
                    <p className="text-red-800">{job.error_message || 'Inference failed'}</p>
                  </div>
                )}

                {job.status === JobStatus.SUCCEEDED && (
                  <OutputViewer jobId={jobId} jobStatus={job.status} />
                )}
              </>
            )}

            <Button
              onClick={() => {
                setStep(1);
                setJobId(null);
                setJobIds([]);
                setSelectedFiles([]);
                setSelectedVersionId('');
                setProcessingMode('individual');
                setJobName('');
                setError('');
                setWarning('');
              }}
              variant="secondary"
            >
              Run Another Inference
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
