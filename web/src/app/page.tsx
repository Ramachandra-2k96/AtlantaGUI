'use client';

import { Layout, CodeEditor, AtlantaRunner, Welcome } from '@/components';
import { WorkspaceProvider, useWorkspace } from '@/contexts/WorkspaceContext';
import { FileProvider } from '@/contexts/FileContext';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

function AtlantaLayout() {
  const [isAtlantaCollapsed, setIsAtlantaCollapsed] = useState(false);

  return (
    <div className="h-full">
      <PanelGroup direction="horizontal" className="h-full">
        {/* Main editor panel */}
        <Panel defaultSize={75} minSize={30}>
          <CodeEditor />
        </Panel>

        {/* Atalanta Runner panel */}
        {!isAtlantaCollapsed && (
          <>
            <PanelResizeHandle className="w-1 bg-gray-700 hover:bg-blue-500 transition-colors cursor-col-resize" />
            <Panel defaultSize={25} minSize={15} maxSize={50}>
              <div className="h-full bg-gray-900 flex flex-col">
                <div className="h-8 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-3">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Atalanta
                  </span>
                  <button
                    onClick={() => setIsAtlantaCollapsed(true)}
                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                    title="Collapse Atalanta panel"
                  >
                    <ChevronRight className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  <AtlantaRunner />
                </div>
              </div>
            </Panel>
          </>
        )}
      </PanelGroup>

      {/* Collapsed Atalanta toggle */}
      {isAtlantaCollapsed && (
        <button
          onClick={() => setIsAtlantaCollapsed(false)}
          className="fixed top-1/2 right-4 z-10 p-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded shadow-lg transition-colors"
          title="Show Atalanta panel"
        >
          <ChevronLeft className="w-4 h-4 text-gray-400" />
        </button>
      )}
    </div>
  );
}

function HomeContent() {
  const { currentWorkspace } = useWorkspace();

  // Show welcome screen if no workspace is selected
  if (!currentWorkspace) {
    return <Welcome />;
  }

  return (
    <FileProvider>
      <Layout initialLayout={{ sidebar: 25, main: 75, terminal: 30 }}>
        <AtlantaLayout />
      </Layout>
    </FileProvider>
  );
}

export default function Home() {
  return (
    <WorkspaceProvider>
      <HomeContent />
    </WorkspaceProvider>
  );
}