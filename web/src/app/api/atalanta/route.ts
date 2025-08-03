import { NextRequest, NextResponse } from 'next/server';
import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ExecuteRequest, ExecuteResponse, StatusResponse, AtlantaParameters } from '@/types';

// Job management system
interface AtlantaJob {
  id: string;
  status: 'running' | 'completed' | 'failed';
  process?: ChildProcess;
  output: string;
  error?: string;
  progress: number;
  startTime: Date;
  endTime?: Date;
  inputFile: string;
  outputDirectory: string;
  parameters: AtlantaParameters;
}

// In-memory job storage (in production, consider using Redis or database)
const jobs = new Map<string, AtlantaJob>();

// Cleanup completed jobs after 1 hour
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
setInterval(() => {
  const now = new Date();
  for (const [jobId, job] of jobs.entries()) {
    if (job.status !== 'running' && job.endTime) {
      const timeDiff = now.getTime() - job.endTime.getTime();
      if (timeDiff > CLEANUP_INTERVAL) {
        jobs.delete(jobId);
      }
    }
  }
}, CLEANUP_INTERVAL);

function validateParameters(params: AtlantaParameters): string[] {
  const errors: string[] = [];

  if (params.diagnosticMode === 'limited' && (!params.diagnosticLimit || params.diagnosticLimit < 1)) {
    errors.push('Diagnostic limit must be a positive number when using limited diagnostic mode');
  }

  if (params.backtrackLimit !== undefined && (params.backtrackLimit < 0 || params.backtrackLimit > 1000000)) {
    errors.push('Backtrack limit must be between 0 and 1,000,000');
  }

  if (params.backtrackLimit2 !== undefined && (params.backtrackLimit2 < 0 || params.backtrackLimit2 > 1000000)) {
    errors.push('Backtrack limit 2 must be between 0 and 1,000,000');
  }

  if (params.compactionLimit !== undefined && params.compactionLimit < 0) {
    errors.push('Compaction limit must be non-negative');
  }

  if (params.randomPatternLimit !== undefined && params.randomPatternLimit < 0) {
    errors.push('Random pattern limit must be non-negative');
  }

  if (params.randomSeed !== undefined && (params.randomSeed < 0 || params.randomSeed > 2147483647)) {
    errors.push('Random seed must be between 0 and 2,147,483,647');
  }

  if (params.unspecifiedInputs && !['0', '1', 'X', 'R'].includes(params.unspecifiedInputs)) {
    errors.push('Unspecified inputs mode must be one of: 0, 1, X, R');
  }

  if (params.faultFile && !params.faultFile.trim()) {
    errors.push('Fault file path cannot be empty');
  }

  return errors;
}

function buildAtlantaCommand(inputFile: string, outputDir: string, params: AtlantaParameters): string[] {
  const command = ['./atalanta'];

  // Diagnostic modes
  if (params.diagnosticMode === 'all') {
    command.push('-A');
  } else if (params.diagnosticMode === 'limited' && params.diagnosticLimit) {
    command.push('-D', params.diagnosticLimit.toString());
  }

  // Backtracking limits
  if (params.backtrackLimit !== undefined) {
    command.push('-b', params.backtrackLimit.toString());
  }

  if (params.backtrackLimit2 !== undefined) {
    command.push('-B', params.backtrackLimit2.toString());
  }

  // Fault file
  if (params.faultFile) {
    command.push('-f', params.faultFile);
  }

  // Simulation mode
  if (params.useHope) {
    command.push('-H');
  }

  // Logging
  if (params.logFile) {
    command.push('-l', params.logFile);
  }

  // Static learning
  if (params.staticLearning) {
    command.push('-L');
  }

  // Test compaction
  if (params.noCompaction) {
    command.push('-N');
  } else if (params.compactionLimit !== undefined) {
    command.push('-c', params.compactionLimit.toString());
  }

  // Random pattern testing
  if (params.randomPatternLimit !== undefined) {
    command.push('-r', params.randomPatternLimit.toString());
  }

  // Random seed
  if (params.randomSeed !== undefined) {
    command.push('-s', params.randomSeed.toString());
  }

  // Test output file
  if (params.testFile) {
    command.push('-t', params.testFile);
  } else if (outputDir) {
    // Generate default test file name in output directory
    const baseName = path.basename(inputFile, '.bench');
    const testFileName = path.join(outputDir, `${baseName}.test`);
    command.push('-t', testFileName);
  }

  // Aborted faults output
  if (params.outputAbortedFaults) {
    if (params.abortedFaultsFile) {
      command.push('-U', params.abortedFaultsFile);
    } else {
      command.push('-u');
    }
  }

  // Include redundant faults
  if (params.includeRedundantFaults) {
    command.push('-v');
  }

  // Single pattern mode
  if (params.singlePatternMode) {
    command.push('-Z');
  }

  // Unspecified input handling
  if (params.unspecifiedInputs) {
    command.push(`-${params.unspecifiedInputs}`);
  }

  // Input file (must be last)
  command.push(inputFile);

  return command;
}

async function executeAtalanta(job: AtlantaJob): Promise<void> {
  try {
    // Resolve paths relative to the workspace directory
    const inputPath = path.resolve(job.inputFile);
    await fs.access(inputPath);

    // Ensure output directory exists
    const outputPath = path.resolve(job.outputDirectory);
    await fs.mkdir(outputPath, { recursive: true });

    // Find the directory containing the atalanta executable
    // Look in the same directory as the input file first, then parent directories
    let workingDir = path.dirname(inputPath);
    let atlantaPath = path.join(workingDir, 'atalanta');
    
    // Check if atalanta exists in the input file directory
    try {
      await fs.access(atlantaPath);
    } catch {
      // If not found, try parent directories up to 3 levels
      let currentDir = workingDir;
      let found = false;
      
      for (let i = 0; i < 3; i++) {
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) break; // Reached root
        
        const testPath = path.join(parentDir, 'atalanta');
        try {
          await fs.access(testPath);
          workingDir = parentDir;
          atlantaPath = testPath;
          found = true;
          break;
        } catch {
          currentDir = parentDir;
        }
      }
      
      if (!found) {
        throw new Error('Atalanta executable not found. Please ensure atalanta is in the workspace directory or its parent directories.');
      }
    }

    // Build command with relative path to input file from working directory
    const relativeInputPath = path.relative(workingDir, inputPath);
    const relativeOutputDir = path.relative(workingDir, outputPath);
    const command = buildAtlantaCommand(relativeInputPath, relativeOutputDir, job.parameters);

    // Spawn Atalanta process
    const atlantaProcess = spawn(command[0], command.slice(1), {
      cwd: workingDir,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    job.process = atlantaProcess;
    job.progress = 10; // Started

    let output = '';
    let error = '';

    atlantaProcess.stdout?.on('data', (data: Buffer) => {
      const chunk = data.toString();
      output += chunk;
      job.output = output;

      // Update progress based on actual Atalanta output patterns
      if (chunk.includes('before')) {
        job.progress = 10;
      } else if (chunk.includes('after')) {
        job.progress = 20;
      } else if (chunk.includes('end initialazition')) {
        job.progress = 30;
      } else if (chunk.includes('Welcome to atalanta')) {
        job.progress = 40;
      } else if (chunk.includes('SUMMARY OF TEST PATTERN GENERATION RESULTS')) {
        job.progress = 90;
      } else if (chunk.includes('CPU time')) {
        job.progress = 95;
      }
    });

    atlantaProcess.stderr?.on('data', (data: Buffer) => {
      const chunk = data.toString();
      error += chunk;
      job.error = error;
    });

    atlantaProcess.on('close', (code: number) => {
      job.endTime = new Date();
      if (code === 0) {
        job.status = 'completed';
        job.progress = 100;
      } else {
        job.status = 'failed';
        job.error = error || `Process exited with code ${code}`;
      }
      job.process = undefined;
    });

    atlantaProcess.on('error', (err: Error) => {
      job.endTime = new Date();
      job.status = 'failed';
      job.error = err.message;
      job.process = undefined;
    });

  } catch (err) {
    job.endTime = new Date();
    job.status = 'failed';
    job.error = err instanceof Error ? err.message : 'Unknown error occurred';
    job.process = undefined;
  }
}

// POST /api/atalanta - Execute Atalanta with parameters
export async function POST(request: NextRequest) {
  try {
    const body: ExecuteRequest = await request.json();

    // Validate request
    if (!body.inputFile) {
      return NextResponse.json(
        { error: 'Input file is required' },
        { status: 400 }
      );
    }

    if (!body.outputDirectory) {
      return NextResponse.json(
        { error: 'Output directory is required' },
        { status: 400 }
      );
    }

    // Validate parameters
    const paramErrors = validateParameters(body.parameters || {});
    if (paramErrors.length > 0) {
      return NextResponse.json(
        { error: 'Parameter validation failed', details: paramErrors },
        { status: 400 }
      );
    }

    // Create job
    const jobId = uuidv4();
    const job: AtlantaJob = {
      id: jobId,
      status: 'running',
      output: '',
      progress: 0,
      startTime: new Date(),
      inputFile: body.inputFile,
      outputDirectory: body.outputDirectory,
      parameters: body.parameters || {}
    };

    jobs.set(jobId, job);

    // Start execution asynchronously
    executeAtalanta(job);

    const response: ExecuteResponse = {
      jobId,
      status: job.status,
      output: job.output
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Atalanta execution error:', error);
    return NextResponse.json(
      { error: 'Failed to execute Atalanta' },
      { status: 500 }
    );
  }
}

// GET /api/atalanta?jobId=xxx - Get job status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const job = jobs.get(jobId);
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const response: StatusResponse = {
      status: job.status,
      progress: job.progress,
      output: job.output,
      error: job.error
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    );
  }
}

// DELETE /api/atalanta?jobId=xxx - Cancel job
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const job = jobs.get(jobId);
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    if (job.status === 'running' && job.process) {
      job.process.kill('SIGTERM');
      job.status = 'failed';
      job.error = 'Job cancelled by user';
      job.endTime = new Date();
      job.process = undefined;
    }

    return NextResponse.json({ message: 'Job cancelled successfully' });

  } catch (error) {
    console.error('Job cancellation error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel job' },
      { status: 500 }
    );
  }
}