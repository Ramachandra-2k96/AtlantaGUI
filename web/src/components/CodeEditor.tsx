/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { useFile } from '@/contexts/FileContext';
import { X, Save, FileText, Circle } from 'lucide-react';
import dynamic from 'next/dynamic';
import {
  benchLanguageConfig,
  benchLanguageRegistration,
  benchLanguageTokens,
  benchTheme,
  getBenchCompletionItems,
  validateBenchSyntax,
  getBenchHoverProvider,
} from '@/lib/bench-language';

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

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

    const editorRef = useRef<any>(null);
    const monacoRef = useRef<any>(null);
    const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    // Validation configuration
    const VALIDATION_DELAY = 500; // 0.5 seconds

    // Manual save function
    const handleSave = useCallback(async () => {
        if (currentFile && isDirty) {
            try {
                await saveFile();
            } catch (error) {
                console.error('Failed to save file:', error);
            }
        }
    }, [saveFile, currentFile, isDirty]);

    // Enhanced content change handler with validation only (no auto-save)
    const handleContentChange = useCallback((value: string | undefined) => {
        if (value !== undefined) {
            updateContent(value);
            
            // Clear existing validation timeout
            if (validationTimeoutRef.current) {
                clearTimeout(validationTimeoutRef.current);
            }
            
            // Schedule validation for .bench files
            validationTimeoutRef.current = setTimeout(() => {
                if (editorRef.current && monacoRef.current && currentFile?.name.endsWith('.bench')) {
                    const model = editorRef.current.getModel();
                    if (model) {
                        const markers = validateBenchSyntax(model, monacoRef.current);
                        monacoRef.current.editor.setModelMarkers(model, 'bench', markers);
                    }
                }
            }, VALIDATION_DELAY);
        }
    }, [updateContent, currentFile, VALIDATION_DELAY]);

    const handleCloseTab = useCallback(async (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        await closeFile(index);
    }, [closeFile]);

    // Enhanced Monaco Editor initialization with comprehensive .bench language support
    const handleEditorDidMount = useCallback((editor: any, monacoInstance: any) => {
        editorRef.current = editor;
        monacoRef.current = monacoInstance;

        // Register .bench language with enhanced features
        if (!monacoInstance.languages.getLanguages().some((lang: any) => lang.id === 'bench')) {
            // Register language
            monacoInstance.languages.register(benchLanguageRegistration);
            
            // Set language configuration
            monacoInstance.languages.setLanguageConfiguration('bench', benchLanguageConfig);
            
            // Set tokenizer
            monacoInstance.languages.setMonarchTokensProvider('bench', benchLanguageTokens);
            
            // Define theme
            monacoInstance.editor.defineTheme('bench-theme', benchTheme);
            
            // Register completion provider with enhanced suggestions
            monacoInstance.languages.registerCompletionItemProvider('bench', {
                provideCompletionItems: (model: any, position: any) => {
                    const word = model.getWordUntilPosition(position);
                    const range = {
                        startLineNumber: position.lineNumber,
                        endLineNumber: position.lineNumber,
                        startColumn: word.startColumn,
                        endColumn: word.endColumn,
                    };
                    
                    const suggestions = getBenchCompletionItems(monacoInstance).map((item: any) => ({
                        ...item,
                        range,
                    }));
                    
                    return { suggestions };
                },
                triggerCharacters: ['(', ',', ' ']
            });
            
            // Register hover provider
            monacoInstance.languages.registerHoverProvider('bench', getBenchHoverProvider());
            
            // Register document formatting provider
            monacoInstance.languages.registerDocumentFormattingEditProvider('bench', {
                provideDocumentFormattingEdits: (model: any) => {
                    const content = model.getValue();
                    const lines = content.split('\n');
                    const formattedLines = lines.map((line: string) => {
                        // Basic formatting: normalize whitespace around operators and parentheses
                        return line
                            .replace(/\s*=\s*/g, ' = ')
                            .replace(/\s*\(\s*/g, '(')
                            .replace(/\s*\)\s*/g, ')')
                            .replace(/\s*,\s*/g, ', ')
                            .trim();
                    });
                    
                    const formattedContent = formattedLines.join('\n');
                    
                    return [{
                        range: model.getFullModelRange(),
                        text: formattedContent,
                    }];
                }
            });
        }

        // Set theme
        monacoInstance.editor.setTheme('bench-theme');

        // Configure enhanced editor options
        editor.updateOptions({
            fontSize: 14,
            fontFamily: 'Consolas, "Courier New", monospace',
            lineNumbers: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            wordWrap: 'on',
            bracketPairColorization: { enabled: true },
            autoIndent: 'full',
            formatOnPaste: true,
            formatOnType: true,
            suggest: {
                showKeywords: true,
                showSnippets: true,
                showFunctions: true,
                showVariables: true,
            },
            quickSuggestions: {
                other: true,
                comments: false,
                strings: false,
            },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            acceptSuggestionOnCommitCharacter: true,
            snippetSuggestions: 'top',
            wordBasedSuggestions: 'off',
            parameterHints: { enabled: true },
            hover: { enabled: true },
        });

        // Add keyboard shortcuts
        editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, () => {
            // Prevent default browser save behavior
            handleSave();
        });
        
        // Add format document shortcut
        editor.addCommand(monacoInstance.KeyMod.Shift | monacoInstance.KeyMod.Alt | monacoInstance.KeyCode.KeyF, () => {
            editor.getAction('editor.action.formatDocument').run();
        });
        
        // Initial validation for .bench files
        if (currentFile?.name.endsWith('.bench')) {
            setTimeout(() => {
                const model = editor.getModel();
                if (model) {
                    const markers = validateBenchSyntax(model, monacoInstance);
                    monacoInstance.editor.setModelMarkers(model, 'bench', markers);
                }
            }, 100);
        }
    }, [handleSave, currentFile]);

    // Enhanced keyboard shortcuts for browser environment
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+S or Cmd+S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                e.stopPropagation();
                handleSave();
                return false;
            }

            // Ctrl+W or Cmd+W to close current tab (prevent browser close)
            if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
                e.preventDefault();
                e.stopPropagation();
                if (activeFileIndex >= 0) {
                    closeFile(activeFileIndex);
                }
                return false;
            }

            // Alt+Left/Right or Ctrl+PageUp/PageDown to switch between tabs
            if (openFiles.length > 1) {
                if ((e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) ||
                    (e.ctrlKey && (e.key === 'PageUp' || e.key === 'PageDown'))) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                        // Previous tab
                        const prevIndex = activeFileIndex === 0 ? openFiles.length - 1 : activeFileIndex - 1;
                        switchToFile(prevIndex);
                    } else {
                        // Next tab
                        const nextIndex = (activeFileIndex + 1) % openFiles.length;
                        switchToFile(nextIndex);
                    }
                    return false;
                }
            }
        };

        // Use capture phase to intercept before browser handles it
        document.addEventListener('keydown', handleKeyDown, true);
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [activeFileIndex, openFiles.length, handleSave, closeFile, switchToFile]);

    // Cleanup validation timeout
    useEffect(() => {
        return () => {
            if (validationTimeoutRef.current) {
                clearTimeout(validationTimeoutRef.current);
            }
        };
    }, []);

    const displayFile = currentFile || (propFile ? { name: propFile, path: propFile } : null);
    const isBenchFile = displayFile?.name.endsWith('.bench') || false;

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
                    <div className="flex-1 min-h-0">
                        <MonacoEditor
                            height="100%"
                            language={isBenchFile ? 'bench' : 'plaintext'}
                            theme={isBenchFile ? 'bench-theme' : 'vs-dark'}
                            value={fileContent}
                            onChange={handleContentChange}
                            onMount={handleEditorDidMount}
                            options={{
                                fontSize: 14,
                                fontFamily: 'Consolas, "Courier New", monospace',
                                lineNumbers: 'on',
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                tabSize: 2,
                                insertSpaces: true,
                                wordWrap: 'on',
                                bracketPairColorization: { enabled: true },
                                autoIndent: 'full',
                                formatOnPaste: true,
                                formatOnType: true,
                                suggest: {
                                    showKeywords: true,
                                    showSnippets: true,
                                    showFunctions: true,
                                    showVariables: true,
                                },
                                quickSuggestions: {
                                    other: true,
                                    comments: false,
                                    strings: false,
                                },
                                suggestOnTriggerCharacters: true,
                                acceptSuggestionOnEnter: 'on',
                                acceptSuggestionOnCommitCharacter: true,
                                snippetSuggestions: 'top',
                                wordBasedSuggestions: 'off',
                                parameterHints: { enabled: true },
                                hover: { enabled: true },
                                folding: true,
                                foldingStrategy: 'indentation',
                                showFoldingControls: 'mouseover',
                                matchBrackets: 'always',
                                renderWhitespace: 'selection',
                                renderControlCharacters: false,
                                cursorBlinking: 'blink',
                                cursorSmoothCaretAnimation: 'on',
                                smoothScrolling: true,
                                mouseWheelZoom: true,
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Status Bar */}
            {displayFile && (
                <div className="h-6 bg-[#007acc] text-white text-xs flex items-center px-3 flex-shrink-0">
                    <span className="mr-4">
                        {currentFile ? `${currentFile.path}` : displayFile.name}
                    </span>
                    
                    {/* Unsaved changes indicator */}
                    {currentFile && isDirty && (
                        <span className="mr-4 text-yellow-200">• Unsaved changes</span>
                    )}
                    
                    {currentFile && (
                        <span className="mr-4">
                            {fileContent.split('\n').length} lines
                        </span>
                    )}
                    
                    <div className="ml-auto flex items-center gap-4">
                        <span>
                            {isBenchFile ? 'Bench Circuit' : (currentFile?.extension || 'Plain Text')}
                        </span>
                        {currentFile && (
                            <button
                                onClick={handleSave}
                                className={`px-2 py-0.5 rounded text-xs flex items-center gap-1 ${
                                    isDirty 
                                        ? 'bg-[#0e639c] hover:bg-[#1177bb] text-white' 
                                        : 'bg-[#4a4a4a] text-gray-300 cursor-not-allowed'
                                }`}
                                disabled={isLoading || !isDirty}
                                title={isDirty ? "Save file (Ctrl+S)" : "No changes to save"}
                            >
                                <Save className="w-3 h-3" />
                                Save
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}