'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { ITerminal, IFitAddon } from '@/types/terminal';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface TerminalProps {
  sessionId?: string;
  onCommand?: (command: string) => void;
  initialDirectory?: string;
  className?: string;
  onTitleChange?: (title: string) => void;
  onDirectoryChange?: (directory: string) => void;
}

interface TerminalMessage {
  type: 'connected' | 'output' | 'exit' | 'error' | 'pong';
  sessionId?: string;
  data?: string;
  exitCode?: number;
  signal?: string;
  message?: string;
  workingDirectory?: string;
  title?: string;
}

export default function Terminal({
  sessionId: propSessionId,
  onCommand,
  initialDirectory,
  className = '',
  onTitleChange,
  onDirectoryChange
}: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<ITerminal | null>(null);
  const fitAddonRef = useRef<IFitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Get current workspace from context
  const { currentWorkspace } = useWorkspace();

  const [sessionId, setSessionId] = useState<string>(propSessionId || '');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [isClient, setIsClient] = useState(false);
  const [currentDirectory, setCurrentDirectory] = useState<string>(initialDirectory || currentWorkspace || '');
  const [terminalTitle, setTerminalTitle] = useState<string>('Terminal');
  const [lastError, setLastError] = useState<string>('');

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 5;

  // Generate session ID if not provided
  const generateSessionId = useCallback(() => {
    return `terminal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Initialize xterm.js terminal with robust configuration
  const initializeTerminal = useCallback(async () => {
    if (!terminalRef.current || xtermRef.current) return;

    try {
      // Dynamically import xterm.js modules
      const [
        { Terminal: XTerm },
        { FitAddon },
        { WebLinksAddon },
        { SearchAddon }
      ] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
        import('@xterm/addon-web-links'),
        import('@xterm/addon-search')
      ]);

      const terminal = new XTerm({
        theme: {
          background: '#1e1e1e',
          foreground: '#cccccc',
          cursor: '#ffffff',
          cursorAccent: '#1e1e1e',
          selectionBackground: '#264f78',
          selectionForeground: '#ffffff',
          black: '#000000',
          red: '#cd3131',
          green: '#0dbc79',
          yellow: '#e5e510',
          blue: '#2472c8',
          magenta: '#bc3fbc',
          cyan: '#11a8cd',
          white: '#e5e5e5',
          brightBlack: '#666666',
          brightRed: '#f14c4c',
          brightGreen: '#23d18b',
          brightYellow: '#f5f543',
          brightBlue: '#3b8eea',
          brightMagenta: '#d670d6',
          brightCyan: '#29b8db',
          brightWhite: '#ffffff'
        },
        fontFamily: '"Cascadia Code", "Fira Code", "SF Mono", Monaco, Inconsolata, "Roboto Mono", "Source Code Pro", Consolas, "Liberation Mono", Menlo, Courier, monospace',
        fontSize: 14,
        fontWeight: 'normal',
        fontWeightBold: 'bold',
        lineHeight: 1.2,
        letterSpacing: 0,
        cursorBlink: true,
        cursorStyle: 'block',
        cursorWidth: 1,
        scrollback: 10000,
        tabStopWidth: 4,
        allowProposedApi: true,
        allowTransparency: false,
        altClickMovesCursor: true,
        convertEol: false,
        disableStdin: false,
        macOptionIsMeta: true,
        rightClickSelectsWord: true,
        screenReaderMode: false,
        smoothScrollDuration: 0
      });

      // Add addons
      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();
      const searchAddon = new SearchAddon();

      terminal.loadAddon(fitAddon);
      terminal.loadAddon(webLinksAddon);
      terminal.loadAddon(searchAddon);

      // Open terminal in container
      terminal.open(terminalRef.current);

      // Store references
      xtermRef.current = terminal;
      fitAddonRef.current = fitAddon;

      // Initial fit
      setTimeout(() => {
        fitAddon.fit();
      }, 100);

      // Handle terminal input
      terminal.onData((data) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'input',
            data: data
          }));
        }
      });

      // Handle terminal resize
      terminal.onResize(({ cols, rows }) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'resize',
            data: { cols, rows }
          }));
        }
      });

      // Handle title changes
      terminal.onTitleChange((title) => {
        setTerminalTitle(title);
        onTitleChange?.(title);
      });

      // Enhanced keyboard handling
      terminal.attachCustomKeyEventHandler((event) => {
        // Ctrl+C (copy) - only if there's a selection
        if (event.ctrlKey && event.key === 'c' && event.type === 'keydown') {
          if (terminal.hasSelection()) {
            const selection = terminal.getSelection();
            if (selection) {
              navigator.clipboard.writeText(selection).catch((err) => {
                console.warn('Failed to copy to clipboard:', err);
              });
              terminal.clearSelection();
              return false; // Prevent default
            }
          }
          // If no selection, let Ctrl+C pass through to terminal (interrupt)
          return true;
        }

        // Ctrl+V (paste)
        if (event.ctrlKey && event.key === 'v' && event.type === 'keydown') {
          navigator.clipboard.readText().then((text) => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: 'input',
                data: text
              }));
            }
          }).catch((err) => {
            console.warn('Failed to read clipboard:', err);
          });
          return false; // Prevent default
        }

        // Ctrl+A (select all)
        if (event.ctrlKey && event.key === 'a' && event.type === 'keydown') {
          terminal.selectAll();
          return false;
        }

        // Ctrl+F (search) - could be implemented later
        if (event.ctrlKey && event.key === 'f' && event.type === 'keydown') {
          // TODO: Implement search functionality
          return false;
        }

        return true; // Allow other key events
      });

      // Set up resize observer for responsive behavior
      if (window.ResizeObserver) {
        resizeObserverRef.current = new ResizeObserver(() => {
          if (fitAddon) {
            fitAddon.fit();
          }
        });

        resizeObserverRef.current.observe(terminalRef.current);
      }

      // Focus terminal
      terminal.focus();

      console.log('Terminal initialized successfully');

    } catch (error) {
      console.error('Failed to initialize terminal:', error);
      setLastError(`Failed to initialize terminal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [onTitleChange]);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: TerminalMessage) => {
    const terminal = xtermRef.current;

    switch (message.type) {
      case 'connected':
        console.log('Terminal session connected:', message.sessionId);
        setLastError('');
        reconnectAttemptsRef.current = 0;

        if (message.workingDirectory) {
          setCurrentDirectory(message.workingDirectory);
          onDirectoryChange?.(message.workingDirectory);
        }

        if (message.title) {
          setTerminalTitle(message.title);
          onTitleChange?.(message.title);
        }
        break;

      case 'output':
        if (message.data && terminal) {
          terminal.write(message.data);

          // Extract command from output for callback
          if (onCommand && message.data.includes('\n')) {
            const lines = message.data.split('\n');
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed && !trimmed.startsWith('\x1b') && !trimmed.startsWith('\r')) {
                onCommand(trimmed);
                break;
              }
            }
          }
        }
        break;

      case 'exit':
        if (terminal) {
          const exitMessage = message.signal
            ? `\r\n\x1b[33mTerminal session ended (signal: ${message.signal})\x1b[0m\r\n`
            : `\r\n\x1b[33mTerminal session ended (exit code: ${message.exitCode || 0})\x1b[0m\r\n`;
          terminal.write(exitMessage);
        }
        setIsConnected(false);
        setConnectionStatus('disconnected');

        // Auto-reconnect after a short delay
        setTimeout(() => {
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            // Call connectWebSocket through a ref to avoid circular dependency
            connectWebSocketRef.current?.();
          }
        }, 2000);
        break;

      case 'error':
        console.error('Terminal error:', message.message);
        setLastError(message.message || 'Unknown terminal error');
        if (terminal) {
          terminal.write(`\r\n\x1b[31mError: ${message.message}\x1b[0m\r\n`);
        }
        break;

      case 'pong':
        // Keep-alive response - update last activity
        break;

      default:
        console.warn('Unknown terminal message type:', message.type);
    }
  }, [onCommand, onDirectoryChange, onTitleChange]);

  // Create a ref to store the connectWebSocket function to avoid circular dependency
  const connectWebSocketRef = useRef<(() => void) | null>(null);

  // Connect to WebSocket with robust error handling and reconnection
  const connectWebSocket = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    const currentSessionId = sessionId || generateSessionId();
    if (!sessionId) {
      setSessionId(currentSessionId);
    }

    setConnectionStatus('connecting');
    setLastError('');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const params = new URLSearchParams({
      sessionId: currentSessionId
    });

    // Use workspace directory, then initialDirectory, then fallback
    const workingDirectory = currentWorkspace || initialDirectory;
    if (workingDirectory) {
      params.set('cwd', workingDirectory);
    }

    const wsUrl = `${protocol}//${window.location.host}/api/terminal/ws?${params.toString()}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Terminal WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('connected');
        setLastError('');
        reconnectAttemptsRef.current = 0;

        // Start ping interval to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // Ping every 30 seconds
      };

      ws.onmessage = (event) => {
        try {
          const message: TerminalMessage = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('Terminal WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Attempt to reconnect after a delay (unless it was a clean close)
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000); // Exponential backoff
          reconnectAttemptsRef.current++;

          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setLastError('Maximum reconnection attempts reached. Please refresh the page.');
          setConnectionStatus('error');
        }
      };

      ws.onerror = (error) => {
        console.error('Terminal WebSocket error:', error);
        setConnectionStatus('error');
        setLastError('WebSocket connection error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
      setLastError(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [sessionId, generateSessionId, initialDirectory, handleWebSocketMessage, currentWorkspace]);

  // Store the connectWebSocket function in the ref
  useEffect(() => {
    connectWebSocketRef.current = connectWebSocket;
  }, [connectWebSocket]);

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    // Clear intervals and timeouts
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close WebSocket connection
    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounting');
      wsRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  // Cleanup terminal
  const cleanupTerminal = useCallback(() => {
    const terminal = xtermRef.current;
    if (terminal) {
      terminal.dispose();
      xtermRef.current = null;
    }
    fitAddonRef.current = null;

    // Clean up resize observer
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }
  }, []);

  // Set client-side flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize terminal and connect on mount (client-side only)
  useEffect(() => {
    if (!isClient) return;

    const init = async () => {
      await initializeTerminal();
      connectWebSocket();
    };

    init();

    return () => {
      disconnectWebSocket();
      cleanupTerminal();
    };
  }, [isClient, initializeTerminal, connectWebSocket, disconnectWebSocket, cleanupTerminal]);

  // Handle session ID changes
  useEffect(() => {
    if (propSessionId && propSessionId !== sessionId) {
      disconnectWebSocket();
      setSessionId(propSessionId);
      // Reconnect with new session ID will happen automatically
      setTimeout(() => connectWebSocket(), 100);
    }
  }, [propSessionId, sessionId, disconnectWebSocket, connectWebSocket]);

  // Handle directory changes from workspace or initialDirectory
  useEffect(() => {
    const targetDirectory = currentWorkspace || initialDirectory;
    if (targetDirectory && targetDirectory !== currentDirectory) {
      setCurrentDirectory(targetDirectory);
      // Send directory change to terminal
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'cwd',
          data: targetDirectory
        }));
      }
    }
  }, [currentWorkspace, initialDirectory, currentDirectory]);

  // Public methods for external control
  const focus = useCallback(() => {
    const terminal = xtermRef.current;
    if (terminal) {
      terminal.focus();
    }
  }, []);

  const clear = useCallback(() => {
    const terminal = xtermRef.current;
    if (terminal) {
      terminal.clear();
    }
  }, []);

  const fit = useCallback(() => {
    const fitAddon = fitAddonRef.current;
    if (fitAddon) {
      fitAddon.fit();
    }
  }, []);

  const sendCommand = useCallback((command: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'input',
        data: command + '\n'
      }));
    }
  }, []);

  const changeDirectory = useCallback((directory: string) => {
    sendCommand(`cd "${directory}"`);
  }, [sendCommand]);

  // Show loading state during SSR
  if (!isClient) {
    return (
      <div className={`h-full flex flex-col bg-[#1e1e1e] ${className}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-[#cccccc] text-sm">Loading terminal...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col bg-[#1e1e1e] ${className}`}>
      {/* Connection status bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#2d2d30] border-b border-[#3e3e42] text-xs">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' :
            connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
              connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
            }`} />
          <span className="text-[#cccccc]">
            {connectionStatus === 'connected' ? 'Connected' :
              connectionStatus === 'connecting' ? 'Connecting...' :
                connectionStatus === 'error' ? 'Connection Error' : 'Disconnected'}
          </span>
          {currentDirectory && (
            <span className="text-[#888888]" title={currentDirectory}>
              {currentDirectory.length > 30 ? `...${currentDirectory.slice(-27)}` : currentDirectory}
            </span>
          )}
          {sessionId && (
            <span className="text-[#666666]">({sessionId.split('_').pop()})</span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {lastError && (
            <span className="text-red-400 text-xs max-w-xs truncate" title={lastError}>
              {lastError}
            </span>
          )}
          <button
            onClick={clear}
            className="px-2 py-1 text-[#cccccc] hover:bg-[#3e3e42] rounded text-xs transition-colors"
            title="Clear terminal (Ctrl+L)"
          >
            Clear
          </button>
          <button
            onClick={() => {
              reconnectAttemptsRef.current = 0;
              connectWebSocket();
            }}
            disabled={connectionStatus === 'connecting' || connectionStatus === 'connected'}
            className="px-2 py-1 text-[#cccccc] hover:bg-[#3e3e42] rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Reconnect terminal"
          >
            Reconnect
          </button>
        </div>
      </div>

      {/* Terminal container */}
      <div
        ref={terminalRef}
        className="flex-1 p-2 overflow-hidden"
        style={{ minHeight: 0 }} // Important for flex child to shrink
      />
    </div>
  );
}