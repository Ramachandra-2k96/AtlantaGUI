'use client';

import { useState, useCallback } from 'react';
import { AtlantaParameters, ExecuteResponse } from '@/types';

export default function useAtlanta() {
  const [jobs] = useState<Map<string, ExecuteResponse>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeAtlanta = useCallback(async (
    inputFile: string, 
    parameters: AtlantaParameters, 
    outputDirectory: string = '/workspace'
  ) => {
    setLoading(true);
    setError(null);
    try {
      console.log('Executing Atalanta with:', { inputFile, parameters, outputDirectory });
      // Placeholder for API call
      // const response = await fetch('/api/atalanta/execute', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ inputFile, parameters, outputDirectory })
      // });
      // const result: ExecuteResponse = await response.json();
      // setJobs(prev => new Map(prev.set(result.jobId, result)));
      // return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute Atalanta');
    } finally {
      setLoading(false);
    }
  }, []);

  const getJobStatus = useCallback(async (jobId: string) => {
    try {
      console.log('Getting status for job:', jobId);
      // Placeholder for API call
      // const response = await fetch(`/api/atalanta/status/${jobId}`);
      // const status: StatusResponse = await response.json();
      // return status;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get job status');
    }
  }, []);

  const cancelJob = useCallback(async (jobId: string) => {
    try {
      console.log('Cancelling job:', jobId);
      // Placeholder for job cancellation
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel job');
    }
  }, []);

  return {
    jobs: Array.from(jobs.values()),
    loading,
    error,
    executeAtlanta,
    getJobStatus,
    cancelJob
  };
}