'use client';

import { useState, useCallback } from 'react';
import { FileInfo, DirectoryInfo, ListResponse } from '@/types';

export default function useFileSystem() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [directories, setDirectories] = useState<DirectoryInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listFiles = useCallback(async (path: string = '') => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/fs?path=${encodeURIComponent(path)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to list files');
      }
      
      const data: ListResponse = await response.json();
      setFiles(data.files);
      setDirectories(data.directories);
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to list files';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const readFile = useCallback(async (path: string): Promise<string> => {
    try {
      const response = await fetch(`/api/fs/read?path=${encodeURIComponent(path)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to read file');
      }
      
      const data = await response.json();
      return data.content;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to read file';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const createFile = useCallback(async (path: string, content: string = ''): Promise<FileInfo | DirectoryInfo> => {
    try {
      const response = await fetch('/api/fs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, type: 'file', content })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create file');
      }
      
      const fileInfo = await response.json();
      
      // Refresh the current directory listing
      const currentPath = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
      await listFiles(currentPath);
      
      return fileInfo;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create file';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [listFiles]);

  const createDirectory = useCallback(async (path: string): Promise<FileInfo | DirectoryInfo> => {
    try {
      const response = await fetch('/api/fs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, type: 'directory' })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create directory');
      }
      
      const dirInfo = await response.json();
      
      // Refresh the current directory listing
      const currentPath = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
      await listFiles(currentPath);
      
      return dirInfo;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create directory';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [listFiles]);

  const updateFile = useCallback(async (path: string, content: string): Promise<FileInfo> => {
    try {
      const response = await fetch('/api/fs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update file');
      }
      
      const fileInfo = await response.json();
      
      // Refresh the current directory listing
      const currentPath = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
      await listFiles(currentPath);
      
      return fileInfo;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update file';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [listFiles]);

  const deleteFile = useCallback(async (path: string): Promise<void> => {
    try {
      const response = await fetch(`/api/fs?path=${encodeURIComponent(path)}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete file');
      }
      
      // Refresh the current directory listing
      const currentPath = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
      await listFiles(currentPath);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete file';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [listFiles]);

  const uploadFiles = useCallback(async (files: FileList, targetPath: string = ''): Promise<{ uploadedFiles: FileInfo[], errors?: string[] }> => {
    try {
      const formData = new FormData();
      
      // Add all files to form data
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });
      
      // Add target path
      formData.append('path', targetPath);
      
      const response = await fetch('/api/fs/upload', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (!response.ok && !result.success) {
        throw new Error(result.error || 'Failed to upload files');
      }
      
      // Refresh the current directory listing
      await listFiles(targetPath);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload files';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [listFiles]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    files,
    directories,
    loading,
    error,
    listFiles,
    readFile,
    createFile,
    createDirectory,
    updateFile,
    deleteFile,
    uploadFiles,
    clearError
  };
}