'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Panel, PanelGroup, PanelResizeHandle, ImperativePanelHandle } from 'react-resizable-panels';
import { Menu, X, ChevronLeft, Files, Search, GitBranch, Settings, FolderOpen } from 'lucide-react';
import { FileExplorer, Terminal } from '@/components';
import { useWorkspace } from '@/contexts/WorkspaceContext';

type SidebarTab = 'explorer' | 'search' | 'git' | 'settings';

interface LayoutProps {
  children: React.ReactNode;
  initialLayout?: {
    sidebar: number;
    main: number;
    terminal: number;
  };
}

export default function Layout({ 
  children, 
  initialLayout = { sidebar: 20, main: 60, terminal: 20 } 
}: LayoutProps) {
  const { currentWorkspace, clearWorkspace } = useWorkspace();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isTerminalCollapsed, setIsTerminalCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>('explorer');
  
  // Refs for imperative panel control
  const sidebarPanelRef = useRef<ImperativePanelHandle>(null);
  const [savedSidebarSize, setSavedSidebarSize] = useState(initialLayout.sidebar);

  // Render sidebar content based on active tab
  const renderSidebarContent = () => {
    switch (activeTab) {
      case 'explorer':
        return <FileExplorer />;
      case 'search':
        return (
          <div className="p-3">
            <div className="text-xs text-vscode-foreground-muted mb-3">
              Search functionality coming soon
            </div>
          </div>
        );
      case 'git':
        return (
          <div className="p-3">
            <div className="text-xs text-vscode-foreground-muted mb-3">
              Git integration coming soon
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="p-3">
            <div className="text-xs text-vscode-foreground-muted mb-3">
              Settings panel coming soon
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Get tab label for header
  const getTabLabel = () => {
    switch (activeTab) {
      case 'explorer': return 'Explorer';
      case 'search': return 'Search';
      case 'git': return 'Source Control';
      case 'settings': return 'Settings';
      default: return '';
    }
  };

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsSidebarCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = (tab?: SidebarTab) => {
    if (isMobile) {
      setShowMobileMenu(!showMobileMenu);
    } else {
      if (isSidebarCollapsed) {
        // Expanding: show the sidebar panel
        setIsSidebarCollapsed(false);
        if (tab) setActiveTab(tab);
      } else if (!tab) {
        // Chevron button clicked: always collapse
        const currentSize = sidebarPanelRef.current?.getSize();
        if (currentSize && currentSize > 15) {
          setSavedSidebarSize(currentSize);
        }
        setIsSidebarCollapsed(true);
      } else if (tab && activeTab === tab) {
        // Same tab clicked: collapse
        const currentSize = sidebarPanelRef.current?.getSize();
        if (currentSize && currentSize > 15) {
          setSavedSidebarSize(currentSize);
        }
        setIsSidebarCollapsed(true);
      } else if (tab) {
        // Different tab clicked: switch tab
        setActiveTab(tab);
      }
    }
  };

  const toggleTerminal = () => {
    setIsTerminalCollapsed(!isTerminalCollapsed);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + B to toggle explorer
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar('explorer');
      }
      // Ctrl/Cmd + ` to toggle terminal
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        toggleTerminal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, toggleTerminal]);

  return (
    <div className="h-screen w-full bg-vscode-bg text-vscode-foreground font-mono overflow-hidden">
      {/* Mobile Header */}
      {isMobile && (
        <div className="h-12 bg-gray-800 border-b border-gray-700 flex items-center px-4">
          <button
            onClick={() => toggleSidebar('explorer')}
            className="p-2 hover:bg-gray-700 rounded transition-colors"
            aria-label="Toggle menu"
          >
            <Menu size={20} />
          </button>
          <div className="ml-3 flex items-center flex-1 min-w-0">
            <FolderOpen size={16} className="text-blue-400 mr-2 flex-shrink-0" />
            <span className="text-sm font-medium truncate">
              {currentWorkspace ? currentWorkspace.split('/').pop() || currentWorkspace : 'Atalanta GUI'}
            </span>
          </div>
          <button
            onClick={clearWorkspace}
            className="p-2 hover:bg-gray-700 rounded transition-colors text-xs text-gray-400"
            title="Close workspace"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {isMobile && showMobileMenu && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-50"
          onClick={() => setShowMobileMenu(false)}
        >
          <div 
            className="w-80 max-w-[80vw] h-full bg-vscode-sidebar border-r border-vscode-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-vscode-border">
              <h2 className="text-sm font-medium">Explorer</h2>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-1 hover:bg-vscode-hover rounded transition-colors"
                aria-label="Close menu"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <FileExplorer />
            </div>
          </div>
        </div>
      )}

      {/* Desktop Layout */}
      <div className={`flex-1 ${isMobile ? 'h-[calc(100vh-3rem)]' : 'h-full'} flex`}>
        {/* Activity Bar - Always visible, fixed width */}
        {!isMobile && (
          <div className="w-12 bg-vscode-sidebar border-r border-vscode-border flex flex-col items-center py-2 flex-shrink-0">
            {/* Explorer Icon */}
            <button
              onClick={() => toggleSidebar('explorer')}
              className={`w-8 h-8 flex items-center justify-center rounded hover:bg-vscode-hover transition-colors mb-1 ${
                !isSidebarCollapsed && activeTab === 'explorer' ? 'bg-vscode-accent text-vscode-accent-foreground' : 'text-vscode-foreground-muted'
              }`}
              aria-label="Explorer"
              title="Explorer"
            >
              <Files size={16} />
            </button>
            
            {/* Search Icon */}
            <button
              onClick={() => toggleSidebar('search')}
              className={`w-8 h-8 flex items-center justify-center rounded hover:bg-vscode-hover transition-colors mb-1 ${
                !isSidebarCollapsed && activeTab === 'search' ? 'bg-vscode-accent text-vscode-accent-foreground' : 'text-vscode-foreground-muted'
              }`}
              aria-label="Search"
              title="Search"
            >
              <Search size={16} />
            </button>
            
            {/* Source Control Icon */}
            <button
              onClick={() => toggleSidebar('git')}
              className={`w-8 h-8 flex items-center justify-center rounded hover:bg-vscode-hover transition-colors mb-1 ${
                !isSidebarCollapsed && activeTab === 'git' ? 'bg-vscode-accent text-vscode-accent-foreground' : 'text-vscode-foreground-muted'
              }`}
              aria-label="Source Control"
              title="Source Control"
            >
              <GitBranch size={16} />
            </button>
            
            {/* Settings Icon */}
            <button
              onClick={() => toggleSidebar('settings')}
              className={`w-8 h-8 flex items-center justify-center rounded hover:bg-vscode-hover transition-colors mb-1 ${
                !isSidebarCollapsed && activeTab === 'settings' ? 'bg-vscode-accent text-vscode-accent-foreground' : 'text-vscode-foreground-muted'
              }`}
              aria-label="Settings"
              title="Settings"
            >
              <Settings size={16} />
            </button>
          </div>
        )}

        {/* Resizable Content Area */}
        <div className="flex-1">
          <PanelGroup direction="horizontal" className="h-full">
            {/* Sidebar Panel - BACK ON LEFT SIDE where it belongs! */}
            {!isMobile && !isSidebarCollapsed && (
              <>
                <Panel
                  ref={sidebarPanelRef}
                  defaultSize={initialLayout.sidebar}
                  minSize={15}
                  maxSize={50}
                  className="bg-vscode-sidebar"
                  collapsible={false}
                  onResize={(size) => {
                    if (size > 10) {
                      setSavedSidebarSize(size);
                    }
                  }}
                >
                  <div className="h-full flex flex-col">
                    {/* Sidebar Header */}
                    <div className="h-8 bg-vscode-titlebar border-b border-vscode-border flex items-center justify-between px-3 flex-shrink-0">
                      <span className="text-xs font-medium uppercase tracking-wide text-vscode-foreground-muted">
                        {getTabLabel()}
                      </span>
                      <button
                        onClick={() => toggleSidebar()}
                        className="p-1 hover:bg-vscode-hover rounded transition-colors"
                        aria-label="Collapse sidebar"
                      >
                        <ChevronLeft size={14} />
                      </button>
                    </div>
                    
                    {/* Sidebar Content */}
                    <div className="flex-1 overflow-hidden">
                      {renderSidebarContent()}
                    </div>
                  </div>
                </Panel>

                <PanelResizeHandle className="w-1 bg-vscode-border hover:bg-vscode-accent transition-colors cursor-col-resize" />
              </>
            )}

            {/* Main Content Panel */}
            <Panel defaultSize={isMobile ? 100 : (isSidebarCollapsed ? 100 : initialLayout.main)} minSize={30}>
              <PanelGroup direction="vertical" className="h-full">
                {/* Editor Panel */}
                <Panel defaultSize={70} minSize={30} className="bg-vscode-editor">
                  <div className="h-full flex flex-col">
                    {/* Tab Bar */}
                    <div className="h-8 bg-gray-800 border-b border-gray-700 flex items-center">
                      <div className="flex-1 flex items-center px-2">
                        {/* Workspace indicator */}
                        <div className="flex items-center mr-4">
                          <FolderOpen size={14} className="text-blue-400 mr-2" />
                          <span className="text-xs text-gray-300 font-medium">
                            {currentWorkspace ? currentWorkspace.split('/').pop() || currentWorkspace : 'No workspace'}
                          </span>
                        </div>                       
                      </div>
                      <button
                        onClick={clearWorkspace}
                        className="p-1 hover:bg-gray-700 rounded transition-colors text-xs text-gray-400 mr-2"
                        title="Close workspace"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    
                    {/* Editor Content */}
                    <div className="flex-1 overflow-hidden">
                      {children}
                    </div>
                  </div>
                </Panel>

                {/* Terminal Panel */}
                {!isTerminalCollapsed && (
                  <>
                    <PanelResizeHandle className="h-1 bg-vscode-border hover:bg-vscode-accent transition-colors cursor-row-resize" />
                    <Panel 
                      defaultSize={30} 
                      minSize={15} 
                      maxSize={60}
                      className="bg-vscode-terminal"
                    >
                      <div className="h-full flex flex-col">
                        {/* Terminal Header */}
                        <div className="h-8 bg-vscode-titlebar border-b border-vscode-border flex items-center justify-between px-3">
                          <span className="text-xs font-medium uppercase tracking-wide text-vscode-foreground-muted">
                            Terminal
                          </span>
                          <button
                            onClick={toggleTerminal}
                            className="p-1 hover:bg-vscode-hover rounded transition-colors"
                            aria-label="Hide terminal"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        
                        {/* Terminal Content */}
                        <div className="flex-1 overflow-hidden">
                          <Terminal />
                        </div>
                      </div>
                    </Panel>
                  </>
                )}
              </PanelGroup>
            </Panel>
          </PanelGroup>
        </div>
      </div>



      {/* Collapsed Terminal Toggle */}
      {isTerminalCollapsed && (
        <button
          onClick={toggleTerminal}
          className="fixed bottom-4 right-4 z-10 px-3 py-2 bg-vscode-accent text-vscode-accent-foreground rounded shadow-lg hover:bg-vscode-accent-hover transition-colors text-xs font-medium"
          aria-label="Show terminal"
        >
          Terminal
        </button>
      )}
    </div>
  );
}