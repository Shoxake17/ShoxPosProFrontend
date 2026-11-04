import { useEffect, useRef } from 'react';
import getSocket from '../utils/socket';

/**
 * Ma'lumotni JONLI yangilaydi: server socket orqali signal yuborganda `refresh` chaqiriladi.
 *
 * So'rov (polling) ASOSIY usul EMAS: jonli ulanish (WebSocket) ishlab turgan paytda hech qanday
 * vaqt bo'yicha so'rov yo'q. Faqat ulanish uzilganda (tarmoq, server qayta ishga tushishi)
 * `fallbackMs` oralig'ida VAQTINCHA so'raladi; ulanish tiklanishi bilan so'rov to'xtaydi va
 * uzilish paytida o'tkazib yuborilgan o'zgarishlar uchun BIR marta darrov yangilanadi.
 *
 * `refresh` har qayta renderda o'zgarishi mumkin — oxirgi nusxasi `ref` orqali chaqiriladi,
 * shuning uchun ulanish tinglovchilari qayta o'rnatilmaydi.
 */
export function useLiveRefresh(
  refresh: () => void | Promise<void>,
  opts: { event?: string; fallbackMs?: number; enabled?: boolean } = {},
): void {
  const { event = 'storeOrder', fallbackMs = 10000, enabled = true } = opts;
  const ref = useRef(refresh);
  ref.current = refresh;

  useEffect(() => {
    if (!enabled) return;
    const socket = getSocket();
    let timer: ReturnType<typeof setInterval> | null = null;

    const run = () => { void ref.current(); };
    const stopFallback = () => { if (timer) { clearInterval(timer); timer = null; } };
    const startFallback = () => { if (!timer) timer = setInterval(run, fallbackMs); };

    const onSignal = () => run();
    const onConnect = () => { stopFallback(); run(); }; // uzilish paytidagi o'zgarishlarni oladi
    const onDown = () => startFallback();

    socket.on(event, onSignal);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDown);
    socket.on('connect_error', onDown);
    if (!socket.connected) startFallback();

    return () => {
      stopFallback();
      socket.off(event, onSignal);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDown);
      socket.off('connect_error', onDown);
    };
  }, [event, fallbackMs, enabled]);
}
