import { useEffect, useRef, useState, useCallback } from 'react';
import { POLLING_INTERVAL } from '../utils/constants';

export const usePolling = (fetchFunction, shouldPoll, interval = POLLING_INTERVAL) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);
  const dataRef = useRef(null);
  const isFetchingRef = useRef(false);
  const blockedUntilRef = useRef(0);

  // Stable reference to fetch function
  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return;
    if (Date.now() < blockedUntilRef.current) return;
    isFetchingRef.current = true;
    try {
      const result = await fetchFunction();
      if (mountedRef.current) {
        setData(result);
        dataRef.current = result;
        setError(null);
        setIsLoading(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        if (err?.response?.status === 429) {
          const retryAfterHeader = err.response?.headers?.['retry-after'];
          const retryAfterSeconds = Number(retryAfterHeader ?? err.response?.data?.retry_after ?? 0);
          const delayMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
            ? retryAfterSeconds * 1000
            : interval;
          blockedUntilRef.current = Date.now() + delayMs;
          if (!dataRef.current) {
            setError(err);
            setIsLoading(false);
          }
          return;
        }

        setError(err);
        setIsLoading(false);
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [fetchFunction, interval]);

  useEffect(() => {
    mountedRef.current = true;

    // Initial fetch
    fetchData();

    // Cleanup
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchData]);

  // Separate effect for polling logic
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Setup polling if data exists and should poll
    if (data && shouldPoll(data)) {
      intervalRef.current = setInterval(fetchData, interval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [data, shouldPoll, interval, fetchData]);

  const refetch = async () => {
    blockedUntilRef.current = 0;
    const result = await fetchFunction();
    if (mountedRef.current) {
      setData(result);
      dataRef.current = result;
    }
    return result;
  };

  return { data, error, isLoading, refetch };
};
