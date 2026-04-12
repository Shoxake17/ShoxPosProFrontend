// utils/socket.ts
import { io, Socket } from 'socket.io-client';
import { getDeviceId } from './deviceUtils';

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

async function getCurrentDeviceId(): Promise<string> {
  return (await getDeviceId()) || '';
}

function getSocket(): Socket {
  if (!socket) {
    const login    = getCurrentLogin();
    // Socket initialization is sync, but deviceId might be async.
    // Initial connection will use whatever is available.
    
    socket = io(SOCKET_URL, {
      path:                '/socket.io/',
      autoConnect:         true,
      withCredentials:     true,
      transports:          ['websocket', 'polling'],
      reconnection:        true,
      reconnectionAttempts: Infinity, 
      reconnectionDelay:   2000,
      auth: { login }, 
    });

    socket.on('connect', async () => {
      const _login    = getCurrentLogin();
      const _deviceId = await getCurrentDeviceId();
      console.log('Socket ulandi:', socket?.id, 'Login:', _login);
      if (_login && _deviceId) {
        socket?.emit('registerUser', { login: _login, deviceId: _deviceId });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket uzildi:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket ulanish xatosi:', error);
    });
  }

  return socket;
}

/**
 * Foydalanuvchi tizimga kirganda yoki sessiya yangilanganda authni yangilash
 */
export function reconnectSocket(login: string, deviceId: string): void {
  const s = getSocket();
  
  // Auth ma'lumotlarini yangilash
  s.auth = { login, deviceId };
  
  // Agar socket allaqachon ulangan bo'lsa, uni uzib qayta ulaymiz (yangi auth bilan)
  if (s.connected) {
    s.disconnect();
  }
  s.connect();
}

export function disconnectSocket(): void {
  if (socket) {
    if (socket.connected) {
      socket.disconnect();
    }
    // Socket instanceni o'chirib tashlamaymiz, faqat uzamiz. 
    // Bu mavjud listenerlar o'lmasligini ta'minlaydi.
  }
}

export { getSocket };
export default getSocket;
