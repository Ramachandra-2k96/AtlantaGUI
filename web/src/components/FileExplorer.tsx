'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  FileInfo, 
  DirectoryInfo 
} from '@/types';
import { 
  FolderOpen, 
  Folder, 
  File, 
  FileText, 
  Settings, 
  BarChart3,
  TestTube,
  Wrench,
  ScrollText,
  ChevronRight,
  ChevronDown,
  Plus,
  FolderPlus,
  RefreshCw,

  Trash2,
  Edit3,
  Copy
} from 'lucide-react';
import useFileSystem from '@/hooks/useFileSystem';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useFile } from '@/contexts/FileContext';

interface FileExplorerProps {
  rootPath?: string;
  onFileSelect?: (file: FileInfo) => void;
  onFileCreate?: (path: string) => void;
  onDirectoryChange?: (path: string) => void;
}

interface TreeNode {
  item: FileInfo | DirectoryInfo;
  expanded: boolean;
  children?: TreeNode[];
  level: number;
  loading?: boolean;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  item: FileInfo | DirectoryInfo | null;
  showNewSubmenu?: boolean;
}

// File type icons mapping using Lucide icons
const getFileIcon = (item: FileInfo | DirectoryInfo, expanded?: boolean) => {
  if (item.type === 'directory') {
    return expanded ? (
      <FolderOpen className="w-4 h-4 text-blue-400" />
    ) : (
      <Folder className="w-4 h-4 text-blue-400" />
    );
  }
  
  const ext = (item as FileInfo).extension?.toLowerCase();
  switch (ext) {
    case '.bench':
      return <Wrench className="w-4 h-4 text-orange-400" />;
    case '.test':
      return <TestTube className="w-4 h-4 text-green-400" />;
    case '.vec':
      return <BarChart3 className="w-4 h-4 text-purple-400" />;
    case '.log':
      return <ScrollText className="w-4 h-4 text-yellow-400" />;
    case '.txt':
      return <FileText className="w-4 h-4 text-gray-400" />;
    case '.md':
      return <FileText className="w-4 h-4 text-blue-300" />;
    case '.json':
      return <Settings className="w-4 h-4 text-orange-300" />;
    default:
      return <File className="w-4 h-4 text-gray-400" />;
  }
};

// Get syntax highlighting class for file types
const getSyntaxClass = (item: FileInfo | DirectoryInfo): string => {
  if (item.type === 'directory') return 'text-blue-300';
  
  const ext = (item as FileInfo).extension?.toLowerCase();
  switch (ext) {
    case '.bench':
      return 'text-orange-300';
    case '.test':
      return 'text-green-300';
    case '.vec':
      return 'text-purple-300';
    case '.log':
      return 'text-yellow-300';
    case '.json':
      return 'text-orange-300';
    case '.md':
      return 'text-blue-300';
    default:
      return 'text-gray-300';
  }
};

export default function FileExplorer({ 
  rootPath, 
  onFileSelect, 
  onFileCreate,
  onDirectoryChange 
}: FileExplorerProps) {
  const { currentWorkspace } = useWorkspace();
  const { openFile } = useFile();
  const { loading, error, listFiles, createFile, createDirectory, deleteFile, uploadFiles, clearError } = useFileSystem();
  const [localError, setLocalError] = useState<string | null>(null);
  const [rootDirectory] = useState(rootPath || currentWorkspace || '');
  const [treeData, setTreeData] = useState<Map<string, TreeNode[]>>(new Map());
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    item: null,
    showNewSubmenu: false
  });
  const [dragOver, setDragOver] = useState(false);
  const [renameItem, setRenameItem] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [loadedPaths, setLoadedPaths] = useState<Set<string>>(new Set());
  const [currentDirectory, setCurrentDirectory] = useState<string>(rootDirectory);
  
  const fileExplorerRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Load root directory on mount - only once
  useEffect(() => {
    if (rootDirectory && !loadedPaths.has(rootDirectory)) {
      listFiles(rootDirectory).then((response) => {
        const nodes: TreeNode[] = [];
        
        // Add directories first
        response.directories.forEach(dir => {
          nodes.push({
            item: dir,
            expanded: false,
            level: 0,
            loading: false
          });
        });
        
        // Add files
        response.files.forEach(file => {
          nodes.push({
            item: file,
            expanded: false,
            level: 0,
            loading: false
          });
        });
        
        setTreeData(new Map([[rootDirectory, nodes]]));
        setLoadedPaths(new Set([rootDirectory]));
      }).catch(console.error);
    }
  }, [rootDirectory]); // Only depend on rootDirectory

  // Handle click outside context menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu({ visible: false, x: 0, y: 0, item: null });
      }
    };

    if (contextMenu.visible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu.visible]);

  const loadDirectoryContents = useCallback(async (path: string, level: number) => {
    if (loadedPaths.has(path)) return; // Already loaded
    
    try {
      const response = await listFiles(path);
      
      const nodes: TreeNode[] = [];
      
      // Add directories first
      response.directories.forEach(dir => {
        nodes.push({
          item: dir,
          expanded: false,
          level,
          loading: false
        });
      });
      
      // Add files
      response.files.forEach(file => {
        nodes.push({
          item: file,
          expanded: false,
          level,
          loading: false
        });
      });
      
      setTreeData(prev => {
        const newTreeData = new Map(prev);
        newTreeData.set(path, nodes);
        return newTreeData;
      });
      
      setLoadedPaths(prev => new Set([...prev, path]));
      
    } catch (error) {
      console.error('Failed to load directory contents:', error);
    }
  }, [loadedPaths, listFiles]);

  const refreshDirectory = useCallback(async (path: string) => {
    try {
      const response = await listFiles(path);
      
      // Calculate the correct level for this path
      const pathDepth = path === rootDirectory ? 0 : path.split('/').length - rootDirectory.split('/').length;
      
      const nodes: TreeNode[] = [];
      
      // Add directories first
      response.directories.forEach(dir => {
        nodes.push({
          item: dir,
          expanded: expandedNodes.has(dir.path),
          level: pathDepth,
          loading: false
        });
      });
      
      // Add files
      response.files.forEach(file => {
        nodes.push({
          item: file,
          expanded: false,
          level: pathDepth,
          loading: false
        });
      });
      
      setTreeData(prev => {
        const newTreeData = new Map(prev);
        newTreeData.set(path, nodes);
        return newTreeData;
      });
      
      // Mark this path as loaded
      setLoadedPaths(prev => new Set([...prev, path]));
      
    } catch (error) {
      console.error('Failed to refresh directory:', error);
    }
  }, [rootDirectory, expandedNodes, listFiles]);

  const buildFlatTree = useCallback((): TreeNode[] => {
    const flatTree: TreeNode[] = [];
    
    const addNodeAndChildren = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        flatTree.push(node);
        
        // If node is expanded and is a directory, add its children
        if (node.expanded && node.item.type === 'directory') {
          const children = treeData.get(node.item.path);
          if (children) {
            addNodeAndChildren(children);
          }
        }
      });
    };
    
    const rootNodes = treeData.get(rootDirectory);
    if (rootNodes) {
      addNodeAndChildren(rootNodes);
    }
    
    return flatTree;
  }, [treeData, rootDirectory]);

  const handleItemClick = useCallback(async (node: TreeNode) => {
    setSelectedItem(node.item.path);
    
    if (node.item.type === 'directory') {
      // Set current directory for new file/folder creation
      setCurrentDirectory(node.item.path);
      
      const isExpanded = expandedNodes.has(node.item.path);
      const newExpanded = new Set(expandedNodes);
      
      if (isExpanded) {
        // Collapse
        newExpanded.delete(node.item.path);
      } else {
        // Expand
        newExpanded.add(node.item.path);
        
        // Load directory contents if not already loaded
        if (!loadedPaths.has(node.item.path)) {
          await loadDirectoryContents(node.item.path, node.level + 1);
        }
      }
      
      setExpandedNodes(newExpanded);
      
      // Update the node's expanded state in tree data
      setTreeData(prev => {
        const newTreeData = new Map(prev);
        const parentPath = node.level === 0 ? rootDirectory : 
          Array.from(prev.keys()).find(path => 
            prev.get(path)?.some(n => n.item.path === node.item.path)
          ) || rootDirectory;
        
        const parentNodes = newTreeData.get(parentPath);
        if (parentNodes) {
          const updatedNodes = parentNodes.map(n => 
            n.item.path === node.item.path 
              ? { ...n, expanded: !isExpanded }
              : n
          );
          newTreeData.set(parentPath, updatedNodes);
        }
        
        return newTreeData;
      });
      
      onDirectoryChange?.(node.item.path);
    } else {
      // Open file in editor
      await openFile(node.item as FileInfo);
      onFileSelect?.(node.item as FileInfo);
    }
  }, [expandedNodes, treeData, rootDirectory, loadDirectoryContents, loadedPaths, onDirectoryChange, onFileSelect, openFile]);

  const handleContextMenu = useCallback((event: React.MouseEvent, item: FileInfo | DirectoryInfo) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      item,
      showNewSubmenu: false
    });
  }, []);

  const handleNewFile = useCallback(async () => {
    if (!newItemName.trim()) return;
    
    try {
      // Use current directory (selected folder) or root directory
      const targetDirectory = currentDirectory || rootDirectory;
      const filePath = targetDirectory ? `${targetDirectory}/${newItemName}` : newItemName;
      
      await createFile(filePath, '');
      setShowNewFileInput(false);
      setNewItemName('');
      onFileCreate?.(filePath);
      
      // Refresh the target directory immediately for real-time update
      await refreshDirectory(targetDirectory);
      
      // If the target directory is expanded, make sure it stays expanded
      if (targetDirectory !== rootDirectory) {
        setExpandedNodes(prev => new Set([...prev, targetDirectory]));
      }
      
    } catch (error) {
      console.error('Failed to create file:', error);
      setLocalError('Failed to create file');
    }
  }, [newItemName, currentDirectory, rootDirectory, createFile, onFileCreate, refreshDirectory]);

  const handleNewFolder = useCallback(async () => {
    if (!newItemName.trim()) return;
    
    try {
      // Use current directory (selected folder) or root directory
      const targetDirectory = currentDirectory || rootDirectory;
      const folderPath = targetDirectory ? `${targetDirectory}/${newItemName}` : newItemName;
      
      await createDirectory(folderPath);
      setShowNewFolderInput(false);
      setNewItemName('');
      
      // Refresh the target directory immediately for real-time update
      await refreshDirectory(targetDirectory);
      
      // If the target directory is expanded, make sure it stays expanded
      if (targetDirectory !== rootDirectory) {
        setExpandedNodes(prev => new Set([...prev, targetDirectory]));
      }
      
    } catch (error) {
      console.error('Failed to create folder:', error);
      setLocalError('Failed to create folder');
    }
  }, [newItemName, currentDirectory, rootDirectory, createDirectory, refreshDirectory]);

  const handleDelete = useCallback(async (item: FileInfo | DirectoryInfo) => {
    if (window.confirm(`Are you sure you want to delete ${item.name}?`)) {
      try {
        await deleteFile(item.path);
        setContextMenu({ visible: false, x: 0, y: 0, item: null, showNewSubmenu: false });
        
        // Find the parent directory of the deleted item
        const parentPath = item.path.substring(0, item.path.lastIndexOf('/')) || rootDirectory;
        
        // Refresh the parent directory immediately for real-time update
        await refreshDirectory(parentPath);
        
        // Remove the deleted item from all state if it was a directory
        if (item.type === 'directory') {
          // Remove from loadedPaths (this directory and all subdirectories)
          setLoadedPaths(prev => {
            const newPaths = new Set(prev);
            // Remove the deleted directory and any subdirectories
            Array.from(prev).forEach(path => {
              if (path === item.path || path.startsWith(item.path + '/')) {
                newPaths.delete(path);
              }
            });
            return newPaths;
          });
          
          // Remove from expanded nodes (this directory and all subdirectories)
          setExpandedNodes(prev => {
            const newExpanded = new Set(prev);
            Array.from(prev).forEach(path => {
              if (path === item.path || path.startsWith(item.path + '/')) {
                newExpanded.delete(path);
              }
            });
            return newExpanded;
          });
          
          // Remove from tree data (this directory and all subdirectories)
          setTreeData(prev => {
            const newTreeData = new Map(prev);
            Array.from(prev.keys()).forEach(path => {
              if (path === item.path || path.startsWith(item.path + '/')) {
                newTreeData.delete(path);
              }
            });
            return newTreeData;
          });
        }
        
      } catch (error) {
        console.error('Failed to delete item:', error);
        setLocalError('Failed to delete item');
      }
    }
  }, [deleteFile, rootDirectory, refreshDirectory]);

  const handleRename = useCallback((item: FileInfo | DirectoryInfo) => {
    setRenameItem(item.path);
    setNewItemName(item.name);
    setContextMenu({ visible: false, x: 0, y: 0, item: null });
  }, []);

  const handleRenameSubmit = useCallback(async (oldPath: string, newName: string) => {
    if (!newName.trim() || newName === oldPath.split('/').pop()) {
      setRenameItem(null);
      setNewItemName('');
      return;
    }

    try {
      // For now, we'll implement rename as copy + delete since the API doesn't have rename
      // This is a simplified approach - in a real implementation you'd want a proper rename API
      const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/')) || rootDirectory;
      const newPath = parentPath ? `${parentPath}/${newName}` : newName;
      
      // Read the old file content
      const readResponse = await fetch(`/api/fs/read?path=${encodeURIComponent(oldPath)}`);
      if (readResponse.ok) {
        const data = await readResponse.json();
        
        // Create new file with new name
        await createFile(newPath, data.content);
        
        // Delete old file
        await deleteFile(oldPath);
      } else {
        // For directories, just create new and delete old (this is simplified)
        await createDirectory(newPath);
        await deleteFile(oldPath);
      }
      
      setRenameItem(null);
      setNewItemName('');
      
      // Refresh the parent directory immediately for real-time update
      await refreshDirectory(parentPath);
      
    } catch (error) {
      console.error('Failed to rename item:', error);
      setLocalError('Failed to rename item');
    }
  }, [createFile, createDirectory, deleteFile, refreshDirectory, rootDirectory]);

  const handleRenameCancel = useCallback(() => {
    setRenameItem(null);
    setNewItemName('');
  }, []);

  // Drag and drop handlers
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (!fileExplorerRef.current?.contains(event.relatedTarget as Node)) {
      setDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(async (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      try {
        const result = await uploadFiles(files, rootDirectory);
        if (result.errors && result.errors.length > 0) {
          console.warn('Upload errors:', result.errors);
        }
        
        // Refresh root directory
        refreshDirectory(rootDirectory);
      } catch (error) {
        console.error('Failed to upload files:', error);
      }
    }
  }, [uploadFiles, rootDirectory, refreshDirectory]);

  const flatTree = buildFlatTree();

  return (
    <div 
      ref={fileExplorerRef}
      className={`h-full bg-[#252526] text-[#cccccc] overflow-auto ${dragOver ? 'bg-blue-900/20 border-2 border-blue-500 border-dashed' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#2d2d30]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-[#cccccc] uppercase tracking-wide">Explorer</h3>
          <div className="flex gap-1">
            <button
              onClick={() => setShowNewFileInput(true)}
              className="p-1 hover:bg-[#2a2d2e] rounded text-xs"
              title="New File"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              onClick={() => setShowNewFolderInput(true)}
              className="p-1 hover:bg-[#2a2d2e] rounded text-xs"
              title="New Folder"
            >
              <FolderPlus className="w-3 h-3" />
            </button>
            <button
              onClick={() => refreshDirectory(rootDirectory)}
              className="p-1 hover:bg-[#2a2d2e] rounded text-xs"
              title="Refresh"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>
        

      </div>

      {/* Error display */}
      {(error || localError) && (
        <div className="p-3 bg-[#5a1d1d] border-l-2 border-[#be1100]">
          <div className="text-xs text-[#f48771]">{error || localError}</div>
          <button
            onClick={() => {
              clearError();
              setLocalError(null);
            }}
            className="text-xs text-[#f48771] hover:text-[#ff6b6b] mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="p-3 text-center">
          <div className="text-xs text-[#858585]">Loading...</div>
        </div>
      )}

      {/* New file input */}
      {showNewFileInput && (
        <div className="p-2 border-b border-[#2d2d30]">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNewFile();
              if (e.key === 'Escape') {
                setShowNewFileInput(false);
                setNewItemName('');
              }
            }}
            placeholder="Enter file name..."
            className="w-full px-2 py-1 text-xs bg-[#3c3c3c] border border-[#464647] text-[#cccccc] placeholder-[#858585] focus:outline-none focus:border-[#0e639c]"
            autoFocus
          />
        </div>
      )}

      {/* New folder input */}
      {showNewFolderInput && (
        <div className="p-2 border-b border-[#2d2d30]">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNewFolder();
              if (e.key === 'Escape') {
                setShowNewFolderInput(false);
                setNewItemName('');
              }
            }}
            placeholder="Enter folder name..."
            className="w-full px-2 py-1 text-xs bg-[#3c3c3c] border border-[#464647] text-[#cccccc] placeholder-[#858585] focus:outline-none focus:border-[#0e639c]"
            autoFocus
          />
        </div>
      )}

      {/* File tree */}
      <div className="py-1">
        {dragOver && (
          <div className="text-center py-8 text-[#75beff] text-sm">
            Drop files here to upload
          </div>
        )}
        
        {!loading && flatTree.length === 0 && !dragOver && (
          <div className="text-center py-8 text-[#858585] text-sm">
            No files or folders
          </div>
        )}

        {flatTree.map((node) => (
          <div
            key={node.item.path}
            className={`flex items-center px-2 py-1 text-sm cursor-pointer hover:bg-[#2a2d2e] ${
              selectedItem === node.item.path ? 'bg-[#094771]' : ''
            }`}
            style={{ paddingLeft: `${8 + node.level * 16}px` }}
            onClick={() => handleItemClick(node)}
            onContextMenu={(e) => handleContextMenu(e, node.item)}
          >
            {node.item.type === 'directory' && (
              <span className="mr-1">
                {node.expanded ? (
                  <ChevronDown className="w-3 h-3 text-[#858585]" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-[#858585]" />
                )}
              </span>
            )}
            <span className="mr-2">
              {getFileIcon(node.item, node.expanded)}
            </span>
            {renameItem === node.item.path ? (
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameSubmit(node.item.path, newItemName);
                  }
                  if (e.key === 'Escape') {
                    handleRenameCancel();
                  }
                }}
                onBlur={() => handleRenameCancel()}
                className="flex-1 px-1 bg-[#3c3c3c] border border-[#464647] text-xs text-[#cccccc] focus:outline-none focus:border-[#0e639c]"
                autoFocus
              />
            ) : (
              <span className={`flex-1 truncate text-xs ${getSyntaxClass(node.item)}`}>
                {node.item.name}
              </span>
            )}
            {node.item.type === 'file' && (
              <span className="text-xs text-[#858585] ml-2">
                {Math.round((node.item as FileInfo).size / 1024)}KB
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Context menu */}
      {contextMenu.visible && contextMenu.item && (
        <div
          ref={contextMenuRef}
          className="fixed bg-[#3c3c3c] border border-[#464647] shadow-lg py-1 z-50 text-xs"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.item.type === 'directory' && (
            <>
              <div className="relative">
                <button
                  onMouseEnter={() => setContextMenu(prev => ({ ...prev, showNewSubmenu: true }))}
                  className="flex items-center justify-between w-full px-3 py-1 text-left hover:bg-[#2a2d2e] text-[#cccccc]"
                >
                  <div className="flex items-center">
                    <Plus className="w-3 h-3 mr-2" />
                    New
                  </div>
                  <ChevronRight className="w-3 h-3" />
                </button>
                
                {/* Submenu */}
                {contextMenu.showNewSubmenu && (
                  <div
                    className="absolute left-full top-0 bg-[#3c3c3c] border border-[#464647] shadow-lg py-1 min-w-[120px]"
                    onMouseLeave={() => setContextMenu(prev => ({ ...prev, showNewSubmenu: false }))}
                  >
                    <button
                      onClick={() => {
                        setCurrentDirectory(contextMenu.item!.path);
                        setShowNewFileInput(true);
                        setContextMenu({ visible: false, x: 0, y: 0, item: null, showNewSubmenu: false });
                      }}
                      className="flex items-center w-full px-3 py-1 text-left hover:bg-[#2a2d2e] text-[#cccccc]"
                    >
                      <FileText className="w-3 h-3 mr-2" />
                      File
                    </button>
                    <button
                      onClick={() => {
                        setCurrentDirectory(contextMenu.item!.path);
                        setShowNewFolderInput(true);
                        setContextMenu({ visible: false, x: 0, y: 0, item: null, showNewSubmenu: false });
                      }}
                      className="flex items-center w-full px-3 py-1 text-left hover:bg-[#2a2d2e] text-[#cccccc]"
                    >
                      <Folder className="w-3 h-3 mr-2" />
                      Folder
                    </button>
                  </div>
                )}
              </div>
              <div className="border-t border-[#464647] my-1"></div>
            </>
          )}
          <button
            onClick={() => handleRename(contextMenu.item!)}
            className="flex items-center w-full px-3 py-1 text-left hover:bg-[#2a2d2e] text-[#cccccc]"
          >
            <Edit3 className="w-3 h-3 mr-2" />
            Rename
          </button>
          <button
            onClick={() => handleDelete(contextMenu.item!)}
            className="flex items-center w-full px-3 py-1 text-left hover:bg-[#2a2d2e] text-[#f48771]"
          >
            <Trash2 className="w-3 h-3 mr-2" />
            Delete
          </button>
          {contextMenu.item.type === 'file' && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(contextMenu.item!.path);
                setContextMenu({ visible: false, x: 0, y: 0, item: null, showNewSubmenu: false });
              }}
              className="flex items-center w-full px-3 py-1 text-left hover:bg-[#2a2d2e] text-[#cccccc]"
            >
              <Copy className="w-3 h-3 mr-2" />
              Copy Path
            </button>
          )}
        </div>
      )}
    </div>
  );
}