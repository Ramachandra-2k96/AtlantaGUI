import { NextRequest } from 'next/server';
import { terminalWebSocketServer } from '@/lib/websocket-server';

function generateSessionId(): string {
  return `terminal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// HTTP endpoints for terminal management
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'sessions':
      // Return list of active sessions with details
      const activeSessions = terminalWebSocketServer.getSessions();
      return Response.json({ 
        sessions: activeSessions,
        count: activeSessions.length 
      });

    case 'session':
      // Get specific session details
      const sessionId = searchParams.get('sessionId');
      if (sessionId) {
        const session = terminalWebSocketServer.getSession(sessionId);
        if (session) {
          return Response.json({
            id: session.id,
            title: session.title,
            workingDirectory: session.workingDirectory,
            lastActivity: session.lastActivity,
            persistent: session.persistent
          });
        }
      }
      return Response.json({ error: 'Session not found' }, { status: 404 });
      
    default:
      return Response.json({ 
        message: 'Terminal API - Available actions: sessions, session',
        endpoints: {
          'GET /api/terminal?action=sessions': 'List all active terminal sessions',
          'GET /api/terminal?action=session&sessionId=<id>': 'Get specific session details',
          'POST /api/terminal': 'Create or destroy terminal sessions'
        }
      });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sessionId, workingDirectory } = body;

    switch (action) {
      case 'create':
        // Create new terminal session
        const newSessionId = sessionId || generateSessionId();
        return Response.json({ 
          sessionId: newSessionId,
          workingDirectory: workingDirectory || process.env.WORKSPACE_DIR || '/workspace'
        });
        
      case 'destroy':
        // Destroy terminal session
        if (sessionId) {
          const success = terminalWebSocketServer.destroySession(sessionId);
          if (success) {
            return Response.json({ 
              success: true,
              message: `Session ${sessionId} destroyed successfully`
            });
          }
        }
        return Response.json({ error: 'Session not found' }, { status: 404 });

      case 'command':
        // Send command to specific session (alternative to WebSocket)
        if (sessionId) {
          const session = terminalWebSocketServer.getSession(sessionId);
          if (session && body.command) {
            try {
              session.pty.write(body.command + '\n');
              return Response.json({ 
                success: true,
                message: 'Command sent successfully'
              });
            } catch (error) {
              return Response.json({ 
                error: `Failed to send command: ${error instanceof Error ? error.message : 'Unknown error'}` 
              }, { status: 500 });
            }
          }
        }
        return Response.json({ error: 'Session not found or invalid command' }, { status: 404 });
        
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Terminal API error:', error);
    return Response.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}