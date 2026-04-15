// utils/socket.ts
import { io, Socket } from 'socket.io-client';
import { getDeviceId } from './deviceUtils';
import { clearAuthClientState } from './clientSession';
import { clearApiCache } from './api';

const SOCKET_URL = (import.meta.env.VITE_API_URL as string) || '';

let socket: Socket | null = null;
let consecutiveErrors = 0;
const MAX_BACKOFF_DELAY = 30000;
let hasLoggedRedirect = false;

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

function getBackoffDelay(): number {
  const baseDelay = 2000;
  const delay = baseDelay * Math.pow(1.5, Math.min(consecutiveErrors, 10));
  return Math.min(delay, MAX_BACKOFF_DELAY);
}

function handleAuthError() {
  if (!hasLoggedRedirect) {
    hasLoggedRedirect = true;
    console.warn('🔐 Token eskirgan, login sahifasiga yonaltirilmoqda...');
    clearAuthClientState();
    clearApiCache();
    window.location.href = '/login';
  }
}

function getSocket(): Socket {
  if (!socket) {
    const login    = getCurrentLogin();
    
    socket = io(SOCKET_URL, {
      path:                '/socket.io/',
      autoConnect:         true,
      withCredentials:     true,
      transports:          ['websocket', 'polling'],
      reconnection:        true,
      reconnectionAttempts: Infinity,
      reconnectionDelay:   2000,
      reconnectionDelayMax: MAX_BACKOFF_DELAY,
      randomizationFactor: 0.5,
      auth: { login },
    });

    socket.on('connect', async () => {
      consecutiveErrors = 0;
      hasLoggedRedirect = false;
      const _login    = getCurrentLogin();
      const _deviceId = await getCurrentDeviceId();
      if (_login && _deviceId) {
        socket?.emit('registerUser', { login: _login, deviceId: _deviceId });
      }
    });

    socket.on('disconnect', (reason) => {
    });

    socket.on('connect_error', (error) => {
      consecutiveErrors++;
      const delay = getBackoffDelay();
      console.warn(`⚠️ Socket ulanish xatosi (${consecutiveErrors} marta):`, error.message, '- Keyingi urinish:', Math.round(delay/1000), 's');
      
      // Token eskirganlik haqidagi xatolarni tekshirish
      if (error.message?.includes('401') || error.message?.includes('token') || error.message?.includes('expired')) {
        handleAuthError();
      }
    });

    socket.on('error', (error) => {
      console.error('❌ Socket xatosi:', error);
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
