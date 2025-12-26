import { useEffect, useRef, useState } from 'react';
import { POLLING_INTERVAL } from '../utils/constants';

export const usePolling = (fetchFunction, shouldPoll, interval = POLLING_INTERVAL) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await fetchFunction();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Setup polling if needed
    if (data && shouldPoll(data)) {
      intervalRef.current = setInterval(fetchData, interval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchFunction, shouldPoll, interval, data?.status]); // Add data?.status as dependency

  const refetch = async () => {
    const result = await fetchFunction();
    setData(result);
    return result;
  };

  return { data, error, isLoading, refetch };
};
