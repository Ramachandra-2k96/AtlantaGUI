'use client';

import React, { useState, useEffect } from 'react';
import { FolderOpen, X, ChevronRight, Home, HardDrive, Lock, ArrowLeft, Zap, FileText } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface DirectoryItem {
  name: string;
  path: string;
  type: 'directory' | 'file';
  isAccessible: boolean;
}

interface BrowseResponse {
  directories: DirectoryItem[];
  currentPath: string | null;
}

export default function Welcome() {
  const { recentWorkspaces, setWorkspace, removeRecentWorkspace } = useWorkspace();
  const [showBrowser, setShowBrowser] = useState(false);
  const [directories, setDirectories] = useState<DirectoryItem[]>([]);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (showBrowser) {
      loadDirectories(null);
    }
  }, [showBrowser]);

  const loadDirectories = async (path: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const url = path ? `/api/browse?path=${encodeURIComponent(path)}` : '/api/browse';
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load directories');
      }
      
      const data: BrowseResponse = await response.json();
      setDirectories(data.directories);
      setCurrentPath(data.currentPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load directories');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectoryClick = (item: DirectoryItem) => {
    if (!item.isAccessible) return;
    loadDirectories(item.path);
  };

  const handleSelectWorkspace = () => {
    if (currentPath) {
      setWorkspace(currentPath);
    }
  };

  const handleRecentWorkspace = (path: string) => {
    setWorkspace(path);
  };

  const handleRemoveRecent = (path: string, event: React.MouseEvent) => {
    event.stopPropagation();
    removeRecentWorkspace(path);
  };

  const getDirectoryIcon = (item: DirectoryItem) => {
    if (!item.isAccessible) return <Lock className="w-4 h-4 text-gray-500" />;
    if (item.name === '..') return <ArrowLeft className="w-4 h-4 text-gray-300" />;
    if (item.path === '/' || item.name === 'Root') return <HardDrive className="w-4 h-4 text-gray-300" />;
    if (item.name === 'Home' || item.path.includes('/home/')) return <Home className="w-4 h-4 text-gray-300" />;
    return <FolderOpen className="w-4 h-4 text-gray-300" />;
  };

  if (showBrowser) {
    return (
      <div className="h-screen bg-[#1e1e1e] text-[#cccccc] flex flex-col">
        <div className="border-b border-[#2d2d30] p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-normal text-[#cccccc]">Select Workspace Folder</h2>
            <button
              onClick={() => setShowBrowser(false)}
              className="text-[#858585] hover:text-[#cccccc] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="text-xs text-[#858585] mb-3 font-mono">
            {currentPath || 'System Directories'}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleSelectWorkspace}
              disabled={!currentPath}
              className="px-3 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] disabled:bg-[#3c3c3c] disabled:cursor-not-allowed text-white text-xs transition-colors"
            >
              Select This Folder
            </button>
            <button
              onClick={() => loadDirectories(null)}
              className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#464647] text-[#cccccc] text-xs transition-colors"
            >
              Home
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ height: 'calc(100vh - 200px)' }}>
          {loading && (
            <div className="p-4 text-center text-[#858585] text-xs">
              Loading...
            </div>
          )}
          
          {error && (
            <div className="p-4 text-[#f48771] bg-[#5a1d1d] border-l-2 border-[#be1100] text-xs">
              {error}
            </div>
          )}
          
          {!loading && !error && directories.map((item) => (
            <div
              key={item.path}
              onClick={() => handleDirectoryClick(item)}
              className={`flex items-center px-4 py-2 text-xs transition-colors cursor-pointer ${
                item.isAccessible 
                  ? 'hover:bg-[#2a2d2e] text-[#cccccc]' 
                  : 'text-[#858585] cursor-not-allowed'
              }`}
            >
              <div className="mr-3 flex-shrink-0">
                {getDirectoryIcon(item)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate">
                  {item.name}
                </div>
              </div>
              {item.isAccessible && item.name !== '..' && (
                <div className="flex-shrink-0 ml-2">
                  <ChevronRight className="w-3 h-3 text-[#858585]" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#1e1e1e] text-[#cccccc] overflow-auto">
      <div className="max-w-4xl mx-auto p-8">
        <div className="text-center mb-12">
          <h1 className="text-2xl font-light mb-2 text-[#cccccc]">
            Atalanta GUI
          </h1>
          <p className="text-sm text-[#858585]">
            Editing evolved
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-sm font-normal mb-4 text-[#cccccc]">Start</h2>
          <div className="space-y-2">
            <div 
              onClick={() => setShowBrowser(true)}
              className="flex items-center p-2 hover:bg-[#2a2d2e] cursor-pointer transition-colors"
            >
              <FolderOpen className="w-4 h-4 text-[#75beff] mr-3" />
              <span className="text-sm text-[#75beff]">Open Folder...</span>
            </div>
          </div>
        </div>

        {recentWorkspaces.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-normal mb-4 text-[#cccccc]">Recent</h2>
            <div className="space-y-1">
              {recentWorkspaces.slice(0, 8).map((path) => (
                <div
                  key={path}
                  onClick={() => handleRecentWorkspace(path)}
                  className="flex items-center justify-between p-2 hover:bg-[#2a2d2e] cursor-pointer transition-colors group"
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <FolderOpen className="w-4 h-4 text-[#858585] mr-3 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-[#cccccc] truncate">
                        {path.split('/').pop() || path}
                      </div>
                      <div className="text-xs text-[#858585] truncate">
                        {path}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleRemoveRecent(path, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#3c3c3c] transition-all ml-2"
                    title="Remove from recent"
                  >
                    <X className="w-3 h-3 text-[#858585]" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-normal mb-4 text-[#cccccc]">Walkthroughs</h2>
          <div className="space-y-2">
            <div className="flex items-center p-2">
              <Zap className="w-4 h-4 text-[#0078d4] mr-3" />
              <span className="text-sm text-[#cccccc]">Get started with Atalanta</span>
            </div>
            <div className="flex items-center p-2">
              <FileText className="w-4 h-4 text-[#0078d4] mr-3" />
              <span className="text-sm text-[#cccccc]">Learn the fundamentals</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}