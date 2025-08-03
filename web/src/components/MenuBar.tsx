'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FolderOpen, File, Save, RotateCcw } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useFile } from '@/contexts/FileContext';
import { FolderBrowser } from '@/components';

interface MenuBarProps {
  onOpenFolder?: () => void;
}

interface MenuState {
  activeMenu: string | null;
  position: { x: number; y: number };
}

export default function MenuBar({ onOpenFolder }: MenuBarProps) {
  const { currentWorkspace, setWorkspace } = useWorkspace();
  const { saveFile, saveAllFiles, currentFile, isDirty, openFiles } = useFile();
  const [menuState, setMenuState] = useState<MenuState>({ activeMenu: null, position: { x: 0, y: 0 } });
  const [showFolderBrowser, setShowFolderBrowser] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts for menu actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K Ctrl+O to open folder
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        const handleSecondKey = (e2: KeyboardEvent) => {
          if ((e2.ctrlKey || e2.metaKey) && e2.key === 'o') {
            e2.preventDefault();
            e2.stopPropagation();
            setShowFolderBrowser(true);
            document.removeEventListener('keydown', handleSecondKey, true);
            return false;
          }
          document.removeEventListener('keydown', handleSecondKey, true);
        };
        document.addEventListener('keydown', handleSecondKey, true);
        return;
      }
      
      // Ctrl+K S to save all
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        const handleSecondKey = (e2: KeyboardEvent) => {
          if (e2.key === 's') {
            e2.preventDefault();
            e2.stopPropagation();
            saveAllFiles();
            document.removeEventListener('keydown', handleSecondKey, true);
            return false;
          }
          document.removeEventListener('keydown', handleSecondKey, true);
        };
        document.addEventListener('keydown', handleSecondKey, true);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [saveAllFiles]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuState({ activeMenu: null, position: { x: 0, y: 0 } });
      }
    };

    if (menuState.activeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuState.activeMenu]);

  const handleMenuClick = (menuName: string, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (menuState.activeMenu === menuName) {
      setMenuState({ activeMenu: null, position: { x: 0, y: 0 } });
    } else {
      setMenuState({
        activeMenu: menuName,
        position: { x: rect.left, y: rect.bottom }
      });
    }
  };

  const closeMenu = () => {
    setMenuState({ activeMenu: null, position: { x: 0, y: 0 } });
  };

  const handleSave = async () => {
    if (currentFile && isDirty) {
      await saveFile();
    }
    closeMenu();
  };

  const handleSaveAll = async () => {
    await saveAllFiles();
    closeMenu();
  };

  const handleOpenFolder = () => {
    setShowFolderBrowser(true);
    closeMenu();
  };

  const handleFolderSelect = async (folderPath: string) => {
    try {
      // Auto-save all dirty files before changing workspace
      const dirtyFiles = openFiles.filter(f => f.isDirty);
      if (dirtyFiles.length > 0) {
        console.log(`Auto-saving ${dirtyFiles.length} files before workspace change...`);
        await saveAllFiles();
      }
      
      // Change workspace
      setWorkspace(folderPath);
      
      // Force a page refresh to ensure everything reloads properly
      setTimeout(() => {
        window.location.reload();
      }, 100);
      
    } catch (error) {
      console.error('Failed to save files before workspace change:', error);
      // Still change workspace even if save fails, but warn user
      if (window.confirm('Failed to save some files. Continue changing workspace anyway?')) {
        setWorkspace(folderPath);
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    }
  };

  const handleResetWorkspace = async () => {
    if (window.confirm('Are you sure you want to close the current workspace?')) {
      try {
        // Auto-save all dirty files before closing workspace
        const dirtyFiles = openFiles.filter(f => f.isDirty);
        if (dirtyFiles.length > 0) {
          console.log(`Auto-saving ${dirtyFiles.length} files before closing workspace...`);
          await saveAllFiles();
        }
        
        // Close workspace
        setWorkspace('');
        
        // Force a page refresh to ensure everything reloads properly
        setTimeout(() => {
          window.location.reload();
        }, 100);
        
      } catch (error) {
        console.error('Failed to save files before closing workspace:', error);
        // Still close workspace even if save fails, but warn user
        if (window.confirm('Failed to save some files. Continue closing workspace anyway?')) {
          setWorkspace('');
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
      }
    }
    closeMenu();
  };

  return (
    <>
      {/* Menu Bar */}
      <div className="h-7 bg-[#3c3c3c] border-b border-[#2d2d30] flex items-center px-2 text-xs text-[#cccccc] select-none">
        {/* File Menu */}
        <button
          onClick={(e) => handleMenuClick('file', e)}
          className={`px-2 py-1 hover:bg-[#2a2d2e] rounded transition-colors ${
            menuState.activeMenu === 'file' ? 'bg-[#2a2d2e]' : ''
          }`}
        >
          File
        </button>

        {/* Edit Menu */}
        <button
          onClick={(e) => handleMenuClick('edit', e)}
          className={`px-2 py-1 hover:bg-[#2a2d2e] rounded transition-colors ${
            menuState.activeMenu === 'edit' ? 'bg-[#2a2d2e]' : ''
          }`}
        >
          Edit
        </button>

        {/* Selection Menu */}
        <button
          onClick={(e) => handleMenuClick('selection', e)}
          className={`px-2 py-1 hover:bg-[#2a2d2e] rounded transition-colors ${
            menuState.activeMenu === 'selection' ? 'bg-[#2a2d2e]' : ''
          }`}
        >
          Selection
        </button>

        {/* View Menu */}
        <button
          onClick={(e) => handleMenuClick('view', e)}
          className={`px-2 py-1 hover:bg-[#2a2d2e] rounded transition-colors ${
            menuState.activeMenu === 'view' ? 'bg-[#2a2d2e]' : ''
          }`}
        >
          View
        </button>

        {/* Go Menu */}
        <button
          onClick={(e) => handleMenuClick('go', e)}
          className={`px-2 py-1 hover:bg-[#2a2d2e] rounded transition-colors ${
            menuState.activeMenu === 'go' ? 'bg-[#2a2d2e]' : ''
          }`}
        >
          Go
        </button>

        {/* Run Menu */}
        <button
          onClick={(e) => handleMenuClick('run', e)}
          className={`px-2 py-1 hover:bg-[#2a2d2e] rounded transition-colors ${
            menuState.activeMenu === 'run' ? 'bg-[#2a2d2e]' : ''
          }`}
        >
          Run
        </button>

        {/* Terminal Menu */}
        <button
          onClick={(e) => handleMenuClick('terminal', e)}
          className={`px-2 py-1 hover:bg-[#2a2d2e] rounded transition-colors ${
            menuState.activeMenu === 'terminal' ? 'bg-[#2a2d2e]' : ''
          }`}
        >
          Terminal
        </button>

        {/* Help Menu */}
        <button
          onClick={(e) => handleMenuClick('help', e)}
          className={`px-2 py-1 hover:bg-[#2a2d2e] rounded transition-colors ${
            menuState.activeMenu === 'help' ? 'bg-[#2a2d2e]' : ''
          }`}
        >
          Help
        </button>

        {/* Development indicator */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[#858585] text-xs">Development Mode</span>
          {currentWorkspace && (
            <span className="text-[#4FC1FF] text-xs">
              {currentWorkspace.split('/').pop() || currentWorkspace}
            </span>
          )}
        </div>
      </div>

      {/* Dropdown Menus */}
      {menuState.activeMenu && (
        <div
          ref={menuRef}
          className="fixed bg-[#3c3c3c] border border-[#464647] shadow-lg py-1 z-50 text-xs min-w-[200px]"
          style={{ left: menuState.position.x, top: menuState.position.y }}
        >
          {menuState.activeMenu === 'file' && (
            <>
              <button
                onClick={handleOpenFolder}
                className="flex items-center w-full px-3 py-2 text-left hover:bg-[#2a2d2e] text-[#cccccc]"
              >
                <FolderOpen className="w-4 h-4 mr-3" />
                Open Folder...
                <span className="ml-auto text-[#858585]">Ctrl+K Ctrl+O</span>
              </button>
              <div className="border-t border-[#464647] my-1"></div>
              <button
                onClick={handleSave}
                className={`flex items-center w-full px-3 py-2 text-left hover:bg-[#2a2d2e] ${
                  currentFile && isDirty ? 'text-[#cccccc]' : 'text-[#858585]'
                }`}
                disabled={!currentFile || !isDirty}
              >
                <Save className="w-4 h-4 mr-3" />
                Save
                <span className="ml-auto text-[#858585]">Ctrl+S</span>
              </button>
              <button
                onClick={handleSaveAll}
                className={`flex items-center w-full px-3 py-2 text-left hover:bg-[#2a2d2e] ${
                  openFiles.some(f => f.isDirty) ? 'text-[#cccccc]' : 'text-[#858585]'
                }`}
                disabled={!openFiles.some(f => f.isDirty)}
              >
                <File className="w-4 h-4 mr-3" />
                Save All
                <span className="ml-auto text-[#858585]">Ctrl+K S</span>
              </button>
              <div className="border-t border-[#464647] my-1"></div>
              <button
                onClick={handleResetWorkspace}
                className="flex items-center w-full px-3 py-2 text-left hover:bg-[#2a2d2e] text-[#cccccc]"
                disabled={!currentWorkspace}
              >
                <RotateCcw className="w-4 h-4 mr-3" />
                Close Workspace
              </button>
            </>
          )}

          {menuState.activeMenu === 'edit' && (
            <div className="px-3 py-2 text-[#858585]">
              Edit menu coming soon...
            </div>
          )}

          {menuState.activeMenu === 'selection' && (
            <div className="px-3 py-2 text-[#858585]">
              Selection menu coming soon...
            </div>
          )}

          {menuState.activeMenu === 'view' && (
            <div className="px-3 py-2 text-[#858585]">
              View menu coming soon...
            </div>
          )}

          {menuState.activeMenu === 'go' && (
            <div className="px-3 py-2 text-[#858585]">
              Go menu coming soon...
            </div>
          )}

          {menuState.activeMenu === 'run' && (
            <div className="px-3 py-2 text-[#858585]">
              Run menu coming soon...
            </div>
          )}

          {menuState.activeMenu === 'terminal' && (
            <div className="px-3 py-2 text-[#858585]">
              Terminal menu coming soon...
            </div>
          )}

          {menuState.activeMenu === 'help' && (
            <div className="px-3 py-2 text-[#858585]">
              Help menu coming soon...
            </div>
          )}
        </div>
      )}

      {/* Folder Browser Modal */}
      <FolderBrowser
        isOpen={showFolderBrowser}
        onClose={() => setShowFolderBrowser(false)}
        onSelectFolder={handleFolderSelect}
        currentPath={currentWorkspace || undefined}
      />
    </>
  );
}