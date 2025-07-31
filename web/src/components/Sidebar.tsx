'use client';

import React, { useState } from 'react';
import { FileExplorer } from '@/components';
import { Files, Search, GitBranch, Settings } from 'lucide-react';

interface SidebarProps {
  className?: string;
}

type SidebarTab = 'explorer' | 'search' | 'git' | 'settings';

export default function Sidebar({ className = '' }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('explorer');

  const tabs = [
    { id: 'explorer' as SidebarTab, icon: Files, label: 'Explorer' },
    { id: 'search' as SidebarTab, icon: Search, label: 'Search' },
    { id: 'git' as SidebarTab, icon: GitBranch, label: 'Source Control' },
    { id: 'settings' as SidebarTab, icon: Settings, label: 'Settings' },
  ];

  const renderTabContent = () => {
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

  return (
    <div className={`h-full flex ${className}`}>
      {/* Tab Bar */}
      <div className="w-12 bg-vscode-titlebar border-r border-vscode-border flex flex-col">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                w-12 h-12 flex items-center justify-center border-l-2 transition-colors
                ${activeTab === tab.id 
                  ? 'bg-vscode-sidebar border-vscode-accent text-vscode-foreground' 
                  : 'border-transparent text-vscode-foreground-muted hover:text-vscode-foreground hover:bg-vscode-hover'
                }
              `}
              title={tab.label}
              aria-label={tab.label}
            >
              <Icon size={20} />
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 bg-vscode-sidebar">
        {renderTabContent()}
      </div>
    </div>
  );
}