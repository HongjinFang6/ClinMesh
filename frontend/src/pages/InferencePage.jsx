import React, { useState, useEffect } from 'react';
import { getModelVersions, getModels } from '../api/models';
import { createJob, uploadImageToPresignedUrl, runJob } from '../api/jobs';
import { usePolling } from '../hooks/usePolling';
import { getJob } from '../api/jobs';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ImageUpload } from '../components/jobs/ImageUpload';
import { OutputViewer } from '../components/jobs/OutputViewer';
import { StatusBadge } from '../components/common/StatusBadge';
import { JobStatus } from '../utils/constants';

export const InferencePage = () => {
  const [versions, setVersions] = useState([]);
  const [models, setModels] = useState({});
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [step, setStep] = useState(1); // 1: select model, 2: upload image, 3: running, 4: view results
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReadyVersions();
  }, []);

  const fetchReadyVersions = async () => {
    try {
      // Fetch all READY versions
      const versionsData = await getModelVersions('READY');
      setVersions(versionsData);

      // Fetch model details for each version
      const modelsData = await getModels();
      const modelsMap = {};
      modelsData.forEach(model => {
        modelsMap[model.id] = model;
      });
      setModels(modelsMap);
    } catch (err) {
      setError('Failed to load ready models');
    }
  };

  const handleRunInference = async () => {
    if (!selectedVersionId || !selectedFile) {
      setError('Please select a model and upload an image');
      return;
    }

    setError('');
    try {
      // Step 1: Create job and get upload URL
      const { job_id, upload_url } = await createJob({ version_id: selectedVersionId });

      // Step 2: Upload image
      await uploadImageToPresignedUrl(upload_url, selectedFile);

      // Step 3: Run inference
      await runJob(job_id);

      setJobId(job_id);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to run inference');
    }
  };

  const shouldPoll = (data) => {
    return data?.status === JobStatus.QUEUED || data?.status === JobStatus.RUNNING;
  };

  // Always call usePolling hook (never conditionally) to comply with Rules of Hooks
  const { data: job } = usePolling(
    () => jobId ? getJob(jobId) : Promise.resolve(null),
    shouldPoll
  );

  // Automatically move to results when job succeeds
  useEffect(() => {
    if (job?.status === JobStatus.SUCCEEDED && step === 3) {
      setStep(4);
    }
  }, [job?.status, step]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Run Inference</h1>

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

      {step === 1 && (
        <Card>
          <h2 className="text-xl font-semibold mb-4">Select Model Version</h2>
          {versions.length === 0 ? (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <p className="text-yellow-800">
                No ready models found. Please upload and build a model first.
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
                        {model.name} - {version.version_number}
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
          <h2 className="text-xl font-semibold mb-4">Upload Input Image</h2>
          <ImageUpload onFileSelect={setSelectedFile} />
          <div className="mt-4 flex space-x-4">
            <Button onClick={() => setStep(1)} variant="secondary">
              Back
            </Button>
            <Button onClick={handleRunInference} disabled={!selectedFile}>
              Run Inference
            </Button>
          </div>
        </Card>
      )}

      {step >= 3 && job && (
        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Inference Job</h2>
              <StatusBadge status={job.status} />
            </div>

            {(job.status === JobStatus.QUEUED || job.status === JobStatus.RUNNING) && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <p className="text-yellow-800">Processing your image... This may take a moment.</p>
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

            <Button
              onClick={() => {
                setStep(1);
                setJobId(null);
                setSelectedFile(null);
                setSelectedVersionId('');
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
