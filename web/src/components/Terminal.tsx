'use client';

import React from 'react';

interface TerminalProps {
  sessionId?: string;
  onCommand?: (command: string) => void;
  initialDirectory?: string;
}

export default function Terminal({ sessionId, onCommand, initialDirectory }: TerminalProps) {
  return (
    <div className="h-full bg-vscode-terminal">
      <div className="p-3">
        <div className="text-sm text-vscode-success mb-2">
          user@atalanta:~$ 
        </div>
        <div className="text-xs text-vscode-foreground-muted">
          xterm.js terminal component placeholder
        </div>
      </div>
    </div>
  );
}