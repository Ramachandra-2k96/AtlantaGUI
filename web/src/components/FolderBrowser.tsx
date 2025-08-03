'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Folder, FolderOpen, ChevronRight, ChevronDown, Home, HardDrive } from 'lucide-react';
import useFileSystem from '@/hooks/useFileSystem';

interface FolderBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFolder: (path: string) => void;
  currentPath?: string;
}

interface DirectoryNode {
  path: string;
  name: string;
  expanded: boolean;
  children?: DirectoryNode[];
  loading?: boolean;
}

export default function FolderBrowser({ isOpen, onClose, onSelectFolder, currentPath }: FolderBrowserProps) {
  const { listFiles } = useFileSystem();
  const [directories, setDirectories] = useState<DirectoryNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>(currentPath || '');
  const [loading, setLoading] = useState(false);

  // Initialize with common root directories
  useEffect(() => {
    if (isOpen) {
      const initializeDirectories = async () => {
        setLoading(true);
        try {
          // Start with some common directories
          const rootDirs: DirectoryNode[] = [
            { path: '/', name: 'Root', expanded: false },
            { path: '/home', name: 'Home', expanded: false },
            { path: '/tmp', name: 'Temp', expanded: false },
            { path: '/var', name: 'Var', expanded: false },
            { path: '/opt', name: 'Opt', expanded: false },
          ];

          // Try to load current working directory
          try {
            const response = await listFiles('.');
            if (response.directories.length > 0 || response.files.length > 0) {
              const cwd = process.cwd ? process.cwd() : '.';
              rootDirs.unshift({ 
                path: cwd, 
                name: 'Current Directory', 
                expanded: true 
              });
              
              // Load children for current directory
              const children = response.directories.map(dir => ({
                path: dir.path,
                name: dir.name,
                expanded: false
              }));
              rootDirs[0].children = children;
            }
          } catch (error) {
            console.log('Could not load current directory');
          }

          // Try to add some common project directories
          const commonDirs = ['data', 'src', 'projects', 'Documents', 'Desktop'];
          for (const dirName of commonDirs) {
            try {
              const response = await listFiles(dirName);
              if (response.directories.length > 0 || response.files.length > 0) {
                rootDirs.push({
                  path: dirName,
                  name: dirName,
                  expanded: false
                });
              }
            } catch (error) {
              // Directory doesn't exist, skip it
            }
          }

          setDirectories(rootDirs);
        } catch (error) {
          console.error('Failed to initialize directories:', error);
          // Fallback to basic structure
          setDirectories([
            { path: '.', name: 'Current Directory', expanded: false },
            { path: 'data', name: 'data', expanded: false },
            { path: '/', name: 'Root', expanded: false },
          ]);
        } finally {
          setLoading(false);
        }
      };

      initializeDirectories();
      setSelectedPath(currentPath || '');
    }
  }, [isOpen, currentPath, listFiles]);

  const loadDirectoryChildren = useCallback(async (path: string): Promise<DirectoryNode[]> => {
    try {
      const response = await listFiles(path);
      return response.directories.map(dir => ({
        path: dir.path,
        name: dir.name,
        expanded: false
      }));
    } catch (error) {
      console.error(`Failed to load directory ${path}:`, error);
      return [];
    }
  }, [listFiles]);

  const toggleDirectory = useCallback(async (targetPath: string) => {
    setDirectories(prevDirs => {
      const updateNode = (nodes: DirectoryNode[]): DirectoryNode[] => {
        return nodes.map(node => {
          if (node.path === targetPath) {
            if (node.expanded) {
              // Collapse
              return { ...node, expanded: false, children: undefined };
            } else {
              // Expand - mark as loading
              return { ...node, expanded: true, loading: true };
            }
          } else if (node.children) {
            return { ...node, children: updateNode(node.children) };
          }
          return node;
        });
      };
      return updateNode(prevDirs);
    });

    // Load children if expanding
    const targetNode = findNode(directories, targetPath);
    if (targetNode && !targetNode.expanded) {
      const children = await loadDirectoryChildren(targetPath);
      
      setDirectories(prevDirs => {
        const updateNode = (nodes: DirectoryNode[]): DirectoryNode[] => {
          return nodes.map(node => {
            if (node.path === targetPath) {
              return { ...node, loading: false, children };
            } else if (node.children) {
              return { ...node, children: updateNode(node.children) };
            }
            return node;
          });
        };
        return updateNode(prevDirs);
      });
    }
  }, [directories, loadDirectoryChildren]);

  const findNode = (nodes: DirectoryNode[], path: string): DirectoryNode | null => {
    for (const node of nodes) {
      if (node.path === path) return node;
      if (node.children) {
        const found = findNode(node.children, path);
        if (found) return found;
      }
    }
    return null;
  };

  const renderDirectoryTree = (nodes: DirectoryNode[], level: number = 0): React.ReactNode => {
    return nodes.map(node => (
      <div key={node.path}>
        <div
          className={`flex items-center px-2 py-1 text-sm cursor-pointer hover:bg-[#2a2d2e] ${
            selectedPath === node.path ? 'bg-[#094771]' : ''
          }`}
          style={{ paddingLeft: `${8 + level * 16}px` }}
          onClick={() => setSelectedPath(node.path)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleDirectory(node.path);
            }}
            className="mr-1 p-0.5 hover:bg-[#3c3c3c] rounded"
          >
            {node.loading ? (
              <div className="w-3 h-3 border border-[#cccccc] border-t-transparent rounded-full animate-spin" />
            ) : node.expanded ? (
              <ChevronDown className="w-3 h-3 text-[#858585]" />
            ) : (
              <ChevronRight className="w-3 h-3 text-[#858585]" />
            )}
          </button>
          
          <span className="mr-2">
            {node.expanded ? (
              <FolderOpen className="w-4 h-4 text-blue-400" />
            ) : (
              <Folder className="w-4 h-4 text-blue-400" />
            )}
          </span>
          
          <span className="flex-1 truncate text-xs text-[#cccccc]">
            {node.name}
          </span>
          
          {level === 0 && (
            <span className="text-xs text-[#858585] ml-2">
              {node.path === '.' ? 'Current' : node.path}
            </span>
          )}
        </div>
        
        {node.expanded && node.children && (
          <div>
            {renderDirectoryTree(node.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  const handleSelect = () => {
    if (selectedPath) {
      onSelectFolder(selectedPath);
      onClose();
    }
  };

  const handleQuickSelect = (path: string) => {
    setSelectedPath(path);
    onSelectFolder(path);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#3c3c3c] border border-[#464647] rounded-lg w-[600px] max-w-[90vw] h-[500px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#464647]">
          <h3 className="text-lg font-medium text-[#cccccc] mb-2">Select Folder</h3>
          <div className="text-sm text-[#858585]">
            Choose a folder to open as your workspace
          </div>
        </div>

        {/* Quick Access */}
        <div className="p-3 border-b border-[#464647]">
          <div className="text-xs text-[#858585] mb-2">Quick Access:</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleQuickSelect('.')}
              className="px-3 py-1 bg-[#2d2d30] hover:bg-[#2a2d2e] text-[#cccccc] rounded text-xs flex items-center gap-1"
            >
              <Home className="w-3 h-3" />
              Current Directory
            </button>
            <button
              onClick={() => handleQuickSelect('data')}
              className="px-3 py-1 bg-[#2d2d30] hover:bg-[#2a2d2e] text-[#cccccc] rounded text-xs flex items-center gap-1"
            >
              <Folder className="w-3 h-3" />
              data
            </button>
            <button
              onClick={() => handleQuickSelect('/tmp')}
              className="px-3 py-1 bg-[#2d2d30] hover:bg-[#2a2d2e] text-[#cccccc] rounded text-xs flex items-center gap-1"
            >
              <HardDrive className="w-3 h-3" />
              /tmp
            </button>
          </div>
        </div>

        {/* Directory Tree */}
        <div className="flex-1 overflow-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-[#858585] text-sm">Loading directories...</div>
            </div>
          ) : (
            <div className="space-y-1">
              {renderDirectoryTree(directories)}
            </div>
          )}
        </div>

        {/* Selected Path Display */}
        {selectedPath && (
          <div className="p-3 border-t border-[#464647] bg-[#2d2d30]">
            <div className="text-xs text-[#858585] mb-1">Selected:</div>
            <div className="text-sm text-[#cccccc] font-mono bg-[#1e1e1e] px-2 py-1 rounded">
              {selectedPath}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-[#464647] flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[#cccccc] hover:bg-[#2a2d2e] rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            className={`px-4 py-2 rounded transition-colors ${
              selectedPath
                ? 'bg-[#0e639c] hover:bg-[#1177bb] text-white'
                : 'bg-[#4a4a4a] text-gray-400 cursor-not-allowed'
            }`}
            disabled={!selectedPath}
          >
            Open Folder
          </button>
        </div>
      </div>
    </div>
  );
}