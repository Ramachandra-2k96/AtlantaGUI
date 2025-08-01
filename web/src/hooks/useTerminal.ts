'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface TerminalSession {
  id: string;
  active: boolean;
  lastActivity: number;
  persistent?: boolean;
}

interface TerminalHookOptions {
  autoReconnect?: boolean;
  sessionPersistence?: boolean;
  maxSessions?: number;
}

export default function useTerminal(options: TerminalHookOptions = {}) {
  const {
    sessionPersistence = true,
    maxSessions = 5
  } = options;

  const [sessions, setSessions] = useState<Map<string, TerminalSession>>(new Map());
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const wsConnections = useRef<Map<string, WebSocket>>(new Map());
  const sessionStorage = useRef<Map<string, Record<string, unknown>>>(new Map());

  // Load persisted sessions on mount
  useEffect(() => {
    if (sessionPersistence && typeof window !== 'undefined') {
      try {
        const savedSessions = localStorage.getItem('terminal-sessions');
        if (savedSessions) {
          const parsed = JSON.parse(savedSessions);
          const restoredSessions = new Map();
          
          Object.entries(parsed).forEach(([id, data]: [string, unknown]) => {
            const sessionData = data as { lastActivity?: number; persistent?: boolean };
            restoredSessions.set(id, {
              id,
              active: false, // Will be activated when connected
              lastActivity: sessionData.lastActivity || Date.now(),
              persistent: sessionData.persistent || false
            });
          });
          
          setSessions(restoredSessions);
        }
      } catch (error) {
        console.warn('Failed to restore terminal sessions:', error);
      }
    }
  }, [sessionPersistence]);

  // Save sessions to localStorage when they change
  useEffect(() => {
    if (sessionPersistence && typeof window !== 'undefined' && sessions.size > 0) {
      try {
        const sessionsToSave: Record<string, { lastActivity: number; persistent: boolean }> = {};
        sessions.forEach((session, id) => {
          if (session.persistent) {
            sessionsToSave[id] = {
              lastActivity: session.lastActivity,
              persistent: session.persistent
            };
          }
        });
        
        localStorage.setItem('terminal-sessions', JSON.stringify(sessionsToSave));
      } catch (error) {
        console.warn('Failed to save terminal sessions:', error);
      }
    }
  }, [sessions, sessionPersistence]);

  // Generate unique session ID
  const generateSessionId = useCallback(() => {
    return `terminal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Create new terminal session
  const createSession = useCallback(async (sessionId?: string, persistent = false, workingDirectory?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Check session limit
      if (sessions.size >= maxSessions) {
        throw new Error(`Maximum number of sessions (${maxSessions}) reached`);
      }

      const newSessionId = sessionId || generateSessionId();
      
      // Call API to create session
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'create', 
          sessionId: newSessionId,
          workingDirectory: workingDirectory || process.cwd()
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }

      const result = await response.json();
      const finalSessionId = result.sessionId || newSessionId;

      // Add to sessions map
      const newSession: TerminalSession = {
        id: finalSessionId,
        active: true,
        lastActivity: Date.now(),
        persistent
      };

      setSessions(prev => new Map(prev.set(finalSessionId, newSession)));
      setActiveSession(finalSessionId);

      console.log('Created terminal session:', finalSessionId, 'in directory:', result.workingDirectory);
      return finalSessionId;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create session';
      setError(errorMessage);
      console.error('Error creating terminal session:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [sessions.size, maxSessions, generateSessionId]);

  // Destroy terminal session
  const destroySession = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Close WebSocket connection if exists
      const ws = wsConnections.current.get(sessionId);
      if (ws) {
        ws.close(1000, 'Session destroyed');
        wsConnections.current.delete(sessionId);
      }

      // Call API to destroy session
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'destroy', sessionId })
      });

      if (!response.ok) {
        console.warn(`Failed to destroy session on server: ${response.statusText}`);
      }

      // Remove from sessions map
      setSessions(prev => {
        const newSessions = new Map(prev);
        newSessions.delete(sessionId);
        return newSessions;
      });

      // Clear session storage
      sessionStorage.current.delete(sessionId);

      // Update active session if needed
      if (activeSession === sessionId) {
        const remainingSessions = Array.from(sessions.keys()).filter(id => id !== sessionId);
        setActiveSession(remainingSessions.length > 0 ? remainingSessions[0] : null);
      }

      console.log('Destroyed terminal session:', sessionId);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to destroy session';
      setError(errorMessage);
      console.error('Error destroying terminal session:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeSession, sessions]);

  // Send command to specific session
  const sendCommand = useCallback((sessionId: string, command: string) => {
    const ws = wsConnections.current.get(sessionId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'input',
        data: command
      }));

      // Update session activity
      setSessions(prev => {
        const session = prev.get(sessionId);
        if (session) {
          const updated = new Map(prev);
          updated.set(sessionId, { ...session, lastActivity: Date.now() });
          return updated;
        }
        return prev;
      });

      return true;
    }
    return false;
  }, []);

  // Register WebSocket connection for session
  const registerWebSocket = useCallback((sessionId: string, ws: WebSocket) => {
    wsConnections.current.set(sessionId, ws);
    
    // Update session as active
    setSessions(prev => {
      const session = prev.get(sessionId);
      if (session) {
        const updated = new Map(prev);
        updated.set(sessionId, { ...session, active: true, lastActivity: Date.now() });
        return updated;
      }
      return prev;
    });
  }, []);

  // Unregister WebSocket connection for session
  const unregisterWebSocket = useCallback((sessionId: string) => {
    wsConnections.current.delete(sessionId);
    
    // Update session as inactive
    setSessions(prev => {
      const session = prev.get(sessionId);
      if (session) {
        const updated = new Map(prev);
        updated.set(sessionId, { ...session, active: false });
        return updated;
      }
      return prev;
    });
  }, []);

  // Get list of active sessions
  const getActiveSessions = useCallback(async () => {
    try {
      const response = await fetch('/api/terminal?action=sessions');
      if (response.ok) {
        const result = await response.json();
        return result.sessions || [];
      }
    } catch (error) {
      console.error('Failed to get active sessions:', error);
    }
    return [];
  }, []);

  // Switch to different session
  const switchToSession = useCallback((sessionId: string) => {
    if (sessions.has(sessionId)) {
      setActiveSession(sessionId);
      
      // Update last activity
      setSessions(prev => {
        const session = prev.get(sessionId);
        if (session) {
          const updated = new Map(prev);
          updated.set(sessionId, { ...session, lastActivity: Date.now() });
          return updated;
        }
        return prev;
      });
    }
  }, [sessions]);

  // Store session data (for persistence)
  const storeSessionData = useCallback((sessionId: string, key: string, data: unknown) => {
    if (!sessionStorage.current.has(sessionId)) {
      sessionStorage.current.set(sessionId, {});
    }
    const sessionData = sessionStorage.current.get(sessionId);
    if (sessionData) {
      sessionData[key] = data;
    }
  }, []);

  // Retrieve session data
  const getSessionData = useCallback((sessionId: string, key: string) => {
    const sessionData = sessionStorage.current.get(sessionId);
    return sessionData ? sessionData[key] : undefined;
  }, []);

  // Cleanup inactive sessions
  const cleanupInactiveSessions = useCallback(() => {
    const now = Date.now();
    const maxInactiveTime = 30 * 60 * 1000; // 30 minutes

    sessions.forEach((session, sessionId) => {
      if (!session.active && !session.persistent && (now - session.lastActivity) > maxInactiveTime) {
        console.log('Cleaning up inactive session:', sessionId);
        destroySession(sessionId);
      }
    });
  }, [sessions, destroySession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Close all WebSocket connections
      const connections = wsConnections.current;
      connections.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1000, 'Component unmounting');
        }
      });
      connections.clear();
    };
  }, []);

  return {
    // State
    sessions: Array.from(sessions.values()),
    activeSession,
    isLoading,
    error,

    // Session management
    createSession,
    destroySession,
    switchToSession,
    getActiveSessions,

    // Communication
    sendCommand,
    registerWebSocket,
    unregisterWebSocket,

    // Persistence
    storeSessionData,
    getSessionData,

    // Utilities
    cleanupInactiveSessions,
    generateSessionId
  };
}