import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (user?.id) {
      setConnectionStatus('connecting');
      
      // Initialize socket connection with reconnection options
      socketRef.current = io('http://localhost:5050', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000
      });

      const socket = socketRef.current;

      socket.on('connect', () => {
        console.log('Connected to server');
        setConnectionStatus('connected');
        setReconnectAttempts(0);
        // Join user-specific room for targeted notifications
        socket.emit('join-user-room', user.id);
      });

      socket.on('disconnect', (reason) => {
        console.log('Disconnected from server:', reason);
        setConnectionStatus('disconnected');
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setConnectionStatus('error');
      });

      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`Reconnection attempt ${attemptNumber}`);
        setReconnectAttempts(attemptNumber);
        setConnectionStatus('connecting');
      });

      socket.on('reconnect_failed', () => {
        console.error('Failed to reconnect to server after maximum attempts');
        setConnectionStatus('error');
      });

      return () => {
        socket.disconnect();
        setConnectionStatus('disconnected');
      };
    }
  }, [user?.id]);

  return socketRef.current;
};