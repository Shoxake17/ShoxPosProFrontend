// utils/socket.ts
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_URL as string) || '';

let socket: Socket | null = null;

// ✅ Event handlerlarni alohida funksiya — takrorlanmaslik uchun
function attachHandlers(s: Socket, login: string, deviceId: string): void {
  s.on('connect', () => {
    console.log('🔌 Socket ulandi:', s.id);

    // ✅ localStorage emas — parametrdan kelgan qiymatni ishlatamiz
    const _login = login || localStorage.getItem('currentLogin') || localStorage.getItem('login') || '';
    const _deviceId = deviceId || localStorage.getItem('deviceId') || '';

    if (_login && _deviceId) {
      s.emit('registerUser', { login: _login, deviceId: _deviceId });
      console.log(`📲 Socket register: ${_login} | ${_deviceId}`);
    } else {
      console.warn('⚠️ Socket: login yoki deviceId topilmadi!', { _login, _deviceId });
    }
  });

  s.on('disconnect', (reason) => {
    console.log('❌ Socket uzildi:', reason);
  });

  s.on('connect_error', (err) => {
    console.error('🔴 Socket xatosi:', err.message);
  });
}

function getSocket(): Socket {
  if (!socket) {
    const login = localStorage.getItem('currentLogin') ||
                  localStorage.getItem('login') || '';
    const deviceId = localStorage.getItem('deviceId') || '';

    socket = io(SOCKET_URL, {
      path: '/socket.io/',
      autoConnect: true, // ✅ o'zgartiring: false → true
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      auth: { login, deviceId }
    });

    attachHandlers(socket, login, deviceId);
  }

  return socket;
}


export function reconnectSocket(login: string, deviceId: string): void {
  console.log(`🔄 Reconnect boshlanmoqda: ${login} | ${deviceId}`);

  // 1. Eski socketni tozalash
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  // 2. localStorage yangilash
  localStorage.setItem('currentLogin', login);
  localStorage.setItem('deviceId', deviceId);

  // 3. Yangi socket — to'g'ridan-to'g'ri parametrlar bilan
  socket = io(SOCKET_URL, {
    path: '/socket.io/',
    autoConnect: true,
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    auth: { login, deviceId } // ✅ localStorage emas, parametr
  });

  // 4. Handlerlar — parametrdan kelgan login/deviceId bilan
  attachHandlers(socket, login, deviceId);

  console.log(`✅ Socket reconnect tugadi: ${login} | ${deviceId}`);
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    if (socket.connected) {
      socket.disconnect();
    }
    socket = null;
    console.log('👋 Socket disconnect qilindi va tozalandi');
  }
}

export { getSocket };
export default getSocket;