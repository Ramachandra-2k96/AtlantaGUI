'use client';

import React, { useState, useMemo } from 'react';
import { Download, FileText, BarChart3, Search, Copy, Check } from 'lucide-react';

interface ResultsViewerProps {
  fileType?: 'test' | 'vec' | 'log';
  content?: string;
  statistics?: Record<string, unknown>;
  fileName?: string;
}

interface ParsedTestFile {
  circuitName: string;
  primaryInputs: string[];
  primaryOutputs: string[];
  testPatterns: Array<{
    inputs: string;
    outputs: string;
  }>;
}

interface ParsedLogFile {
  circuitName: string;
  summary: {
    circuitStructure: Record<string, string | number>;
    atpgParameters: Record<string, string | number>;
    testResults: Record<string, string | number>;
    memoryUsed: string;
    cpuTime: Record<string, string>;
  };
  faultDetectionLog: Array<{
    patternNumber: number;
    pattern: string;
    faultsDetected: number;
  }>;
}

interface ParsedVecFile {
  patterns: string[];
  inputWidth: number;
  patternCount: number;
}

export default function ResultsViewer({ 
  fileType,
  content,
  fileName
}: ResultsViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showStatistics, setShowStatistics] = useState(true);
  const [copied, setCopied] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'txt'>('csv');

  // Parse content based on file type
  const parsedData = useMemo(() => {
    if (!content) return null;

    switch (fileType) {
      case 'test':
        return parseTestFile(content);
      case 'vec':
        return parseVecFile(content);
      case 'log':
        return parseLogFile(content);
      default:
        return null;
    }
  }, [content, fileType]);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!parsedData || !searchTerm) return parsedData;

    if (fileType === 'test' && 'testPatterns' in parsedData) {
      return {
        ...parsedData,
        testPatterns: parsedData.testPatterns.filter((pattern, index) =>
          pattern.inputs.includes(searchTerm) ||
          pattern.outputs.includes(searchTerm) ||
          index.toString().includes(searchTerm)
        )
      };
    }

    if (fileType === 'vec' && 'patterns' in parsedData) {
      return {
        ...parsedData,
        patterns: parsedData.patterns.filter((pattern, index) =>
          pattern.includes(searchTerm) || index.toString().includes(searchTerm)
        )
      };
    }

    if (fileType === 'log' && 'faultDetectionLog' in parsedData) {
      return {
        ...parsedData,
        faultDetectionLog: parsedData.faultDetectionLog.filter(entry =>
          entry.pattern.includes(searchTerm) ||
          entry.patternNumber.toString().includes(searchTerm) ||
          entry.faultsDetected.toString().includes(searchTerm)
        )
      };
    }

    return parsedData;
  }, [parsedData, searchTerm, fileType]);

  const handleCopy = async () => {
    if (content) {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExport = () => {
    if (!parsedData || !fileName) return;

    let exportContent = '';
    let mimeType = 'text/plain';
    let extension = 'txt';

    switch (exportFormat) {
      case 'csv':
        exportContent = exportToCSV(parsedData, fileType);
        mimeType = 'text/csv';
        extension = 'csv';
        break;
      case 'json':
        exportContent = JSON.stringify(parsedData, null, 2);
        mimeType = 'application/json';
        extension = 'json';
        break;
      case 'txt':
        exportContent = content || '';
        mimeType = 'text/plain';
        extension = 'txt';
        break;
    }

    const blob = new Blob([exportContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.replace(/\.[^/.]+$/, '')}_export.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!content) {
    return (
      <div className="h-full bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No file selected</p>
          <p className="text-sm text-gray-500 mt-2">
            Select a .test, .vec, or .log file to view results
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <h3 className="text-sm font-medium text-gray-300">
            Results Viewer {fileType && `(${fileType.toUpperCase()})`}
          </h3>
          {fileName && (
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
              {fileName}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search patterns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-800 text-gray-300 text-xs pl-8 pr-3 py-1 rounded border border-gray-600 focus:border-blue-500 focus:outline-none w-40"
            />
          </div>

          {/* Statistics Toggle */}
          <button
            onClick={() => setShowStatistics(!showStatistics)}
            className={`p-1 rounded text-xs ${
              showStatistics ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
            title="Toggle Statistics"
          >
            <BarChart3 className="w-4 h-4" />
          </button>

          {/* Export */}
          <div className="flex items-center space-x-1">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json' | 'txt')}
              className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded border border-gray-600"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
              <option value="txt">TXT</option>
            </select>
            <button
              onClick={handleExport}
              className="p-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-xs"
              title="Export Data"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          {/* Copy */}
          <button
            onClick={handleCopy}
            className="p-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-xs"
            title="Copy to Clipboard"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {showStatistics && parsedData && (
          <div className="p-4 border-b border-gray-700">
            <StatisticsPanel data={parsedData} fileType={fileType} />
          </div>
        )}

        <div className="flex-1 overflow-auto p-4">
          {fileType === 'test' && filteredData && 'testPatterns' in filteredData && (
            <TestFileViewer data={filteredData} searchTerm={searchTerm} />
          )}
          {fileType === 'vec' && filteredData && 'patterns' in filteredData && (
            <VecFileViewer data={filteredData} searchTerm={searchTerm} />
          )}
          {fileType === 'log' && filteredData && 'summary' in filteredData && (
            <LogFileViewer data={filteredData} searchTerm={searchTerm} />
          )}
        </div>
      </div>
    </div>
  );
}

// Statistics Panel Component
function StatisticsPanel({ data, fileType }: { data: ParsedTestFile | ParsedVecFile | ParsedLogFile; fileType?: string }) {
  const stats = useMemo(() => {
    switch (fileType) {
      case 'test':
        if ('testPatterns' in data) {
          return [
            { label: 'Circuit', value: data.circuitName },
            { label: 'Primary Inputs', value: data.primaryInputs.length },
            { label: 'Primary Outputs', value: data.primaryOutputs.length },
            { label: 'Test Patterns', value: data.testPatterns.length },
          ];
        }
        break;
      case 'vec':
        if ('patterns' in data) {
          return [
            { label: 'Pattern Count', value: data.patternCount },
            { label: 'Input Width', value: data.inputWidth },
            { label: 'Total Bits', value: data.patternCount * data.inputWidth },
          ];
        }
        break;
      case 'log':
        if ('summary' in data) {
          const { circuitStructure, testResults } = data.summary;
          return [
            { label: 'Gates', value: circuitStructure['Number of gates'] },
            { label: 'Fault Coverage', value: testResults['Fault coverage'] },
            { label: 'Test Patterns', value: testResults['Number of test patterns after compaction'] },
            { label: 'Detected Faults', value: data.faultDetectionLog.length },
          ];
        }
        break;
    }
    return [];
  }, [data, fileType]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div key={index} className="bg-gray-800 p-3 rounded">
          <div className="text-xs text-gray-400 mb-1">{stat.label}</div>
          <div className="text-sm font-medium text-gray-200">{stat.value}</div>
        </div>
      ))}
    </div>
  );
}

// Test File Viewer Component
function TestFileViewer({ data, searchTerm }: { data: ParsedTestFile; searchTerm: string }) {
  const [showInputs, setShowInputs] = useState(true);
  const [showOutputs, setShowOutputs] = useState(true);

  const highlightText = (text: string, search: string) => {
    if (!search) return text;
    const parts = text.split(new RegExp(`(${search})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === search.toLowerCase() ? (
        <span key={index} className="bg-yellow-600 text-black px-1 rounded">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Circuit Information */}
      <div className="bg-gray-800 p-4 rounded">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Circuit Information</h4>
        <div className="space-y-2 text-xs">
          <div><span className="text-gray-400">Name:</span> <span className="text-gray-200">{data.circuitName}</span></div>
          <div><span className="text-gray-400">Primary Inputs:</span> <span className="text-gray-200">{data.primaryInputs.length}</span></div>
          <div><span className="text-gray-400">Primary Outputs:</span> <span className="text-gray-200">{data.primaryOutputs.length}</span></div>
        </div>
      </div>

      {/* I/O Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-800 p-4 rounded">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-300">Primary Inputs</h4>
            <button
              onClick={() => setShowInputs(!showInputs)}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              {showInputs ? 'Hide' : 'Show'}
            </button>
          </div>
          {showInputs && (
            <div className="max-h-32 overflow-auto">
              <div className="grid grid-cols-2 gap-1 text-xs">
                {data.primaryInputs.map((input, index) => (
                  <div key={index} className="text-gray-300 font-mono">
                    {highlightText(input, searchTerm)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-800 p-4 rounded">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-300">Primary Outputs</h4>
            <button
              onClick={() => setShowOutputs(!showOutputs)}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              {showOutputs ? 'Hide' : 'Show'}
            </button>
          </div>
          {showOutputs && (
            <div className="max-h-32 overflow-auto">
              <div className="grid grid-cols-1 gap-1 text-xs">
                {data.primaryOutputs.slice(0, 20).map((output, index) => (
                  <div key={index} className="text-gray-300 font-mono">
                    {highlightText(output, searchTerm)}
                  </div>
                ))}
                {data.primaryOutputs.length > 20 && (
                  <div className="text-gray-500 text-xs">
                    ... and {data.primaryOutputs.length - 20} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Test Patterns */}
      <div className="bg-gray-800 p-4 rounded">
        <h4 className="text-sm font-medium text-gray-300 mb-3">
          Test Patterns ({data.testPatterns.length})
        </h4>
        <div className="overflow-auto max-h-96">
          <table className="w-full text-xs font-mono">
            <thead className="sticky top-0 bg-gray-700">
              <tr>
                <th className="text-left p-2 text-gray-300">#</th>
                <th className="text-left p-2 text-gray-300">Input Pattern</th>
                <th className="text-left p-2 text-gray-300">Expected Output</th>
              </tr>
            </thead>
            <tbody>
              {data.testPatterns.map((pattern, index) => (
                <tr key={index} className="border-t border-gray-700 hover:bg-gray-750">
                  <td className="p-2 text-gray-400">{index + 1}</td>
                  <td className="p-2 text-green-400 break-all">
                    {highlightText(pattern.inputs, searchTerm)}
                  </td>
                  <td className="p-2 text-blue-400 break-all">
                    {highlightText(pattern.outputs.substring(0, 100), searchTerm)}
                    {pattern.outputs.length > 100 && '...'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Vec File Viewer Component
function VecFileViewer({ data, searchTerm }: { data: ParsedVecFile; searchTerm: string }) {
  const highlightText = (text: string, search: string) => {
    if (!search) return text;
    const parts = text.split(new RegExp(`(${search})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === search.toLowerCase() ? (
        <span key={index} className="bg-yellow-600 text-black px-1 rounded">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <div className="space-y-4">
      {/* Vector Patterns */}
      <div className="bg-gray-800 p-4 rounded">
        <h4 className="text-sm font-medium text-gray-300 mb-3">
          Test Vectors ({data.patterns.length} patterns, {data.inputWidth} bits each)
        </h4>
        <div className="overflow-auto max-h-96">
          <table className="w-full text-xs font-mono">
            <thead className="sticky top-0 bg-gray-700">
              <tr>
                <th className="text-left p-2 text-gray-300 w-16">#</th>
                <th className="text-left p-2 text-gray-300">Vector Pattern</th>
                <th className="text-left p-2 text-gray-300 w-20">Bits</th>
              </tr>
            </thead>
            <tbody>
              {data.patterns.map((pattern, index) => (
                <tr key={index} className="border-t border-gray-700 hover:bg-gray-750">
                  <td className="p-2 text-gray-400">{index + 1}</td>
                  <td className="p-2 text-green-400 break-all">
                    {highlightText(pattern, searchTerm)}
                  </td>
                  <td className="p-2 text-gray-400">{pattern.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pattern Analysis */}
      <div className="bg-gray-800 p-4 rounded">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Pattern Analysis</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-gray-400">Total Patterns</div>
            <div className="text-gray-200 font-medium">{data.patterns.length}</div>
          </div>
          <div>
            <div className="text-gray-400">Input Width</div>
            <div className="text-gray-200 font-medium">{data.inputWidth}</div>
          </div>
          <div>
            <div className="text-gray-400">Total Bits</div>
            <div className="text-gray-200 font-medium">{data.patterns.length * data.inputWidth}</div>
          </div>
          <div>
            <div className="text-gray-400">Avg. Ones</div>
            <div className="text-gray-200 font-medium">
              {data.patterns.length > 0 
                ? Math.round((data.patterns.reduce((sum, pattern) => 
                    sum + (pattern.match(/1/g) || []).length, 0) / data.patterns.length) * 10) / 10
                : 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Log File Viewer Component
function LogFileViewer({ data, searchTerm }: { data: ParsedLogFile; searchTerm: string }) {
  const [showFullLog, setShowFullLog] = useState(false);

  const highlightText = (text: string, search: string) => {
    if (!search) return text;
    const parts = text.split(new RegExp(`(${search})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === search.toLowerCase() ? (
        <span key={index} className="bg-yellow-600 text-black px-1 rounded">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Circuit Structure */}
        <div className="bg-gray-800 p-4 rounded">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Circuit Structure</h4>
          <div className="space-y-2 text-xs">
            {Object.entries(data.summary.circuitStructure).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-400">{key}:</span>
                <span className="text-gray-200">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Test Results */}
        <div className="bg-gray-800 p-4 rounded">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Test Results</h4>
          <div className="space-y-2 text-xs">
            {Object.entries(data.summary.testResults).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-400">{key}:</span>
                <span className="text-gray-200">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ATPG Parameters */}
        <div className="bg-gray-800 p-4 rounded">
          <h4 className="text-sm font-medium text-gray-300 mb-3">ATPG Parameters</h4>
          <div className="space-y-2 text-xs">
            {Object.entries(data.summary.atpgParameters).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-400">{key}:</span>
                <span className="text-gray-200">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Performance */}
        <div className="bg-gray-800 p-4 rounded">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Performance</h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Memory Used:</span>
              <span className="text-gray-200">{data.summary.memoryUsed}</span>
            </div>
            {Object.entries(data.summary.cpuTime).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-400">{key}:</span>
                <span className="text-gray-200">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fault Detection Log */}
      <div className="bg-gray-800 p-4 rounded">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-300">
            Fault Detection Log ({data.faultDetectionLog.length} patterns)
          </h4>
          <button
            onClick={() => setShowFullLog(!showFullLog)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {showFullLog ? 'Show Less' : 'Show All'}
          </button>
        </div>
        <div className="overflow-auto max-h-96">
          <table className="w-full text-xs font-mono">
            <thead className="sticky top-0 bg-gray-700">
              <tr>
                <th className="text-left p-2 text-gray-300 w-16">#</th>
                <th className="text-left p-2 text-gray-300">Test Pattern</th>
                <th className="text-left p-2 text-gray-300 w-24">Faults</th>
              </tr>
            </thead>
            <tbody>
              {(showFullLog ? data.faultDetectionLog : data.faultDetectionLog.slice(0, 10))
                .map((entry, index) => (
                <tr key={index} className="border-t border-gray-700 hover:bg-gray-750">
                  <td className="p-2 text-gray-400">{entry.patternNumber}</td>
                  <td className="p-2 text-green-400 break-all">
                    {highlightText(entry.pattern.substring(0, 50), searchTerm)}
                    {entry.pattern.length > 50 && '...'}
                  </td>
                  <td className="p-2 text-yellow-400">{entry.faultsDetected}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!showFullLog && data.faultDetectionLog.length > 10 && (
            <div className="text-center p-2 text-gray-500 text-xs">
              ... and {data.faultDetectionLog.length - 10} more patterns
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Parsing Functions
function parseTestFile(content: string): ParsedTestFile {
  const lines = content.split('\n').filter(line => line.trim());
  
  // Extract circuit name
  const circuitNameMatch = content.match(/\* Name of circuit:\s*(.+)/);
  const circuitName = circuitNameMatch ? circuitNameMatch[1].trim() : 'Unknown';
  
  // Find primary inputs section
  const inputsStartIndex = lines.findIndex(line => line.includes('* Primary inputs'));
  const outputsStartIndex = lines.findIndex(line => line.includes('* Primary outputs'));
  
  // Extract primary inputs
  const primaryInputs: string[] = [];
  if (inputsStartIndex !== -1 && outputsStartIndex !== -1) {
    for (let i = inputsStartIndex + 1; i < outputsStartIndex; i++) {
      const line = lines[i].trim();
      if (line && !line.startsWith('*')) {
        primaryInputs.push(...line.split(/\s+/).filter(input => input.trim()));
      }
    }
  }
  
  // Extract primary outputs
  const primaryOutputs: string[] = [];
  let testPatternsStartIndex = -1;
  if (outputsStartIndex !== -1) {
    for (let i = outputsStartIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && !line.startsWith('*')) {
        if (line.includes('0') || line.includes('1')) {
          testPatternsStartIndex = i;
          break;
        }
        primaryOutputs.push(...line.split(/\s+/).filter(output => output.trim()));
      }
    }
  }
  
  // Extract test patterns
  const testPatterns: Array<{ inputs: string; outputs: string }> = [];
  if (testPatternsStartIndex !== -1) {
    for (let i = testPatternsStartIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && /^[01\s]+$/.test(line)) {
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          testPatterns.push({
            inputs: parts[0],
            outputs: parts.slice(1).join(' ')
          });
        }
      }
    }
  }
  
  return {
    circuitName,
    primaryInputs,
    primaryOutputs,
    testPatterns
  };
}

function parseVecFile(content: string): ParsedVecFile {
  const lines = content.split('\n').filter(line => line.trim() && /^[01]+$/.test(line.trim()));
  
  return {
    patterns: lines,
    inputWidth: lines.length > 0 ? lines[0].length : 0,
    patternCount: lines.length
  };
}

function parseLogFile(content: string): ParsedLogFile {
  const lines = content.split('\n');
  
  // Extract circuit name
  const circuitNameMatch = content.match(/\* Log file for the circuit (.+)\./);
  const circuitName = circuitNameMatch ? circuitNameMatch[1].trim() : 'Unknown';
  
  // Parse summary sections
  const summary = {
    circuitStructure: {} as Record<string, string | number>,
    atpgParameters: {} as Record<string, string | number>,
    testResults: {} as Record<string, string | number>,
    memoryUsed: '',
    cpuTime: {} as Record<string, string>
  };
  
  // Extract summary information from the structured output
  const summaryMatch = content.match(/\*{7}[\s\S]*?\*{7}/);
  if (summaryMatch) {
    const summaryText = summaryMatch[0];
    
    // Parse circuit structure
    const circuitMatch = summaryText.match(/1\. Circuit structure([\s\S]*?)2\. ATPG parameters/);
    if (circuitMatch) {
      const circuitLines = circuitMatch[1].split('\n');
      circuitLines.forEach(line => {
        const match = line.match(/^\s*(.+?)\s*:\s*(.+)$/);
        if (match) {
          summary.circuitStructure[match[1].trim()] = match[2].trim();
        }
      });
    }
    
    // Parse test results
    const resultsMatch = summaryText.match(/3\. Test pattern generation results([\s\S]*?)4\. Memory used/);
    if (resultsMatch) {
      const resultLines = resultsMatch[1].split('\n');
      resultLines.forEach(line => {
        const match = line.match(/^\s*(.+?)\s*:\s*(.+)$/);
        if (match) {
          summary.testResults[match[1].trim()] = match[2].trim();
        }
      });
    }
    
    // Parse memory usage
    const memoryMatch = summaryText.match(/4\. Memory used\s*:\s*(.+)/);
    if (memoryMatch) {
      summary.memoryUsed = memoryMatch[1].trim();
    }
    
    // Parse CPU time
    const cpuMatch = summaryText.match(/5\. CPU time([\s\S]*?)$/);
    if (cpuMatch) {
      const cpuLines = cpuMatch[1].split('\n');
      cpuLines.forEach(line => {
        const match = line.match(/^\s*(.+?)\s*:\s*(.+)$/);
        if (match) {
          summary.cpuTime[match[1].trim()] = match[2].trim();
        }
      });
    }
  }
  
  // Parse fault detection log
  const faultDetectionLog: Array<{
    patternNumber: number;
    pattern: string;
    faultsDetected: number;
  }> = [];
  
  const logLines = lines.filter(line => line.includes('fpTestFile'));
  logLines.forEach(line => {
    const match = line.match(/fpTestFile\s+(\d+):\s*([01\s]+)\s+(\d+)\s+faults detected/);
    if (match) {
      faultDetectionLog.push({
        patternNumber: parseInt(match[1]),
        pattern: match[2].trim(),
        faultsDetected: parseInt(match[3])
      });
    }
  });
  
  return {
    circuitName,
    summary,
    faultDetectionLog
  };
}

// Export Functions
function exportToCSV(data: ParsedTestFile | ParsedVecFile | ParsedLogFile, fileType?: string): string {
  switch (fileType) {
    case 'test':
      if ('testPatterns' in data) {
        const headers = ['Pattern Number', 'Input Pattern', 'Expected Output'];
        const rows = data.testPatterns.map((pattern, index: number) => [
          index + 1,
          pattern.inputs,
          pattern.outputs
        ]);
        return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      }
      break;
    case 'vec':
      if ('patterns' in data) {
        const headers = ['Pattern Number', 'Vector Pattern', 'Length'];
        const rows = data.patterns.map((pattern: string, index: number) => [
          index + 1,
          pattern,
          pattern.length
        ]);
        return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      }
      break;
    case 'log':
      if ('faultDetectionLog' in data) {
        const headers = ['Pattern Number', 'Test Pattern', 'Faults Detected'];
        const rows = data.faultDetectionLog.map((entry) => [
          entry.patternNumber,
          entry.pattern,
          entry.faultsDetected
        ]);
        return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      }
      break;
  }
  return '';
}