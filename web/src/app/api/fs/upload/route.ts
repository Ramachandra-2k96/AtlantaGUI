import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { FileInfo } from '@/types';

// Base workspace directory
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || '/workspace';

// Allowed file extensions and MIME types
const ALLOWED_EXTENSIONS = ['.bench', '.test', '.vec', '.log', '.txt', '.md', '.json'];
const ALLOWED_MIME_TYPES = [
  'text/plain',
  'application/octet-stream',
  'text/x-verilog',
  'application/json'
];

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Utility function to validate and normalize paths
function validatePath(inputPath: string): string {
  if (!inputPath) {
    throw new Error('Path is required');
  }
  
  const cleanPath = inputPath.replace(/^\/+/, '');
  const fullPath = path.resolve(WORKSPACE_ROOT, cleanPath);
  
  if (!fullPath.startsWith(path.resolve(WORKSPACE_ROOT))) {
    throw new Error('Path traversal not allowed');
  }
  
  return fullPath;
}

// Utility function to get file info
async function getFileInfo(filePath: string): Promise<FileInfo> {
  const stats = await fs.stat(filePath);
  const name = path.basename(filePath);
  const relativePath = path.relative(WORKSPACE_ROOT, filePath);
  
  return {
    name,
    path: relativePath,
    size: stats.size,
    modified: stats.mtime.toISOString(),
    type: 'file',
    extension: path.extname(name)
  };
}

// POST /api/fs/upload - Upload files
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const targetPath = formData.get('path') as string || '';
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }
    
    const targetDir = validatePath(targetPath);
    
    // Ensure target directory exists
    await fs.mkdir(targetDir, { recursive: true });
    
    const uploadedFiles: FileInfo[] = [];
    const errors: string[] = [];
    
    for (const file of files) {
      try {
        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`File ${file.name} exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
          continue;
        }
        
        // Validate file extension
        const ext = path.extname(file.name);
        if (ext && !ALLOWED_EXTENSIONS.includes(ext)) {
          errors.push(`File ${file.name} has disallowed extension ${ext}`);
          continue;
        }
        
        // Validate MIME type (if provided)
        if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
          errors.push(`File ${file.name} has disallowed MIME type ${file.type}`);
          continue;
        }
        
        // Sanitize filename
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = path.join(targetDir, sanitizedName);
        
        // Check if file already exists
        try {
          await fs.access(filePath);
          errors.push(`File ${sanitizedName} already exists`);
          continue;
        } catch {
          // Good, file doesn't exist
        }
        
        // Read file content
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Write file
        await fs.writeFile(filePath, buffer);
        
        // Get file info for response
        const fileInfo = await getFileInfo(filePath);
        uploadedFiles.push(fileInfo);
        
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        errors.push(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    const response = {
      uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
      success: uploadedFiles.length > 0
    };
    
    const status = uploadedFiles.length > 0 ? 200 : 400;
    return NextResponse.json(response, { status });
    
  } catch (error) {
    console.error('Error in file upload:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload files' },
      { status: 500 }
    );
  }
}

// GET /api/fs/upload - Get upload status/info (for future use)
export async function GET() {
  return NextResponse.json({
    maxFileSize: MAX_FILE_SIZE,
    allowedExtensions: ALLOWED_EXTENSIONS,
    allowedMimeTypes: ALLOWED_MIME_TYPES
  });
}