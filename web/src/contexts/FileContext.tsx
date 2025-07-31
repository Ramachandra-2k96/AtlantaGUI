'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { FileInfo } from '@/types';

interface OpenFile {
  file: FileInfo;
  content: string;
  originalContent: string;
  isDirty: boolean;
}

interface FileContextType {
  openFiles: OpenFile[];
  activeFileIndex: number;
  currentFile: FileInfo | null;
  fileContent: string;
  isDirty: boolean;
  isLoading: boolean;
  error: string | null;
  openFile: (file: FileInfo) => Promise<void>;
  closeFile: (index: number, force?: boolean) => Promise<boolean>;
  closeAllFiles: () => Promise<boolean>;
  switchToFile: (index: number) => void;
  updateContent: (content: string) => void;
  saveFile: (index?: number) => Promise<void>;
  saveAllFiles: () => Promise<void>;
}

const FileContext = createContext<FileContextType | undefined>(undefined);

export function useFile() {
  const context = useContext(FileContext);
  if (context === undefined) {
    throw new Error('useFile must be used within a FileProvider');
  }
  return context;
}

interface FileProviderProps {
  children: React.ReactNode;
}

export function FileProvider({ children }: FileProviderProps) {
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentFile = activeFileIndex >= 0 ? openFiles[activeFileIndex]?.file || null : null;
  const fileContent = activeFileIndex >= 0 ? openFiles[activeFileIndex]?.content || '' : '';
  const isDirty = activeFileIndex >= 0 ? openFiles[activeFileIndex]?.isDirty || false : false;

  const openFile = useCallback(async (file: FileInfo) => {
    const normalizedPath = file.path.replace(/\/+/g, '/');

    // Check if file is already open by getting current state
    const currentOpenFiles = openFiles;
    const existingIndex = currentOpenFiles.findIndex(f => f.file.path.replace(/\/+/g, '/') === normalizedPath);

    if (existingIndex >= 0) {
      // File already exists, just switch to it
      setActiveFileIndex(existingIndex);
      return;
    }

    // File doesn't exist, load it
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/fs/read?path=${encodeURIComponent(file.path)}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to read file');
      }

      const data = await response.json();

      const newOpenFile: OpenFile = {
        file,
        content: data.content,
        originalContent: data.content,
        isDirty: false
      };

      // Add the new file and set it as active
      setOpenFiles(prev => {
        const newFiles = [...prev, newOpenFile];
        setActiveFileIndex(newFiles.length - 1);
        return newFiles;
      });

    } catch (err) {
      // Even if there's an error, add the file to the open files list with empty content
      const newOpenFile: OpenFile = {
        file,
        content: '',
        originalContent: '',
        isDirty: false
      };

      setOpenFiles(prev => {
        const newFiles = [...prev, newOpenFile];
        setActiveFileIndex(newFiles.length - 1);
        return newFiles;
      });

      const errorMessage = err instanceof Error ? err.message : 'Failed to open file';
      setError(errorMessage);
      console.error('Error opening file:', err);
    } finally {
      setIsLoading(false);
    }
  }, [openFiles]);

  const closeFile = useCallback(async (index: number, force = false): Promise<boolean> => {
    if (index < 0 || index >= openFiles.length) return true;

    const fileToClose = openFiles[index];

    // Check if file has unsaved changes
    if (fileToClose.isDirty && !force) {
      const shouldSave = window.confirm(
        `${fileToClose.file.name} has unsaved changes. Do you want to save them?`
      );

      if (shouldSave) {
        try {
          await saveFile(index);
        } catch (error) {
          console.error('Failed to save file before closing:', error);
          return false;
        }
      }
    }

    setOpenFiles(prev => prev.filter((_, i) => i !== index));

    // Adjust active file index
    if (index === activeFileIndex) {
      if (openFiles.length === 1) {
        setActiveFileIndex(-1);
      } else if (index === openFiles.length - 1) {
        setActiveFileIndex(index - 1);
      } else {
        setActiveFileIndex(index);
      }
    } else if (index < activeFileIndex) {
      setActiveFileIndex(prev => prev - 1);
    }

    return true;
  }, [openFiles, activeFileIndex]);

  const closeAllFiles = useCallback(async (): Promise<boolean> => {
    const dirtyFiles = openFiles.filter(f => f.isDirty);

    if (dirtyFiles.length > 0) {
      const shouldSave = window.confirm(
        `${dirtyFiles.length} file(s) have unsaved changes. Do you want to save them?`
      );

      if (shouldSave) {
        try {
          await saveAllFiles();
        } catch (error) {
          console.error('Failed to save files before closing:', error);
          return false;
        }
      }
    }

    setOpenFiles([]);
    setActiveFileIndex(-1);
    return true;
  }, [openFiles]);

  const switchToFile = useCallback((index: number) => {
    if (index >= 0 && index < openFiles.length) {
      setActiveFileIndex(index);
    }
  }, [openFiles]);

  const updateContent = useCallback((content: string) => {
    if (activeFileIndex >= 0) {
      setOpenFiles(prev => prev.map((file, index) =>
        index === activeFileIndex
          ? {
            ...file,
            content,
            isDirty: content !== file.originalContent
          }
          : file
      ));
    }
  }, [activeFileIndex]);

  const saveFile = useCallback(async (index?: number) => {
    const fileIndex = index ?? activeFileIndex;
    if (fileIndex < 0 || fileIndex >= openFiles.length) return;

    const fileToSave = openFiles[fileIndex];
    if (!fileToSave.isDirty) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/fs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: fileToSave.file.path,
          content: fileToSave.content
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save file');
      }

      // Mark file as clean
      setOpenFiles(prev => prev.map((file, i) =>
        i === fileIndex
          ? {
            ...file,
            originalContent: file.content,
            isDirty: false
          }
          : file
      ));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save file';
      setError(errorMessage);
      console.error('Error saving file:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [openFiles, activeFileIndex]);

  const saveAllFiles = useCallback(async () => {
    const dirtyFiles = openFiles
      .map((file, index) => ({ file, index }))
      .filter(({ file }) => file.isDirty);

    for (const { index } of dirtyFiles) {
      await saveFile(index);
    }
  }, [openFiles, saveFile]);

  const value = {
    openFiles,
    activeFileIndex,
    currentFile,
    fileContent,
    isDirty,
    isLoading,
    error,
    openFile,
    closeFile,
    closeAllFiles,
    switchToFile,
    updateContent,
    saveFile,
    saveAllFiles
  };

  return (
    <FileContext.Provider value={value}>
      {children}
    </FileContext.Provider>
  );
}