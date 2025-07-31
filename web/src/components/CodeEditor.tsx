'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useFile } from '@/contexts/FileContext';
import { X, Save, FileText, Circle } from 'lucide-react';

interface CodeEditorProps {
    file?: string;
    content?: string;
    onChange?: (content: string) => void;
    readOnly?: boolean;
}

export default function CodeEditor({
    file: propFile
}: CodeEditorProps) {
    const {
        openFiles,
        activeFileIndex,
        currentFile,
        fileContent,
        isDirty,
        isLoading,
        error,
        closeFile,
        switchToFile,
        updateContent,
        saveFile
    } = useFile();

    const handleSave = useCallback(async () => {
        if (currentFile && isDirty) {
            await saveFile();
        }
    }, [saveFile, currentFile, isDirty]);

    const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        updateContent(e.target.value);
    }, [updateContent]);

    const handleCloseTab = useCallback(async (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        await closeFile(index);
    }, [closeFile]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (currentFile && isDirty) {
                    handleSave();
                }
            }

            // Ctrl+W to close current tab
            if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
                e.preventDefault();
                if (activeFileIndex >= 0) {
                    closeFile(activeFileIndex);
                }
            }

            // Ctrl+Tab to switch between tabs
            if ((e.ctrlKey || e.metaKey) && e.key === 'Tab') {
                e.preventDefault();
                const nextIndex = (activeFileIndex + 1) % openFiles.length;
                switchToFile(nextIndex);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentFile, isDirty, activeFileIndex, openFiles.length, handleSave, closeFile, switchToFile]);

    const displayFile = currentFile || (propFile ? { name: propFile, path: propFile } : null);

    return (
        <div className="h-full bg-[#1e1e1e] text-[#cccccc] flex flex-col relative">
            {/* Fixed Tab Bar - Always show if there are open files */}
            {openFiles.length > 0 && (
                <div className="h-8 bg-[#2d2d30] border-b border-[#2d2d30] flex items-center overflow-x-auto flex-shrink-0 z-10">
                    <div className="flex items-center min-w-max">
                        {openFiles.map((openFile, index) => (
                            <div
                                key={`${openFile.file.path}-${index}`}
                                onClick={() => switchToFile(index)}
                                className={`flex items-center px-3 py-1 border-r border-[#2d2d30] cursor-pointer hover:bg-[#1e1e1e] whitespace-nowrap ${index === activeFileIndex ? 'bg-[#1e1e1e]' : 'bg-[#2d2d30]'
                                    }`}
                                style={{ minWidth: '120px', maxWidth: '200px' }}
                            >
                                <FileText className="w-3 h-3 mr-2 text-[#858585] flex-shrink-0" />
                                <span className="text-xs text-[#cccccc] mr-2 truncate flex-1">
                                    {openFile.file.name}
                                </span>
                                {openFile.isDirty && (
                                    <Circle className="w-2 h-2 mr-1 text-[#cccccc] fill-current flex-shrink-0" />
                                )}
                                <button
                                    onClick={(e) => handleCloseTab(index, e)}
                                    className="hover:bg-[#3c3c3c] rounded p-0.5 flex-shrink-0 ml-1"
                                    title="Close file"
                                >
                                    <X className="w-3 h-3 text-[#858585]" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Editor Content */}
            <div className="flex-1 flex flex-col min-h-0">
                {error && (
                    <div className="p-3 bg-[#5a1d1d] border-l-2 border-[#be1100] text-[#f48771] text-xs flex-shrink-0">
                        {error}
                    </div>
                )}

                {isLoading && (
                    <div className="p-4 text-center text-[#858585] text-sm">
                        Loading file...
                    </div>
                )}

                {!displayFile && !isLoading && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <FileText className="w-16 h-16 text-[#3c3c3c] mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-[#cccccc] mb-2">No file open</h3>
                            <p className="text-sm text-[#858585]">
                                Select a file from the explorer to start editing
                            </p>
                        </div>
                    </div>
                )}

                {displayFile && !isLoading && (
                    <EditorWithLineNumbers
                        content={fileContent}
                        onChange={handleContentChange}
                    />
                )}
            </div>

            {/* Fixed Status Bar */}
            {displayFile && (
                <div className="h-6 bg-[#007acc] text-white text-xs flex items-center px-3 flex-shrink-0">
                    <span className="mr-4">
                        {currentFile ? `${currentFile.path}` : displayFile.name}
                    </span>
                    {isDirty && (
                        <span className="mr-4 text-yellow-200">
                            • Unsaved changes
                        </span>
                    )}
                    {currentFile && (
                        <span className="mr-4">
                            {fileContent.split('\n').length} lines
                        </span>
                    )}
                    <div className="ml-auto flex items-center gap-4">
                        <span>
                            {currentFile?.extension || 'Plain Text'}
                        </span>
                        {currentFile && isDirty && (
                            <button
                                onClick={handleSave}
                                className="px-2 py-0.5 bg-[#0e639c] hover:bg-[#1177bb] text-white rounded text-xs"
                                disabled={isLoading}
                                title="Save file (Ctrl+S)"
                            >
                                <Save className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Separate component for editor with line numbers to handle scrolling properly
function EditorWithLineNumbers({ content, onChange }: { content: string, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void }) {
    const [scrollTop, setScrollTop] = useState(0);
    const lineCount = content.split('\n').length;

    return (
        <div className="flex-1 flex min-h-0">
            {/* Line numbers */}
            <div className="w-12 bg-[#1e1e1e] border-r border-[#2d2d30] text-[#858585] text-xs font-mono flex-shrink-0 overflow-hidden relative">
                <div
                    className="absolute top-0 left-0 w-full px-2 py-3"
                    style={{
                        transform: `translateY(-${scrollTop}px)`,
                        lineHeight: '1.25rem'
                    }}
                >
                    {Array.from({ length: Math.max(lineCount, 100) }, (_, index) => (
                        <div key={index} className="text-right h-5">
                            {index + 1}
                        </div>
                    ))}
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 relative min-w-0">
                <textarea
                    value={content}
                    onChange={onChange}
                    className="w-full h-full p-3 bg-[#1e1e1e] text-[#cccccc] font-mono text-sm resize-none focus:outline-none"
                    placeholder="Start typing..."
                    spellCheck={false}
                    style={{
                        lineHeight: '1.25rem',
                        tabSize: 2,
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#424242 #1e1e1e'
                    }}
                    onScroll={(e) => {
                        setScrollTop(e.currentTarget.scrollTop);
                    }}
                />

                {/* Custom scrollbar styling */}
                <style jsx>{`
          textarea::-webkit-scrollbar {
            width: 12px;
            height: 12px;
          }
          
          textarea::-webkit-scrollbar-track {
            background: #1e1e1e;
          }
          
          textarea::-webkit-scrollbar-thumb {
            background: #424242;
            border-radius: 6px;
            border: 2px solid #1e1e1e;
          }
          
          textarea::-webkit-scrollbar-thumb:hover {
            background: #4f4f4f;
          }
          
          textarea::-webkit-scrollbar-corner {
            background: #1e1e1e;
          }
        `}</style>
            </div>
        </div>
    );
}