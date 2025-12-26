import React, { useEffect, useState } from 'react';
import { getJobOutputs } from '../../api/jobs';
import { LoadingSpinner } from '../common/LoadingSpinner';

export const OutputViewer = ({ jobId, jobStatus }) => {
  const [outputs, setOutputs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (jobStatus === 'SUCCEEDED') {
      fetchOutputs();
    }
  }, [jobId, jobStatus]);

  const fetchOutputs = async () => {
    try {
      const data = await getJobOutputs(jobId);
      setOutputs(data.output_urls);
    } catch (err) {
      setError('Failed to load outputs');
    } finally {
      setIsLoading(false);
    }
  };

  if (jobStatus !== 'SUCCEEDED') {
    return <p className="text-gray-600">Job must complete successfully to view outputs</p>;
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Output Images</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {outputs.map((url, index) => (
          <div key={index} className="border rounded-lg p-4">
            <img src={url} alt={`Output ${index + 1}`} className="w-full h-auto rounded" />
            <a
              href={url}
              download
              className="mt-2 inline-block text-primary-500 hover:underline"
            >
              Download
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};
