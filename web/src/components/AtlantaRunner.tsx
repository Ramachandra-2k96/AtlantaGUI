'use client';

import React from 'react';
import { AtlantaParameters, AtlantaResult } from '@/types';

interface AtlantaRunnerProps {
  selectedFile?: string;
  onExecute?: (params: AtlantaParameters) => void;
  onComplete?: (result: AtlantaResult) => void;
}

export default function AtlantaRunner({ 
  selectedFile
}: AtlantaRunnerProps) {
  return (
    <div className="h-full bg-gray-800">
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-2">Atalanta Runner</h3>
        <div className="text-sm text-gray-400">
          {selectedFile ? `Selected: ${selectedFile}` : 'No file selected'}
        </div>
        <div className="text-sm text-gray-400 mt-2">
          Atalanta execution interface placeholder
        </div>
      </div>
    </div>
  );
}