// File System Types
export interface FileInfo {
  name: string;
  path: string;
  size: number;
  modified: string;
  type: 'file';
  extension: string;
}

export interface DirectoryInfo {
  name: string;
  path: string;
  type: 'directory';
  children?: (FileInfo | DirectoryInfo)[];
}

// Atalanta Types
export interface AtlantaParameters {
  // Test generation modes
  diagnosticMode?: 'none' | 'all' | 'limited';
  diagnosticLimit?: number; // for -D n option
  
  // Backtracking limits
  backtrackLimit?: number; // -b n (phase 1)
  backtrackLimit2?: number; // -B n (phase 2)
  
  // Fault handling
  faultFile?: string; // -f fn
  
  // Simulation mode
  useHope?: boolean; // -H (3-value logic vs 2-value)
  
  // Logging
  logFile?: string; // -l fn
  staticLearning?: boolean; // -L
  
  // Test compaction
  compactionLimit?: number; // -c n
  noCompaction?: boolean; // -N
  
  // Random pattern testing
  randomPatternLimit?: number; // -r n
  
  // Random seed
  randomSeed?: number; // -s n
  
  // Output file
  testFile?: string; // -t fn
  
  // Fault output options
  outputAbortedFaults?: boolean; // -u
  abortedFaultsFile?: string; // -U fn
  includeRedundantFaults?: boolean; // -v
  
  // Single pattern mode
  singlePatternMode?: boolean; // -Z
  
  // Unspecified input handling
  unspecifiedInputs?: '0' | '1' | 'X' | 'R'; // -0, -1, -X, -R
}

export interface AtlantaResult {
  inputFile: string;
  outputFiles: {
    test?: string;
    vec?: string;
    log?: string;
  };
  statistics: {
    gates: number;
    inputs: number;
    outputs: number;
    faults: number;
    detected: number;
    coverage: number;
    patterns: number;
    runtime: number;
  };
}

// API Response Types
export interface ListResponse {
  files: FileInfo[];
  directories: DirectoryInfo[];
}

export interface ExecuteRequest {
  inputFile: string;
  parameters: AtlantaParameters;
  outputDirectory: string;
}

export interface ExecuteResponse {
  jobId: string;
  status: 'running' | 'completed' | 'failed';
  output?: string;
  error?: string;
}

export interface StatusResponse {
  status: 'running' | 'completed' | 'failed';
  progress?: number;
  output: string;
  error?: string;
}

// Terminal Types
export interface TerminalMessage {
  type: 'input' | 'output' | 'resize' | 'create' | 'destroy';
  sessionId: string;
  data: string | { cols: number; rows: number };
}

// Project Types
export interface RecentProject {
  name: string;
  path: string;
  lastAccessed: string;
}

export interface CreateProjectRequest {
  name: string;
  path: string;
  template?: string;
}

// Results Viewer Types
export interface ParsedTestFile {
  circuitName: string;
  primaryInputs: string[];
  primaryOutputs: string[];
  testPatterns: Array<{
    inputs: string;
    outputs: string;
  }>;
}

export interface ParsedLogFile {
  circuitName: string;
  summary: {
    circuitStructure: Record<string, string | number>;
    atpgParameters: Record<string, string | number>;
    testResults: Record<string, string | number>;
    memoryUsed: string;
    cpuTime: Record<string, string>;
  };
  faultDetectionLog: Array<{
    patternNumber: number;
    pattern: string;
    faultsDetected: number;
  }>;
}

export interface ParsedVecFile {
  patterns: string[];
  inputWidth: number;
  patternCount: number;
}