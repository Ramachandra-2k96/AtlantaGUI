import { WebSocketServer, WebSocket } from 'ws';
import * as pty from 'node-pty';
import { IncomingMessage } from 'http';
import * as path from 'path';
import * as fs from 'fs';

// Terminal session management
interface TerminalSession {
  id: string;
  pty: pty.IPty;
  ws: WebSocket;
  lastActivity: number;
  workingDirectory: string;
  title: string;
  persistent: boolean;
}

const sessions = new Map<string, TerminalSession>();

export class TerminalWebSocketServer {
  private wss: WebSocketServer | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  initialize(server: import('http').Server) {
    if (this.wss) return this.wss;

    this.wss = new WebSocketServer({ 
      server,
      path: '/api/terminal/ws',
      perMessageDeflate: false,
      clientTracking: true
    });

    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      const sessionId = url.searchParams.get('sessionId') || this.generateSessionId();
      const workingDir = url.searchParams.get('cwd') || this.getDefaultWorkingDirectory();
      
      console.log(`Terminal WebSocket connection established for session: ${sessionId}, cwd: ${workingDir}`);
      
      // Create or retrieve terminal session
      let session = sessions.get(sessionId);
      if (!session) {
        session = this.createTerminalSession(sessionId, ws, workingDir);
        if (session) {
          sessions.set(sessionId, session);
        } else {
          ws.close(1011, 'Failed to create terminal session');
          return;
        }
      } else {
        // Update WebSocket connection for existing session
        session.ws = ws;
        session.lastActivity = Date.now();
        console.log(`Reconnected to existing terminal session: ${sessionId}`);
      }

      // Set up WebSocket event handlers
      this.setupWebSocketHandlers(ws, sessionId);

      // Send initial connection confirmation with session info
      ws.send(JSON.stringify({
        type: 'connected',
        sessionId: sessionId,
        workingDirectory: session.workingDirectory,
        title: session.title
      }));
    });

    // Set up periodic cleanup and heartbeat
    this.cleanupInterval = setInterval(() => this.cleanupInactiveSessions(), 60000); // Every minute
    this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), 30000); // Every 30 seconds

    console.log('Terminal WebSocket server initialized');
    return this.wss;
  }

  private setupWebSocketHandlers(ws: WebSocket, sessionId: string) {
    // Handle incoming messages from client
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleTerminalMessage(sessionId, message);
      } catch (error) {
        console.error('Error parsing terminal message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    // Handle WebSocket close
    ws.on('close', (code: number, reason: Buffer) => {
      console.log(`Terminal WebSocket connection closed for session: ${sessionId}, code: ${code}, reason: ${reason.toString()}`);
      const session = sessions.get(sessionId);
      if (session) {
        session.lastActivity = Date.now();
        // Don't immediately destroy the session, allow for reconnection
      }
    });

    // Handle WebSocket errors
    ws.on('error', (error: Error) => {
      console.error(`Terminal WebSocket error for session ${sessionId}:`, error);
    });

    // Handle pong responses for heartbeat
    ws.on('pong', () => {
      const session = sessions.get(sessionId);
      if (session) {
        session.lastActivity = Date.now();
      }
    });
  }

  private createTerminalSession(sessionId: string, ws: WebSocket, workingDir: string): TerminalSession | undefined {
    try {
      // Validate and ensure working directory exists
      const resolvedWorkingDir = this.resolveWorkingDirectory(workingDir);
      
      // Determine shell based on platform
      const shell = this.getShell();
      const shellArgs = this.getShellArgs();

      console.log(`Creating terminal session with shell: ${shell}, cwd: ${resolvedWorkingDir}`);

      // Create clean environment without VS Code specific variables
      const cleanEnv = { ...process.env };
      
      // Remove ALL VS Code specific environment variables that cause issues
      const vsCodeVars = [
        'VSCODE_PID',
        'VSCODE_CWD',
        'VSCODE_NLS_CONFIG',
        'VSCODE_IPC_HOOK',
        'VSCODE_IPC_HOOK_CLI',
        'VSCODE_INJECTION',
        'ELECTRON_RUN_AS_NODE',
        '__vsc_prompt_cmd_original',
        'VSCODE_SHELL_INTEGRATION',
        'VSCODE_SHELL_LOGIN',
        'VSCODE_CLI',
        'VSCODE_HANDLES_UNCAUGHT_ERRORS',
        'VSCODE_VERBOSE_LOGGING',
        'VSCODE_LOG_LEVEL',
        'VSCODE_LOGS',
        'VSCODE_PORTABLE',
        'VSCODE_AGENT_FOLDER',
        'VSCODE_AMD_ENTRYPOINT',
        'VSCODE_CODE_CACHE_PATH',
        'VSCODE_CRASH_REPORTER_PROCESS_TYPE',
        'VSCODE_CRASH_REPORTER_SANDBOXED_HINT',
        'VSCODE_CRASH_REPORTER_START_OPTIONS',
        'VSCODE_DEV',
        'VSCODE_HANDLES_SIGPIPE',
        'VSCODE_NODE_CACHED_DATA_DIR'
      ];
      
      // Remove VS Code variables
      vsCodeVars.forEach(varName => {
        delete cleanEnv[varName];
      });
      
      // Also remove any environment variable that starts with VSCODE_ or __vsc
      Object.keys(cleanEnv).forEach(key => {
        if (key.startsWith('VSCODE_') || key.startsWith('__vsc')) {
          delete cleanEnv[key];
        }
      });

      // Create PTY process with robust configuration
      const ptyProcess = pty.spawn(shell, shellArgs, {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd: resolvedWorkingDir,
        env: {
          // Start with a completely clean environment - only essential variables
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
          SHELL: shell,
          PWD: resolvedWorkingDir,
          HOME: process.env.HOME || '/root',
          USER: process.env.USER || 'root',
          PATH: process.env.PATH || '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
          LANG: 'en_US.UTF-8',
          LC_ALL: 'en_US.UTF-8',
          // Add only safe environment variables from the parent process
          ...(process.env.NODE_ENV && { NODE_ENV: process.env.NODE_ENV }),
          ...(process.env.WORKSPACE_DIR && { WORKSPACE_DIR: process.env.WORKSPACE_DIR })
        },
        handleFlowControl: true
      });

      const session: TerminalSession = {
        id: sessionId,
        pty: ptyProcess,
        ws: ws,
        lastActivity: Date.now(),
        workingDirectory: resolvedWorkingDir,
        title: `Terminal - ${path.basename(resolvedWorkingDir)}`,
        persistent: true
      };

      // Send initial command to clear any startup messages
      setTimeout(() => {
        try {
          // Just clear the screen to hide any startup noise
          ptyProcess.write('clear\n');
        } catch (error) {
          console.error(`Error sending clear command for session ${sessionId}:`, error);
        }
      }, 200);

      // Handle PTY data output with error handling
      ptyProcess.onData((data: string) => {
        try {
          if (session.ws && session.ws.readyState === WebSocket.OPEN) {
            session.ws.send(JSON.stringify({
              type: 'output',
              data: data
            }));
          }
        } catch (error) {
          console.error(`Error sending PTY data for session ${sessionId}:`, error);
        }
      });

      // Handle PTY exit with cleanup
      ptyProcess.onExit((event) => {
        const exitCode = event.exitCode;
        const signal = event.signal;
        console.log(`Terminal session ${sessionId} exited with code: ${exitCode}, signal: ${signal}`);
        
        try {
          if (session.ws && session.ws.readyState === WebSocket.OPEN) {
            session.ws.send(JSON.stringify({
              type: 'exit',
              exitCode: exitCode || 0,
              signal: signal
            }));
          }
        } catch (error) {
          console.error(`Error sending exit message for session ${sessionId}:`, error);
        }

        // Clean up session after a delay to allow client to handle exit
        setTimeout(() => {
          sessions.delete(sessionId);
        }, 5000);
      });

      // PTY errors are handled through the exit event and WebSocket error handling

      console.log(`Terminal session ${sessionId} created successfully`);
      return session;

    } catch (error) {
      console.error(`Failed to create terminal session ${sessionId}:`, error);
      
      try {
        ws.send(JSON.stringify({
          type: 'error',
          message: `Failed to create terminal: ${error instanceof Error ? error.message : 'Unknown error'}`
        }));
      } catch (sendError) {
        console.error(`Error sending creation error message:`, sendError);
      }
      
      return undefined;
    }
  }

  private handleTerminalMessage(sessionId: string, message: { type: string; data?: unknown }) {
    const session = sessions.get(sessionId);
    if (!session) {
      console.error(`Terminal session not found: ${sessionId}`);
      return;
    }

    session.lastActivity = Date.now();

    try {
      switch (message.type) {
        case 'input':
          // Send input to PTY with validation
          if (typeof message.data === 'string') {
            session.pty.write(message.data);
          } else {
            console.warn(`Invalid input data type for session ${sessionId}`);
          }
          break;
          
        case 'resize':
          // Resize PTY with validation
          const resizeData = message.data as { cols?: number; rows?: number };
          if (resizeData?.cols && resizeData?.rows && 
              resizeData.cols > 0 && resizeData.cols <= 1000 &&
              resizeData.rows > 0 && resizeData.rows <= 1000) {
            session.pty.resize(resizeData.cols, resizeData.rows);
          } else {
            console.warn(`Invalid resize data for session ${sessionId}:`, resizeData);
          }
          break;

        case 'ping':
          // Respond to ping to keep connection alive
          if (session.ws && session.ws.readyState === WebSocket.OPEN) {
            session.ws.send(JSON.stringify({ type: 'pong' }));
          }
          break;

        case 'title':
          // Update terminal title
          if (typeof message.data === 'string') {
            session.title = message.data;
          }
          break;

        case 'cwd':
          // Change working directory
          if (typeof message.data === 'string') {
            const newCwd = this.resolveWorkingDirectory(message.data);
            session.workingDirectory = newCwd;
            // Send cd command to the shell
            session.pty.write(`cd "${newCwd}"\n`);
          }
          break;
          
        default:
          console.warn(`Unknown terminal message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`Error handling terminal message for session ${sessionId}:`, error);
      
      try {
        if (session.ws && session.ws.readyState === WebSocket.OPEN) {
          session.ws.send(JSON.stringify({
            type: 'error',
            message: `Error processing command: ${error instanceof Error ? error.message : 'Unknown error'}`
          }));
        }
      } catch (sendError) {
        console.error(`Error sending error message:`, sendError);
      }
    }
  }

  private getDefaultWorkingDirectory(): string {
    // Priority order for default working directory
    const candidates = [
      process.env.WORKSPACE_DIR,
      process.env.HOME,
      '/home',
      '/workspace',
      '/app',
      '/'
    ];

    for (const candidate of candidates) {
      if (candidate && this.isValidDirectory(candidate)) {
        return candidate;
      }
    }

    return '/';
  }

  private resolveWorkingDirectory(requestedDir: string): string {
    try {
      // Resolve relative paths
      const resolved = path.resolve(requestedDir);
      
      // Security check: ensure path is within allowed directories
      const allowedPaths = [
        process.env.WORKSPACE_DIR,
        process.env.HOME,
        '/home',
        '/workspace',
        '/tmp'
      ].filter(Boolean); // Remove undefined values

      const isAllowed = allowedPaths.some(allowedPath => {
        if (!allowedPath) return false;
        const normalizedAllowed = path.resolve(allowedPath);
        return resolved.startsWith(normalizedAllowed);
      });

      if (!isAllowed) {
        console.warn(`Access denied to directory: ${resolved}, falling back to default`);
        return this.getDefaultWorkingDirectory();
      }

      // Ensure directory exists
      if (this.isValidDirectory(resolved)) {
        return resolved;
      } else {
        console.warn(`Directory does not exist: ${resolved}, falling back to default`);
        return this.getDefaultWorkingDirectory();
      }
    } catch (error) {
      console.error(`Error resolving working directory ${requestedDir}:`, error);
      return this.getDefaultWorkingDirectory();
    }
  }

  private isValidDirectory(dirPath: string): boolean {
    try {
      const stats = fs.statSync(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  private getShell(): string {
    // Determine the best shell to use
    if (process.platform === 'win32') {
      return process.env.COMSPEC || 'cmd.exe';
    }

    // For Unix-like systems, prefer bash
    const shells = ['/bin/bash', '/usr/bin/bash', '/bin/sh', '/usr/bin/sh'];
    
    for (const shell of shells) {
      try {
        if (fs.existsSync(shell)) {
          return shell;
        }
      } catch {
        continue;
      }
    }

    return '/bin/sh'; // Fallback
  }

  private getShellArgs(): string[] {
    const shell = this.getShell();
    
    if (shell.includes('bash')) {
      return ['--login', '-i']; // Interactive login shell
    } else if (shell.includes('sh')) {
      return ['-i']; // Interactive shell
    } else if (process.platform === 'win32') {
      return []; // No special args for Windows
    }
    
    return [];
  }

  private sendHeartbeat() {
    if (!this.wss) return;

    this.wss.clients.forEach((ws: WebSocket) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.ping();
        } catch (error) {
          console.error('Error sending heartbeat ping:', error);
        }
      }
    });
  }

  private cleanupInactiveSessions() {
    const now = Date.now();
    const maxInactiveTime = 30 * 60 * 1000; // 30 minutes for persistent sessions
    const maxNonPersistentTime = 5 * 60 * 1000; // 5 minutes for non-persistent sessions

    for (const [sessionId, session] of sessions.entries()) {
      const inactiveTime = now - session.lastActivity;
      const maxTime = session.persistent ? maxInactiveTime : maxNonPersistentTime;

      if (inactiveTime > maxTime) {
        console.log(`Cleaning up inactive terminal session: ${sessionId} (inactive for ${Math.round(inactiveTime / 1000)}s)`);
        this.destroySession(sessionId);
      }
    }
  }

  private generateSessionId(): string {
    return `terminal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getSessions(): Array<{id: string; title: string; workingDirectory: string; lastActivity: number}> {
    return Array.from(sessions.values()).map(session => ({
      id: session.id,
      title: session.title,
      workingDirectory: session.workingDirectory,
      lastActivity: session.lastActivity
    }));
  }

  getSession(sessionId: string): TerminalSession | undefined {
    return sessions.get(sessionId);
  }

  destroySession(sessionId: string): boolean {
    const session = sessions.get(sessionId);
    if (session) {
      try {
        // Close WebSocket connection
        if (session.ws && session.ws.readyState === WebSocket.OPEN) {
          session.ws.close(1000, 'Session terminated');
        }

        // Kill PTY process
        session.pty.kill('SIGTERM');
        
        // Force kill after timeout
        setTimeout(() => {
          try {
            session.pty.kill('SIGKILL');
          } catch (error) {
            console.error(`Error force killing PTY for session ${sessionId}:`, error);
          }
        }, 5000);

      } catch (error) {
        console.error(`Error destroying session ${sessionId}:`, error);
      }
      
      sessions.delete(sessionId);
      console.log(`Terminal session ${sessionId} destroyed`);
      return true;
    }
    return false;
  }

  shutdown() {
    console.log('Shutting down Terminal WebSocket server...');

    // Clear intervals
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // Clean up all sessions
    const sessionIds = Array.from(sessions.keys());
    for (const sessionId of sessionIds) {
      this.destroySession(sessionId);
    }

    // Close WebSocket server
    if (this.wss) {
      this.wss.close(() => {
        console.log('Terminal WebSocket server closed');
      });
      this.wss = null;
    }
  }
}

export const terminalWebSocketServer = new TerminalWebSocketServer();