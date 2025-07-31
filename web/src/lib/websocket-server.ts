import { WebSocketServer } from 'ws';
import * as pty from 'node-pty';
import { IncomingMessage } from 'http';

// Terminal session management
interface TerminalSession {
  id: string;
  pty: pty.IPty;
  ws: any;
  lastActivity: number;
}

const sessions = new Map<string, TerminalSession>();

export class TerminalWebSocketServer {
  private wss: WebSocketServer | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  initialize(server: any) {
    if (this.wss) return this.wss;

    this.wss = new WebSocketServer({ 
      server,
      path: '/api/terminal/ws',
      perMessageDeflate: false 
    });

    this.wss.on('connection', (ws: any, request: IncomingMessage) => {
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      const sessionId = url.searchParams.get('sessionId') || this.generateSessionId();
      
      console.log(`Terminal WebSocket connection established for session: ${sessionId}`);
      
      // Create or retrieve terminal session
      let session = sessions.get(sessionId);
      if (!session) {
        session = this.createTerminalSession(sessionId, ws);
        sessions.set(sessionId, session);
      } else {
        // Update WebSocket connection for existing session
        session.ws = ws;
        session.lastActivity = Date.now();
      }

      // Handle incoming messages from client
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleTerminalMessage(sessionId, message);
        } catch (error) {
          console.error('Error parsing terminal message:', error);
        }
      });

      // Handle WebSocket close
      ws.on('close', () => {
        console.log(`Terminal WebSocket connection closed for session: ${sessionId}`);
        const session = sessions.get(sessionId);
        if (session) {
          // Keep session alive for potential reconnection
          session.lastActivity = Date.now();
        }
      });

      // Handle WebSocket errors
      ws.on('error', (error: Error) => {
        console.error(`Terminal WebSocket error for session ${sessionId}:`, error);
      });

      // Send initial connection confirmation
      ws.send(JSON.stringify({
        type: 'connected',
        sessionId: sessionId
      }));
    });

    // Clean up inactive sessions periodically
    this.cleanupInterval = setInterval(() => this.cleanupInactiveSessions(), 30000);

    return this.wss;
  }

  private createTerminalSession(sessionId: string, ws: any): TerminalSession {
    // Determine shell and working directory
    const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
    const workingDir = process.env.WORKSPACE_DIR || '/workspace';

    // Create PTY process
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: workingDir,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor'
      }
    });

    const session: TerminalSession = {
      id: sessionId,
      pty: ptyProcess,
      ws: ws,
      lastActivity: Date.now()
    };

    // Handle PTY data output
    ptyProcess.onData((data: string) => {
      if (session.ws && session.ws.readyState === 1) { // WebSocket.OPEN
        session.ws.send(JSON.stringify({
          type: 'output',
          data: data
        }));
      }
    });

    // Handle PTY exit
    ptyProcess.onExit((exitCode) => {
      console.log(`Terminal session ${sessionId} exited with code: ${exitCode}`);
      if (session.ws && session.ws.readyState === 1) {
        session.ws.send(JSON.stringify({
          type: 'exit',
          exitCode: exitCode
        }));
      }
      sessions.delete(sessionId);
    });

    return session;
  }

  private handleTerminalMessage(sessionId: string, message: any) {
    const session = sessions.get(sessionId);
    if (!session) {
      console.error(`Terminal session not found: ${sessionId}`);
      return;
    }

    session.lastActivity = Date.now();

    switch (message.type) {
      case 'input':
        // Send input to PTY
        session.pty.write(message.data);
        break;
        
      case 'resize':
        // Resize PTY
        const { cols, rows } = message.data;
        if (cols && rows) {
          session.pty.resize(cols, rows);
        }
        break;
        
      case 'ping':
        // Respond to ping to keep connection alive
        if (session.ws && session.ws.readyState === 1) {
          session.ws.send(JSON.stringify({ type: 'pong' }));
        }
        break;
        
      default:
        console.warn(`Unknown terminal message type: ${message.type}`);
    }
  }

  private generateSessionId(): string {
    return `terminal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private cleanupInactiveSessions() {
    const now = Date.now();
    const maxInactiveTime = 10 * 60 * 1000; // 10 minutes

    for (const [sessionId, session] of sessions.entries()) {
      if (now - session.lastActivity > maxInactiveTime) {
        console.log(`Cleaning up inactive terminal session: ${sessionId}`);
        try {
          session.pty.kill();
        } catch (error) {
          console.error(`Error killing PTY for session ${sessionId}:`, error);
        }
        sessions.delete(sessionId);
      }
    }
  }

  getSessions(): string[] {
    return Array.from(sessions.keys());
  }

  destroySession(sessionId: string): boolean {
    const session = sessions.get(sessionId);
    if (session) {
      try {
        session.pty.kill();
      } catch (error) {
        console.error(`Error killing PTY for session ${sessionId}:`, error);
      }
      sessions.delete(sessionId);
      return true;
    }
    return false;
  }

  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Clean up all sessions
    for (const [sessionId, session] of sessions.entries()) {
      try {
        session.pty.kill();
      } catch (error) {
        console.error(`Error killing PTY for session ${sessionId}:`, error);
      }
    }
    sessions.clear();

    if (this.wss) {
      this.wss.close();
    }
  }
}

export const terminalWebSocketServer = new TerminalWebSocketServer();