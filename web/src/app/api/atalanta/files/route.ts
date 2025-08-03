import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface BenchFile {
    name: string;
    path: string;
    size: number;
    directory: string;
}

async function findBenchFiles(dir: string, _basePath: string = '', rootDir: string = dir): Promise<BenchFile[]> {
    const files: BenchFile[] = [];

    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(rootDir, fullPath);

            if (entry.isDirectory()) {
                // Recursively search subdirectories
                const subFiles = await findBenchFiles(fullPath, '', rootDir);
                files.push(...subFiles);
            } else if (entry.isFile() && entry.name.endsWith('.bench')) {
                try {
                    const stats = await fs.stat(fullPath);
                    files.push({
                        name: entry.name,
                        path: relativePath || entry.name,
                        size: stats.size,
                        directory: path.dirname(relativePath) || '.'
                    });
                } catch (err) {
                    console.error(`Error getting stats for ${fullPath}:`, err);
                }
            }
        }
    } catch (err) {
        console.error(`Error reading directory ${dir}:`, err);
    }

    return files;
}

// GET /api/atalanta/files - List all .bench files
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const workspacePath = searchParams.get('workspace');
        
        if (!workspacePath) {
            return NextResponse.json(
                { error: 'Workspace path is required' },
                { status: 400 }
            );
        }

        // Use the workspace path directly - no hardcoding
        const searchDir = path.resolve(workspacePath);
        
        // Verify the directory exists
        try {
            await fs.access(searchDir);
        } catch {
            return NextResponse.json(
                { error: 'Workspace directory not found' },
                { status: 404 }
            );
        }

        const benchFiles = await findBenchFiles(searchDir, '', searchDir);

        // Sort files by directory and then by name
        benchFiles.sort((a, b) => {
            if (a.directory !== b.directory) {
                return a.directory.localeCompare(b.directory);
            }
            return a.name.localeCompare(b.name);
        });

        return NextResponse.json({
            files: benchFiles,
            count: benchFiles.length
        });

    } catch (error) {
        console.error('Error listing .bench files:', error);
        return NextResponse.json(
            { error: 'Failed to list .bench files' },
            { status: 500 }
        );
    }
}