'use client';

import React from 'react';

interface ResultsViewerProps {
  fileType?: 'test' | 'vec' | 'log';
  content?: string;
  statistics?: Record<string, unknown>;
}

export default function ResultsViewer({ 
  fileType
}: ResultsViewerProps) {
  return (
    <div className="h-full bg-gray-900">
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-2">
          Results Viewer {fileType && `(${fileType.toUpperCase()})`}
        </h3>
        <div className="text-sm text-gray-400">
          Enhanced results viewer placeholder
        </div>
      </div>
    </div>
  );
}