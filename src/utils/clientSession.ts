/**
 * Sessiya bilan bog'liq ma'lumotlar localStorage da saqlanmaydi (DoS/da doimiy XSS oqimi kamayadi).
 * JWT HttpOnly cookie orqali server tekshiradi; bu yerda faqat joriy tab uchun UI keshi.
 */

export const SESSION_USER_KEY = "currentUser";
export const SESSION_AUTH_CACHE_KEY = "authCache";
export const SESSION_SALES_KEY = "sales";

const LEGACY_LS_AUTH_KEYS = ["currentLogin", "activeUser", "login"] as const;

export function getSessionLogin(): string {
  try {
    const raw = sessionStorage.getItem(SESSION_USER_KEY);
    if (!raw) return "";
    const u = JSON.parse(raw) as { login?: string };
    return typeof u?.login === "string" ? u.login : "";
  } catch {
    return "";
  }
}

export function getSessionUserImage(): string | null {
  try {
    const raw = sessionStorage.getItem(SESSION_USER_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw) as { image?: string };
    return typeof u?.image === "string" ? u.image : null;
  } catch {
    return null;
  }
}

const SESSION_PROFILE_KEYS = ["userName", "userEmail", "userPhone"] as const;

export function clearAuthClientState(options?: { clearAiChats?: boolean }): void {
  try {
    sessionStorage.removeItem(SESSION_USER_KEY);
    sessionStorage.removeItem(SESSION_AUTH_CACHE_KEY);
    sessionStorage.removeItem(SESSION_SALES_KEY);
    for (const k of SESSION_PROFILE_KEYS) {
      sessionStorage.removeItem(k);
    }
    for (const k of LEGACY_LS_AUTH_KEYS) {
      localStorage.removeItem(k);
    }
    if (options?.clearAiChats) {
      localStorage.removeItem("ai_chats_v3");
      sessionStorage.removeItem("ai_chats_v3");
    }
  } catch {
    /* ignore */
  }
}

/** Cookie bo'yicha sessiya bo'lsa, foydalanuvchini sessionStorage ga yozadi (socket / guard dan oldin). */
export async function hydrateSessionUserFromCookie(): Promise<void> {
  try {
    if (sessionStorage.getItem(SESSION_USER_KEY)) return;
    const r = await fetch("/api/verify-session", { credentials: "include" });
    if (!r.ok) return;
    const d = (await r.json()) as { user?: { id?: string; login?: string; role?: string } };
    if (d?.user?.login) {
      sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(d.user));
    }
    for (const k of LEGACY_LS_AUTH_KEYS) {
      localStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
}
