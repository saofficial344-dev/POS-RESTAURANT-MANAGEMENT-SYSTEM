import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace('/api', '')
    : 'http://localhost:5000');

let socket = null;

export function getSocket() {
  return socket;
}

export function connectSocket(token) {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth:          { token },
    transports:    ['websocket', 'polling'],
    reconnection:  true,
    reconnectionAttempts: 10,
    reconnectionDelay:    1000,
    reconnectionDelayMax: 5000,
    timeout:       20000,
  });

  socket.on('connect', () => {
    console.debug('[Socket] Connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.debug('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.debug('[Socket] Connection error:', err.message);
  });

  // Server emits this when the restaurant is permanently deleted.
  // Clear session immediately and redirect to login with an explanatory message.
  socket.on('restaurant:deleted', (data) => {
    try {
      sessionStorage.setItem(
        'authMessage',
        data?.message ||
          'This restaurant has been permanently deleted. Please contact the service provider for assistance.'
      );
      sessionStorage.setItem('authMessageType', 'deleted');
    } catch {}
    localStorage.removeItem('user');
    window.location.href = '/';
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
