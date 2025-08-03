'use client';

import React, { useState, useEffect, useCallback } from 'react';
import path from 'path';
import { AtlantaParameters, StatusResponse, FileInfo } from '@/types';
import { useAtlanta } from '@/hooks';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface AtlantaRunnerProps {
  selectedFile?: string;
  onExecute?: (params: AtlantaParameters) => void;
  onComplete?: (result: StatusResponse) => void;
}

interface FormErrors {
  [key: string]: string;
}

interface BenchFile {
  name: string;
  path: string;
  size: number;
  directory: string;
}

export default function AtlantaRunner({ 
  selectedFile,
  onExecute,
  onComplete
}: AtlantaRunnerProps) {
  const { executeAtalanta, getJobStatus, cancelJob, isExecuting, currentJobId, error } = useAtlanta();
  const { currentWorkspace } = useWorkspace();
  
  // File selection state
  const [availableFiles, setAvailableFiles] = useState<BenchFile[]>([]);
  const [currentFile, setCurrentFile] = useState<string>(selectedFile || '');
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<string>('default');
  
  // Form state with actual Atalanta defaults
  const [parameters, setParameters] = useState<AtlantaParameters>({
    diagnosticMode: 'none',
    backtrackLimit: 10,
    backtrackLimit2: 0, // Default is 0 (phase 2 disabled)
    useHope: false,
    staticLearning: false,
    compactionLimit: 2,
    noCompaction: false,
    randomPatternLimit: 16,
    randomSeed: 0, // 0 means use current time
    unspecifiedInputs: 'R', // Default is random
    singlePatternMode: false,
    outputAbortedFaults: false,
    includeRedundantFaults: false
  });
  
  const [outputDirectory, setOutputDirectory] = useState('./output');
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [jobStatus, setJobStatus] = useState<StatusResponse | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Load available .bench files
  useEffect(() => {
    const loadBenchFiles = async () => {
      if (!currentWorkspace) {
        setAvailableFiles([]);
        setIsLoadingFiles(false);
        return;
      }

      try {
        setIsLoadingFiles(true);
        const response = await fetch(`/api/atalanta/files?workspace=${encodeURIComponent(currentWorkspace)}`);
        if (response.ok) {
          const data = await response.json();
          setAvailableFiles(data.files);
        } else {
          console.error('Failed to load .bench files:', response.statusText);
          setAvailableFiles([]);
        }
      } catch (err) {
        console.error('Failed to load .bench files:', err);
        setAvailableFiles([]);
      } finally {
        setIsLoadingFiles(false);
      }
    };
    
    loadBenchFiles();
  }, [currentWorkspace]);

  // Update current file when selectedFile prop changes
  useEffect(() => {
    if (selectedFile) {
      setCurrentFile(selectedFile);
    }
  }, [selectedFile]);

  // Polling for job status
  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const status = await getJobStatus(jobId);
      setJobStatus(status);
      
      if (status.status === 'completed' || status.status === 'failed') {
        setIsPolling(false);
        if (onComplete) {
          onComplete(status);
        }
      }
    } catch (err) {
      console.error('Failed to poll job status:', err);
      setIsPolling(false);
    }
  }, [getJobStatus, onComplete]);

  // Start polling when job is created
  useEffect(() => {
    if (currentJobId && isPolling) {
      const interval = setInterval(() => {
        pollJobStatus(currentJobId);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [currentJobId, isPolling, pollJobStatus]);

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    
    if (!currentFile) {
      errors.file = 'Please select a .bench file';
    }
    
    if (!outputDirectory.trim()) {
      errors.outputDirectory = 'Output directory is required';
    }
    
    if (parameters.diagnosticMode === 'limited' && (!parameters.diagnosticLimit || parameters.diagnosticLimit < 1)) {
      errors.diagnosticLimit = 'Diagnostic limit must be a positive number';
    }
    
    if (parameters.backtrackLimit !== undefined && (parameters.backtrackLimit < 0 || parameters.backtrackLimit > 1000000)) {
      errors.backtrackLimit = 'Must be between 0 and 1,000,000';
    }
    
    if (parameters.backtrackLimit2 !== undefined && (parameters.backtrackLimit2 < 0 || parameters.backtrackLimit2 > 1000000)) {
      errors.backtrackLimit2 = 'Must be between 0 and 1,000,000';
    }
    
    if (parameters.randomSeed !== undefined && (parameters.randomSeed < 0 || parameters.randomSeed > 2147483647)) {
      errors.randomSeed = 'Must be between 0 and 2,147,483,647';
    }
    
    if (parameters.faultFile && !parameters.faultFile.trim()) {
      errors.faultFile = 'Fault file path cannot be empty';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleExecute = async () => {
    if (!validateForm() || !currentFile || !currentWorkspace) return;
    
    try {
      if (onExecute) {
        onExecute(parameters);
      }
      
      // Create full path to the selected file
      const fullInputPath = path.resolve(currentWorkspace, currentFile);
      const fullOutputPath = path.resolve(currentWorkspace, outputDirectory);
      
      const jobId = await executeAtalanta(fullInputPath, fullOutputPath, parameters);
      if (jobId) {
        setIsPolling(true);
        setJobStatus({ status: 'running', progress: 0, output: '' });
      }
    } catch (err) {
      console.error('Execution failed:', err);
    }
  };

  const handleCancel = async () => {
    if (currentJobId) {
      try {
        await cancelJob(currentJobId);
        setIsPolling(false);
        setJobStatus(null);
      } catch (err) {
        console.error('Failed to cancel job:', err);
      }
    }
  };

  const handleQuickRun = (preset: 'default' | 'diagnostic' | 'fast' | 'thorough') => {
    setSelectedPreset(preset);
    const presets = {
      default: {
        diagnosticMode: 'none' as const,
        backtrackLimit: 10,
        backtrackLimit2: 0,
        useHope: false,
        staticLearning: false,
        compactionLimit: 2,
        noCompaction: false,
        randomPatternLimit: 16,
        randomSeed: 0,
        unspecifiedInputs: 'R' as const,
        singlePatternMode: false
      },
      diagnostic: {
        diagnosticMode: 'all' as const,
        backtrackLimit: 10,
        backtrackLimit2: 0,
        useHope: true, // Use 3-value logic for diagnostics
        staticLearning: false,
        compactionLimit: 0, // No compaction in diagnostic mode
        noCompaction: true,
        randomPatternLimit: 0, // No random patterns
        randomSeed: 0,
        unspecifiedInputs: 'X' as const, // Leave unspecified as X
        singlePatternMode: false
      },
      fast: {
        diagnosticMode: 'none' as const,
        backtrackLimit: 5,
        backtrackLimit2: 0,
        useHope: false,
        staticLearning: false,
        compactionLimit: 0, // No compaction for speed
        noCompaction: true,
        randomPatternLimit: 8, // Fewer random patterns
        randomSeed: 0,
        unspecifiedInputs: '0' as const, // Fill with 0 for speed
        singlePatternMode: false
      },
      thorough: {
        diagnosticMode: 'none' as const,
        backtrackLimit: 100,
        backtrackLimit2: 50, // Enable phase 2
        useHope: false,
        staticLearning: true, // Enable learning
        compactionLimit: 5, // More compaction
        noCompaction: false,
        randomPatternLimit: 32, // More random patterns
        randomSeed: 0,
        unspecifiedInputs: 'R' as const,
        singlePatternMode: false
      }
    };
    
    setParameters(presets[preset]);
  };

  const updateParameter = (key: keyof AtlantaParameters, value: string | number | boolean | undefined) => {
    setParameters(prev => ({ ...prev, [key]: value }));
    // Clear error for this field
    if (formErrors[key]) {
      setFormErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  return (
    <div className="h-full bg-gray-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex-shrink-0">
        <h3 className="text-sm font-medium text-gray-300 mb-2 truncate">Atalanta Test Pattern Generator</h3>
        <div className="text-xs text-gray-400 truncate">
          Automatic test pattern generator for stuck-at faults
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
        {/* File Selection */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-300">Circuit File (.bench)</label>
          <div className="relative">
            <select
              value={currentFile}
              onChange={(e) => setCurrentFile(e.target.value)}
              disabled={isLoadingFiles || !currentWorkspace}
              className="w-full px-3 py-2 text-xs bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ maxWidth: '100%' }}
            >
              <option value="">
                {!currentWorkspace ? 'No workspace selected' :
                 isLoadingFiles ? 'Loading .bench files...' : 
                 availableFiles.length === 0 ? 'No .bench files found' :
                 'Select a .bench file...'}
              </option>
              {availableFiles.map((file) => (
                <option key={file.path} value={file.path} title={file.path}>
                  {file.directory === '.' ? file.name : `${file.directory}/${file.name}`}
                </option>
              ))}
            </select>
          </div>
          
          {/* File Info Display */}
          {currentFile && (
            <div className="p-2 bg-gray-900 border border-gray-600 rounded text-xs">
              <div className="text-gray-300 font-medium truncate" title={currentFile}>
                Selected: {currentFile}
              </div>
              {availableFiles.find(f => f.path === currentFile) && (
                <div className="text-gray-400 mt-1">
                  Size: {(availableFiles.find(f => f.path === currentFile)!.size / 1024).toFixed(1)} KB
                </div>
              )}
            </div>
          )}
          
          {/* Files Count */}
          <div className="text-xs text-gray-500">
            {!currentWorkspace ? 'Select a workspace to see .bench files' :
             isLoadingFiles ? 'Loading...' : 
             `${availableFiles.length} .bench files available`}
          </div>
          
          {formErrors.file && (
            <div className="text-xs text-red-400">{formErrors.file}</div>
          )}
        </div>

        {/* Quick Run Buttons */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-300">Quick Presets</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickRun('default')}
              disabled={!currentFile || isExecuting}
              className={`px-3 py-2 text-xs rounded transition-colors ${
                selectedPreset === 'default'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
              } disabled:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-500`}
            >
              Default
            </button>
            <button
              onClick={() => handleQuickRun('diagnostic')}
              disabled={!currentFile || isExecuting}
              className={`px-3 py-2 text-xs rounded transition-colors ${
                selectedPreset === 'diagnostic'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
              } disabled:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-500`}
            >
              Diagnostic
            </button>
            <button
              onClick={() => handleQuickRun('fast')}
              disabled={!currentFile || isExecuting}
              className={`px-3 py-2 text-xs rounded transition-colors ${
                selectedPreset === 'fast'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
              } disabled:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-500`}
            >
              Fast
            </button>
            <button
              onClick={() => handleQuickRun('thorough')}
              disabled={!currentFile || isExecuting}
              className={`px-3 py-2 text-xs rounded transition-colors ${
                selectedPreset === 'thorough'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
              } disabled:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-500`}
            >
              Thorough
            </button>
          </div>
        </div>

        {/* Output Directory */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-300">Output Directory</label>
          <input
            type="text"
            value={outputDirectory}
            onChange={(e) => setOutputDirectory(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            placeholder="./output"
          />
          {formErrors.outputDirectory && (
            <div className="text-xs text-red-400">{formErrors.outputDirectory}</div>
          )}
        </div>

        {/* Test Generation Mode */}
        <div className="space-y-3">
          <label className="text-xs font-medium text-gray-300">Test Generation Mode</label>
          
          <div>
            <label className="text-xs text-gray-400">Mode</label>
            <select
              value={parameters.diagnosticMode || 'none'}
              onChange={(e) => updateParameter('diagnosticMode', e.target.value as 'none' | 'all' | 'limited')}
              className="w-full px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="none">Normal Test Generation</option>
              <option value="all">Diagnostic Mode (All patterns per fault)</option>
              <option value="limited">Diagnostic Mode (Limited patterns per fault)</option>
            </select>
          </div>

          {parameters.diagnosticMode === 'limited' && (
            <div>
              <label className="text-xs text-gray-400">Patterns per Fault</label>
              <input
                type="number"
                value={parameters.diagnosticLimit || ''}
                onChange={(e) => updateParameter('diagnosticLimit', parseInt(e.target.value) || undefined)}
                className="w-full px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                min="1"
                placeholder="Number of patterns per fault"
              />
              {formErrors.diagnosticLimit && (
                <div className="text-xs text-red-400">{formErrors.diagnosticLimit}</div>
              )}
            </div>
          )}
        </div>

        {/* Backtracking Parameters */}
        <div className="space-y-3">
          <label className="text-xs font-medium text-gray-300">Backtracking Limits</label>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">Phase 1 (-b)</label>
              <input
                type="number"
                value={parameters.backtrackLimit || ''}
                onChange={(e) => updateParameter('backtrackLimit', parseInt(e.target.value) || undefined)}
                className="w-full px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                min="0"
                max="1000000"
                placeholder="10"
              />
              {formErrors.backtrackLimit && (
                <div className="text-xs text-red-400">{formErrors.backtrackLimit}</div>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-400">Phase 2 (-B)</label>
              <input
                type="number"
                value={parameters.backtrackLimit2 || ''}
                onChange={(e) => updateParameter('backtrackLimit2', parseInt(e.target.value) || undefined)}
                className="w-full px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                min="0"
                max="1000000"
                placeholder="0 (disabled)"
              />
              {formErrors.backtrackLimit2 && (
                <div className="text-xs text-red-400">{formErrors.backtrackLimit2}</div>
              )}
            </div>
          </div>
        </div>

        {/* Fault Handling */}
        <div className="space-y-3">
          <label className="text-xs font-medium text-gray-300">Fault Handling</label>
          
          <div>
            <label className="text-xs text-gray-400">Fault List File (optional)</label>
            <input
              type="text"
              value={parameters.faultFile || ''}
              onChange={(e) => updateParameter('faultFile', e.target.value)}
              className="w-full px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
              placeholder="Path to fault list file"
            />
            {formErrors.faultFile && (
              <div className="text-xs text-red-400">{formErrors.faultFile}</div>
            )}
          </div>
        </div>

        {/* Simulation Options */}
        <div className="space-y-3">
          <label className="text-xs font-medium text-gray-300">Simulation Options</label>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="useHope"
              checked={parameters.useHope || false}
              onChange={(e) => updateParameter('useHope', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="useHope" className="text-xs text-gray-400">Use HOPE (3-value logic)</label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="staticLearning"
              checked={parameters.staticLearning || false}
              onChange={(e) => updateParameter('staticLearning', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="staticLearning" className="text-xs text-gray-400">Enable static learning</label>
          </div>
        </div>

        {/* Test Compaction */}
        <div className="space-y-3">
          <label className="text-xs font-medium text-gray-300">Test Compaction</label>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="noCompaction"
              checked={parameters.noCompaction || false}
              onChange={(e) => updateParameter('noCompaction', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="noCompaction" className="text-xs text-gray-400">Disable compaction (-N)</label>
          </div>

          {!parameters.noCompaction && (
            <div>
              <label className="text-xs text-gray-400">Compaction Limit (-c)</label>
              <input
                type="number"
                value={parameters.compactionLimit || ''}
                onChange={(e) => updateParameter('compactionLimit', parseInt(e.target.value) || undefined)}
                className="w-full px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                min="0"
                placeholder="2"
              />
            </div>
          )}
        </div>

        {/* Random Pattern Testing */}
        <div className="space-y-3">
          <label className="text-xs font-medium text-gray-300">Random Pattern Testing</label>
          
          <div>
            <label className="text-xs text-gray-400">RPT Limit (-r)</label>
            <input
              type="number"
              value={parameters.randomPatternLimit || ''}
              onChange={(e) => updateParameter('randomPatternLimit', parseInt(e.target.value) || undefined)}
              className="w-full px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
              min="0"
              placeholder="16"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400">Random Seed (-s)</label>
            <input
              type="number"
              value={parameters.randomSeed || ''}
              onChange={(e) => updateParameter('randomSeed', parseInt(e.target.value) || undefined)}
              className="w-full px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
              min="0"
              max="2147483647"
              placeholder="0 (use current time)"
            />
            {formErrors.randomSeed && (
              <div className="text-xs text-red-400">{formErrors.randomSeed}</div>
            )}
          </div>
        </div>

        {/* Unspecified Input Handling */}
        <div className="space-y-3">
          <label className="text-xs font-medium text-gray-300">Unspecified Input Handling</label>
          
          <div>
            <select
              value={parameters.unspecifiedInputs || 'R'}
              onChange={(e) => updateParameter('unspecifiedInputs', e.target.value as '0' | '1' | 'X' | 'R')}
              className="w-full px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="0">Set to 0</option>
              <option value="1">Set to 1</option>
              <option value="X">Leave as X (unknown)</option>
              <option value="R">Random (default)</option>
            </select>
          </div>
        </div>

        {/* Advanced Options */}
        <div className="space-y-3">
          <label className="text-xs font-medium text-gray-300">Advanced Options</label>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="singlePatternMode"
              checked={parameters.singlePatternMode || false}
              onChange={(e) => updateParameter('singlePatternMode', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="singlePatternMode" className="text-xs text-gray-400">Single pattern per fault (-Z)</label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="outputAbortedFaults"
              checked={parameters.outputAbortedFaults || false}
              onChange={(e) => updateParameter('outputAbortedFaults', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="outputAbortedFaults" className="text-xs text-gray-400">Output aborted faults (-u)</label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="includeRedundantFaults"
              checked={parameters.includeRedundantFaults || false}
              onChange={(e) => updateParameter('includeRedundantFaults', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="includeRedundantFaults" className="text-xs text-gray-400">Include redundant faults (-v)</label>
          </div>
        </div>

        {/* Execution Controls */}
        <div className="space-y-3 pt-4 border-t border-gray-700">
          {!isExecuting && !jobStatus ? (
            <button
              onClick={handleExecute}
              disabled={!currentFile || !currentWorkspace}
              className="w-full px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors"
            >
              {!currentWorkspace ? 'Select a workspace first' :
               !currentFile ? 'Select a circuit file first' : 
               'Execute Atalanta'}
            </button>
          ) : (
            <button
              onClick={handleCancel}
              className="w-full px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
            >
              Cancel Execution
            </button>
          )}

          {/* Progress Indicator */}
          {jobStatus && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Status: {jobStatus.status}</span>
                <span>{jobStatus.progress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    jobStatus.status === 'completed' ? 'bg-green-600' :
                    jobStatus.status === 'failed' ? 'bg-red-600' : 'bg-blue-600'
                  }`}
                  style={{ width: `${jobStatus.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Display */}
          {(error || jobStatus?.error) && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded">
              <div className="text-xs text-red-300">
                {error || jobStatus?.error}
              </div>
            </div>
          )}

          {/* Output Preview */}
          {jobStatus?.output && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-300">Output</label>
              <div className="p-3 bg-gray-900 border border-gray-600 rounded text-xs text-gray-300 font-mono max-h-32 overflow-y-auto">
                <pre className="whitespace-pre-wrap">{jobStatus.output}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}