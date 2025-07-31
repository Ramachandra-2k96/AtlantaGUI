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
  backtrackLimit1?: number;
  backtrackLimit2?: number;
  compactionMode?: 'none' | 'reverse' | 'shuffle';
  randomSeed?: number;
  fillMode?: '0' | '1' | 'x' | 'r';
  logMode?: boolean;
  faultMode?: 'default' | 'file';
  faultFile?: string;
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