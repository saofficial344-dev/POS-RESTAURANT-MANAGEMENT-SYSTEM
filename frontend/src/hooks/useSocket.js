import { useEffect } from 'react';
import { useSocketContext } from '../context/SocketContext';

/**
 * Subscribe to a socket event and clean up on unmount.
 * @param {string} event — event name to listen to
 * @param {Function} handler — callback(data)
 * @param {Array} deps — extra deps that change the subscription
 */
export function useSocketEvent(event, handler, deps = []) {
  const { socket } = useSocketContext();

  useEffect(() => {
    if (!socket || !event) return;
    socket.on(event, handler);
    return () => socket.off(event, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, event, ...deps]);
}

export function useSocket() {
  return useSocketContext();
}
