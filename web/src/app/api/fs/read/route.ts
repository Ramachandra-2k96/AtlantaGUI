import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

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

// GET /api/fs/read - Read file content
export async function GET(request: NextRequest) {
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
    
    // Check if file exists and is a file
    try {
      const stats = await fs.stat(fullPath);
      if (!stats.isFile()) {
        return NextResponse.json(
          { error: 'Path is not a file' },
          { status: 400 }
        );
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return NextResponse.json(
          { error: 'File not found' },
          { status: 404 }
        );
      }
      throw error;
    }
    
    // Read file content
    const content = await fs.readFile(fullPath, 'utf8');
    
    return NextResponse.json({
      path: requestedPath,
      content,
      size: Buffer.byteLength(content, 'utf8')
    });
    
  } catch (error) {
    console.error('Error reading file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read file' },
      { status: 500 }
    );
  }
}