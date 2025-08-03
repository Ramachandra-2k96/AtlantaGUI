import { useState, useCallback, useRef } from 'react';
import { ExecuteRequest, ExecuteResponse, StatusResponse, AtlantaParameters } from '@/types';

interface UseAtlantaReturn {
  executeAtalanta: (inputFile: string, outputDirectory: string, parameters?: AtlantaParameters) => Promise<string>;
  getJobStatus: (jobId: string) => Promise<StatusResponse>;
  cancelJob: (jobId: string) => Promise<void>;
  isExecuting: boolean;
  currentJobId: string | null;
  error: string | null;
}

export function useAtlanta(): UseAtlantaReturn {
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const executeAtalanta = useCallback(async (
    inputFile: string,
    outputDirectory: string,
    parameters: AtlantaParameters = {}
  ): Promise<string> => {
    try {
      setIsExecuting(true);
      setError(null);
      
      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      
      const request: ExecuteRequest = {
        inputFile,
        outputDirectory,
        parameters
      };
      
      const response = await fetch('/api/atalanta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute Atalanta');
      }
      
      const result: ExecuteResponse = await response.json();
      setCurrentJobId(result.jobId);
      
      return result.jobId;
      
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, don't set error
        return '';
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsExecuting(false);
    }
  }, []);

  const getJobStatus = useCallback(async (jobId: string): Promise<StatusResponse> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/atalanta?jobId=${encodeURIComponent(jobId)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get job status');
      }
      
      const status: StatusResponse = await response.json();
      return status;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const cancelJob = useCallback(async (jobId: string): Promise<void> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/atalanta?jobId=${encodeURIComponent(jobId)}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel job');
      }
      
      // Clear current job if it was cancelled
      if (currentJobId === jobId) {
        setCurrentJobId(null);
        setIsExecuting(false);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentJobId]);

  return {
    executeAtalanta,
    getJobStatus,
    cancelJob,
    isExecuting,
    currentJobId,
    error
  };
}