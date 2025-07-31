'use client';

import { useState, useCallback, useRef } from 'react';

export default function useTerminal() {
  const [sessions, setSessions] = useState<Map<string, { id: string; active: boolean }>>(new Map());
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const createSession = useCallback((sessionId: string) => {
    console.log('Creating terminal session:', sessionId);
    // Placeholder for terminal session creation
    setSessions(prev => new Map(prev.set(sessionId, { id: sessionId, active: true })));
    setActiveSession(sessionId);
  }, []);

  const destroySession = useCallback((sessionId: string) => {
    console.log('Destroying terminal session:', sessionId);
    setSessions(prev => {
      const newSessions = new Map(prev);
      newSessions.delete(sessionId);
      return newSessions;
    });
    if (activeSession === sessionId) {
      setActiveSession(null);
    }
  }, [activeSession]);

  const sendCommand = useCallback((sessionId: string, command: string) => {
    console.log('Sending command to session', sessionId, ':', command);
    // Placeholder for command sending via WebSocket
  }, []);

  const connectWebSocket = useCallback(() => {
    // Placeholder for WebSocket connection
    console.log('Connecting to terminal WebSocket');
  }, []);

  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  return {
    sessions: Array.from(sessions.values()),
    activeSession,
    createSession,
    destroySession,
    sendCommand,
    connectWebSocket,
    disconnectWebSocket
  };
}