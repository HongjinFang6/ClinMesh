import { useState, useEffect } from 'react';
import { getMultipleJobs } from '../api/jobs';
import { POLLING_INTERVAL } from '../utils/constants';

export const useMultiplePolling = (jobIds) => {
  const [jobStatuses, setJobStatuses] = useState({});
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!jobIds || jobIds.length === 0) {
      setIsComplete(true);
      return;
    }

    let intervalId;

    const fetchStatuses = async () => {
      try {
        const jobs = await getMultipleJobs(jobIds);
        const statusMap = {};
        jobs.forEach(job => {
          statusMap[job.id] = job;
        });
        setJobStatuses(statusMap);

        // Check if all jobs are done (terminal state)
        const allDone = jobs.every(job =>
          job.status === 'SUCCEEDED' || job.status === 'FAILED'
        );
        setIsComplete(allDone);

        if (allDone && intervalId) {
          clearInterval(intervalId);
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch job statuses');
        if (intervalId) {
          clearInterval(intervalId);
        }
      }
    };

    // Initial fetch
    fetchStatuses();

    // Set up polling if not complete
    if (!isComplete) {
      intervalId = setInterval(fetchStatuses, POLLING_INTERVAL);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [jobIds, isComplete]);

  return { jobStatuses, isComplete, error };
};
