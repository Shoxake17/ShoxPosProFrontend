// utils/socket.ts
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_URL as string) || '';

let socket: Socket | null = null;

function getCurrentLogin(): string {
  try {
    const raw = sessionStorage.getItem('currentUser');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.login) return parsed.login;
    }
  } catch {
  }
  return '';
}

function getCurrentDeviceId(): string {
  return sessionStorage.getItem('deviceId') || localStorage.getItem('deviceId') || '';
}

function attachHandlers(s: Socket, login: string, deviceId: string): void {
  s.on('connect', () => {
    const _login    = login    || getCurrentLogin();
    const _deviceId = deviceId || getCurrentDeviceId();

    if (_login && _deviceId) {
      s.emit('registerUser', { login: _login, deviceId: _deviceId });
    }
  });

  s.on('disconnect', () => {});
  s.on('connect_error', () => {});
}

function getSocket(): Socket {
  if (!socket) {
    const login    = getCurrentLogin();
    const deviceId = getCurrentDeviceId();

    socket = io(SOCKET_URL, {
      path:                '/socket.io/',
      autoConnect:         true,
      withCredentials:     true,
      transports:          ['websocket', 'polling'],
      reconnection:        true,
      reconnectionAttempts: 5,
      reconnectionDelay:   2000,
      auth: { login, deviceId }, 
    });

    attachHandlers(socket, login, deviceId);
  }

  return socket;
}

export function reconnectSocket(login: string, deviceId: string): void {
  // 1. Eski socketni tozalash
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }



  socket = io(SOCKET_URL, {
    path:                '/socket.io/',
    autoConnect:         true,
    withCredentials:     true,
    transports:          ['websocket', 'polling'],
    reconnection:        true,
    reconnectionAttempts: 5,
    reconnectionDelay:   2000,
    auth: { login, deviceId }, 
  });

  attachHandlers(socket, login, deviceId);
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    if (socket.connected) {
      socket.disconnect();
    }
    socket = null;
  }
}

export { getSocket };
export default getSocket;