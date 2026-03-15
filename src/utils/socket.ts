// utils/socket.ts
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_URL as string) || '';

// ✅ Singleton socket instance
let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    const login = localStorage.getItem('currentLogin') ||
                  localStorage.getItem('login') || '';
    const deviceId = localStorage.getItem('deviceId') || '';

    socket = io(SOCKET_URL, {
      path: '/socket.io/',
      autoConnect: false, // ✅ MUHIM: reconnectSocket() chaqirilgunga to'xtatamiz
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      auth: { login, deviceId }
    });

    socket.on('connect', () => {
      console.log('🔌 Socket ulandi:', socket?.id);

      const _login = localStorage.getItem('currentLogin') ||
                     localStorage.getItem('login') || '';
      const _deviceId = localStorage.getItem('deviceId') || '';

      if (_login && _deviceId) {
        socket?.emit('registerUser', { login: _login, deviceId: _deviceId });
        console.log(`📲 Socket register: ${_login} | ${_deviceId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket uzildi:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('🔴 Socket xatosi:', err.message);
    });
  }

  return socket;
}

// ✅ Login bo'lganda socket auth ni yangilash va qayta ulanish
export function reconnectSocket(login: string, deviceId: string): void {
  console.log(`🔄 Reconnect boshlanmoqda: ${login} | ${deviceId}`);
  
  // 1. Eski socketni to'liq tozalash
  if (socket) {
    console.log('🗑️ Eski socket o\'chirilmoqda...');
    socket.removeAllListeners();
    socket.disconnect();
    socket = null; // ✅ MUHIM: nullga tiklash
  }

  // 2. localStorage ni yangilash
  localStorage.setItem('currentLogin', login);
  localStorage.setItem('deviceId', deviceId);

  // 3. Yangi socket yaratish — yangi auth bilan
  socket = io(SOCKET_URL, {
    path: '/socket.io/',
    autoConnect: true, // ✅ Darhol ulanish
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    auth: { login, deviceId } // ✅ Yangi auth ma'lumotlari
  });

  // 4. Event handlerlarni qayta o'rnatish
  socket.on('connect', () => {
    console.log('✅ Yangi socket ulandi:', socket?.id);
    socket?.emit('registerUser', { login, deviceId });
    console.log(`📲 registerUser yuborildi: ${login} | ${deviceId}`);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket uzildi:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('🔴 Socket xatosi:', err.message);
  });

  console.log(`🔄 Socket reconnect tugadi: ${login} | ${deviceId}`);
}

// ✅ Logout bo'lganda socketni to'liq tozalash
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