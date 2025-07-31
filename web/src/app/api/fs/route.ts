import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { FileInfo, DirectoryInfo, ListResponse } from '@/types';

// Allowed file extensions for security
const ALLOWED_EXTENSIONS = [
  '.bench', '.test', '.vec', '.log', '.txt', '.md', '.json',
  '.py', '.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.scss',
  '.env', '.yml', '.yaml', '.xml', '.csv', '.sql', '.sh', '.bat',
  '.c', '.cpp', '.h', '.hpp', '.java', '.php', '.rb', '.go',
  '.rs', '.swift', '.kt', '.scala', '.pl', '.r', '.m', '.mm'
];

// Utility function to validate and normalize paths
function validatePath(inputPath: string): string {
  if (!inputPath) {
    throw new Error('Path is required');
  }
  
  // Decode URL-encoded path and resolve it
  const decodedPath = decodeURIComponent(inputPath);
  const fullPath = path.resolve(decodedPath);
  
  // Basic security check - prevent access to sensitive system directories
  const restrictedPaths = ['/etc', '/proc', '/sys', '/dev'];
  if (restrictedPaths.some(restricted => fullPath.startsWith(restricted))) {
    throw new Error('Access to system directories not allowed');
  }
  
  return fullPath;
}

// Utility function to get file info
async function getFileInfo(filePath: string): Promise<FileInfo | DirectoryInfo> {
  const stats = await fs.stat(filePath);
  const name = path.basename(filePath);
  
  if (stats.isDirectory()) {
    return {
      name,
      path: filePath,
      type: 'directory'
    };
  } else {
    return {
      name,
      path: filePath,
      size: stats.size,
      modified: stats.mtime.toISOString(),
      type: 'file',
      extension: path.extname(name)
    };
  }
}

// GET /api/fs - List directory contents
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedPath = searchParams.get('path') || '';
    
    const fullPath = validatePath(requestedPath);
    
    // Check if path exists
    try {
      await fs.access(fullPath);
    } catch {
      return NextResponse.json(
        { error: 'Path not found' },
        { status: 404 }
      );
    }
    
    const stats = await fs.stat(fullPath);
    
    if (!stats.isDirectory()) {
      return NextResponse.json(
        { error: 'Path is not a directory' },
        { status: 400 }
      );
    }
    
    const entries = await fs.readdir(fullPath);
    const files: FileInfo[] = [];
    const directories: DirectoryInfo[] = [];
    
    for (const entry of entries) {
      try {
        const entryPath = path.join(fullPath, entry);
        const info = await getFileInfo(entryPath);
        
        if (info.type === 'directory') {
          directories.push(info as DirectoryInfo);
        } else {
          files.push(info as FileInfo);
        }
      } catch (error) {
        // Skip entries that can't be read (permissions, etc.)
        console.warn(`Skipping entry ${entry}:`, error);
      }
    }
    
    // Sort directories first, then files, both alphabetically
    directories.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));
    
    const response: ListResponse = { files, directories };
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error listing directory:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list directory' },
      { status: 500 }
    );
  }
}

// POST /api/fs - Create file or directory
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: requestedPath, type, content = '' } = body;
    
    if (!requestedPath || !type) {
      return NextResponse.json(
        { error: 'Path and type are required' },
        { status: 400 }
      );
    }
    
    if (type !== 'file' && type !== 'directory') {
      return NextResponse.json(
        { error: 'Type must be "file" or "directory"' },
        { status: 400 }
      );
    }
    
    const fullPath = validatePath(requestedPath);
    
    // Check if file/directory already exists
    try {
      await fs.access(fullPath);
      return NextResponse.json(
        { error: 'File or directory already exists' },
        { status: 409 }
      );
    } catch {
      // Good, it doesn't exist
    }
    
    // Validate file extension for files
    if (type === 'file') {
      const ext = path.extname(requestedPath);
      if (ext && !ALLOWED_EXTENSIONS.includes(ext)) {
        return NextResponse.json(
          { error: `File extension ${ext} not allowed` },
          { status: 400 }
        );
      }
    }
    
    // Ensure parent directory exists
    const parentDir = path.dirname(fullPath);
    await fs.mkdir(parentDir, { recursive: true });
    
    if (type === 'directory') {
      await fs.mkdir(fullPath);
    } else {
      await fs.writeFile(fullPath, content, 'utf8');
    }
    
    const info = await getFileInfo(fullPath);
    return NextResponse.json(info, { status: 201 });
    
  } catch (error) {
    console.error('Error creating file/directory:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create file/directory' },
      { status: 500 }
    );
  }
}

// PUT /api/fs - Update file content
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: requestedPath, content } = body;
    
    if (!requestedPath || content === undefined) {
      return NextResponse.json(
        { error: 'Path and content are required' },
        { status: 400 }
      );
    }
    
    const fullPath = validatePath(requestedPath);
    
    // Check if file exists and is a file
    try {
      const stats = await fs.stat(fullPath);
      if (!stats.isFile()) {
        return NextResponse.json(
          { error: 'Path is not a file' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    // Validate file extension
    const ext = path.extname(requestedPath);
    if (ext && !ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `File extension ${ext} not allowed` },
        { status: 400 }
      );
    }
    
    await fs.writeFile(fullPath, content, 'utf8');
    
    const info = await getFileInfo(fullPath);
    return NextResponse.json(info);
    
  } catch (error) {
    console.error('Error updating file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update file' },
      { status: 500 }
    );
  }
}

// DELETE /api/fs - Delete file or directory
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedPath = searchParams.get('path');
    
    if (!requestedPath) {
      return NextResponse.json(
        { error: 'Path is required' },
        { status: 400 }
      );
    }
    
    const fullPath = validatePath(requestedPath);
    
    // Check if file/directory exists
    try {
      const stats = await fs.stat(fullPath);
      
      if (stats.isDirectory()) {
        await fs.rmdir(fullPath, { recursive: true });
      } else {
        await fs.unlink(fullPath);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return NextResponse.json(
          { error: 'File or directory not found' },
          { status: 404 }
        );
      }
      throw error;
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error deleting file/directory:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete file/directory' },
      { status: 500 }
    );
  }
}