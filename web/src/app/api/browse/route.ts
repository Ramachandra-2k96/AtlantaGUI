import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface DirectoryItem {
  name: string;
  path: string;
  type: 'directory' | 'file';
  isAccessible: boolean;
}

// Get system directories for browsing
const getSystemDirectories = (): DirectoryItem[] => {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '/';
  const commonDirs = [
    { name: 'Home', path: homeDir, type: 'directory' as const, isAccessible: true },
    { name: 'Desktop', path: path.join(homeDir, 'Desktop'), type: 'directory' as const, isAccessible: true },
    { name: 'Documents', path: path.join(homeDir, 'Documents'), type: 'directory' as const, isAccessible: true },
    { name: 'Downloads', path: path.join(homeDir, 'Downloads'), type: 'directory' as const, isAccessible: true },
  ];

  // Add root directories on Unix-like systems
  if (process.platform !== 'win32') {
    commonDirs.unshift(
      { name: 'Root', path: '/', type: 'directory', isAccessible: true },
      { name: 'Workspace', path: '/workspace', type: 'directory', isAccessible: true }
    );
  }

  return commonDirs;
};

// Validate and normalize paths
function validatePath(inputPath: string): string {
  if (!inputPath) {
    throw new Error('Path is required');
  }
  
  const normalizedPath = path.resolve(inputPath);
  return normalizedPath;
}

// GET /api/browse - Browse directories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedPath = searchParams.get('path');
    
    // If no path provided, return system directories
    if (!requestedPath) {
      const systemDirs = getSystemDirectories();
      return NextResponse.json({ directories: systemDirs, currentPath: null });
    }
    
    const fullPath = validatePath(requestedPath);
    
    // Check if path exists and is accessible
    try {
      const stats = await fs.stat(fullPath);
      if (!stats.isDirectory()) {
        return NextResponse.json(
          { error: 'Path is not a directory' },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Directory not accessible' },
        { status: 404 }
      );
    }
    
    // Read directory contents
    const entries = await fs.readdir(fullPath);
    const directories: DirectoryItem[] = [];
    
    // Add parent directory option (except for root)
    if (fullPath !== '/' && fullPath !== path.parse(fullPath).root) {
      const parentPath = path.dirname(fullPath);
      directories.push({
        name: '..',
        path: parentPath,
        type: 'directory',
        isAccessible: true
      });
    }
    
    // Process directory entries
    for (const entry of entries) {
      try {
        const entryPath = path.join(fullPath, entry);
        const stats = await fs.stat(entryPath);
        
        if (stats.isDirectory()) {
          // Check if directory is accessible
          let isAccessible = true;
          try {
            await fs.access(entryPath, fs.constants.R_OK);
          } catch {
            isAccessible = false;
          }
          
          directories.push({
            name: entry,
            path: entryPath,
            type: 'directory',
            isAccessible
          });
        }
      } catch (error) {
        // Skip entries that can't be accessed
        console.warn(`Skipping entry ${entry}:`, error);
      }
    }
    
    // Sort directories: accessible first, then alphabetically
    directories.sort((a, b) => {
      if (a.name === '..') return -1;
      if (b.name === '..') return 1;
      if (a.isAccessible !== b.isAccessible) {
        return a.isAccessible ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    
    return NextResponse.json({
      directories,
      currentPath: fullPath
    });
    
  } catch (error) {
    console.error('Error browsing directory:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to browse directory' },
      { status: 500 }
    );
  }
}