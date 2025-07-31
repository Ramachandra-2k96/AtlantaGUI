'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface WorkspaceContextType {
  currentWorkspace: string | null;
  recentWorkspaces: string[];
  setWorkspace: (path: string) => void;
  clearWorkspace: () => void;
  addRecentWorkspace: (path: string) => void;
  removeRecentWorkspace: (path: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

interface WorkspaceProviderProps {
  children: React.ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const [currentWorkspace, setCurrentWorkspace] = useState<string | null>(null);
  const [recentWorkspaces, setRecentWorkspaces] = useState<string[]>([]);

  // Load workspace state from localStorage on mount
  useEffect(() => {
    const savedWorkspace = localStorage.getItem('atalanta-current-workspace');
    const savedRecent = localStorage.getItem('atalanta-recent-workspaces');

    if (savedWorkspace) {
      setCurrentWorkspace(savedWorkspace);
    }

    if (savedRecent) {
      try {
        setRecentWorkspaces(JSON.parse(savedRecent));
      } catch (error) {
        console.error('Failed to parse recent workspaces:', error);
      }
    }
  }, []);

  const setWorkspace = useCallback((path: string) => {
    setCurrentWorkspace(path);
    localStorage.setItem('atalanta-current-workspace', path);

    // Add to recent workspaces
    setRecentWorkspaces(prev => {
      const filtered = prev.filter(p => p !== path);
      const updated = [path, ...filtered].slice(0, 10);
      localStorage.setItem('atalanta-recent-workspaces', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearWorkspace = useCallback(() => {
    setCurrentWorkspace(null);
    localStorage.removeItem('atalanta-current-workspace');
  }, []);

  const addRecentWorkspace = useCallback((path: string) => {
    setRecentWorkspaces(prev => {
      const filtered = prev.filter(p => p !== path);
      const updated = [path, ...filtered].slice(0, 10); // Keep only 10 recent workspaces
      localStorage.setItem('atalanta-recent-workspaces', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeRecentWorkspace = useCallback((path: string) => {
    setRecentWorkspaces(prev => {
      const updated = prev.filter(p => p !== path);
      localStorage.setItem('atalanta-recent-workspaces', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value = {
    currentWorkspace,
    recentWorkspaces,
    setWorkspace,
    clearWorkspace,
    addRecentWorkspace,
    removeRecentWorkspace
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}