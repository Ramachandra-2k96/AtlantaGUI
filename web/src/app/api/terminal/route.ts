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
      // Return list of active sessions
      const activeSessions = terminalWebSocketServer.getSessions();
      return Response.json({ sessions: activeSessions });
      
    default:
      return Response.json({ 
        message: 'Terminal API - Available actions: sessions' 
      });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, sessionId } = body;

  switch (action) {
    case 'create':
      // Create new terminal session
      const newSessionId = generateSessionId();
      return Response.json({ sessionId: newSessionId });
      
    case 'destroy':
      // Destroy terminal session
      if (sessionId) {
        const success = terminalWebSocketServer.destroySession(sessionId);
        if (success) {
          return Response.json({ success: true });
        }
      }
      return Response.json({ error: 'Session not found' }, { status: 404 });
      
    default:
      return Response.json({ error: 'Invalid action' }, { status: 400 });
  }
}