// Login.tsx — OnDex orqali kirish (OIDC, A4c.5).
//
// Parol, Telegram kodi va TOTP bu sahifada YO'Q va ShoxPos serveridan O'TMAYDI:
// tugma brauzerni OnDex kirish sahifasiga (api.ondex.uz/v2/oauth/login) olib
// boradi. U yerda kirilgach OnDex ShoxPos'ga qaytaradi va server HttpOnly
// sessiya cookie'sini qo'yadi. Bir marta OnDex'ga kirgan brauzer keyingi safar
// parolsiz qaytadi (SSO).
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { getLayoutStyles } from "../components/layout/MainLayout";
import { invalidateAuthCache } from "../components/layout/ProtectedRoute";
import { clearAuthClientState } from "../utils/clientSession";
import { ArrowRight, XCircle, ScanFace } from "lucide-react";

// Server (`routes/oidcAuth.js`) qaytaradigan `?error=` kodlari.
const ERRORS: Record<string, string> = {
  not_linked: "Bu OnDex akkaunti uchun do'kon hisobi ochilmagan. OnDex administratsiyasiga murojaat qiling.",
  blocked: "Hisob bloklangan.",
  deleted: "Bu hisob o'chirilgan.",
  unavailable: "OnDex bilan bog'lanib bo'lmadi. Birozdan so'ng urinib ko'ring.",
  invalid: "Kirish tasdiqlanmadi. Qaytadan urinib ko'ring.",
  sso_off: "OnDex orqali kirish sozlanmagan. Administrator bilan bog'laning.",
};

/** Faqat shu saytdagi nisbiy yo'l (server ham tekshiradi). */
const safeReturn = (p: unknown): string =>
  typeof p === "string" && /^\/(?![/\\])/.test(p) && !p.startsWith("/login") ? p : "/";

export default function Login() {
  const location = useLocation();
  const [theme] = useState<"dark" | "light">(
    () => (localStorage.getItem("theme") as "dark" | "light") || "dark");
  const [going, setGoing] = useState(false);

  const error = useMemo(() => {
    const code = new URLSearchParams(location.search).get("error") || "";
    return code ? ERRORS[code] || ERRORS.invalid : "";
  }, [location.search]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    invalidateAuthCache();
    clearAuthClientState();
  }, [theme]);

  const from = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
  const returnTo = safeReturn(from ? `${from.pathname || "/"}${from.search || ""}` : "/");
  const target = `/api/auth/oidc/login?return=${encodeURIComponent(returnTo)}`;

  const login = () => {
    if (going) return;
    setGoing(true);
    // To'liq sahifa yo'naltirishi (fetch emas): OnDex sahifasi o'z domenida ochiladi.
    window.location.assign(target);
  };

  // Oraliq sahifa YO'Q (egasi qarori, 2026-11-08): xato bo'lmasa darhol OnDex ID
  // (passport.ondex.uz) ga. `replace` — orqaga tugmasi bu sahifaga qaytarmaydi.
  // Xato bilan qaytilgan bo'lsa (`?error=`) avtomatik yo'naltirilMAYDI — aks holda
  // cheksiz aylana bo'lardi; xabar va "Qaytadan urinish" ko'rsatiladi.
  useEffect(() => {
    if (!error) window.location.replace(target);
  }, [error, target]);

  if (!error) {
    return (
      <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        background: "#14161b", color: "#a3a9b3", fontFamily: "system-ui, sans-serif" }}>
        OnDex ID'ga o'tilmoqda…
      </div>
    );
  }

  const isDark = theme === "dark";
  const layoutStyles = getLayoutStyles(theme);
  const muted = isDark ? "#8b92a7" : "#64748b";

  return (
    <>
      <style>{`
        html, body { margin: 0; padding: 0; height: 100%; width: 100%; }
        .login-wrapper {
          background: ${layoutStyles.background};
          color: ${layoutStyles.color};
          position: fixed; inset: 0;
          display: flex; align-items: center; justify-content: center;
          padding: 16px; overflow-y: auto;
        }
        .login-card {
          width: 100%; max-width: 440px; box-sizing: border-box;
          background: ${isDark ? "linear-gradient(135deg,#1a1f2e 0%,#252b3d 100%)" : "linear-gradient(135deg,#fff 0%,#f8f9ff 100%)"};
          border-radius: 20px; border: 1px solid ${isDark ? "#2a3144" : "#e2e8f0"};
          padding: clamp(20px,5vw,36px) clamp(16px,5vw,32px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
        }
        .submit-btn {
          width: 100%; padding: 15px 16px; border: none; border-radius: 12px;
          font-size: 16px; font-weight: 600; cursor: pointer; color: #fff;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          background: linear-gradient(135deg,#667eea 0%,#764ba2 100%);
        }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      <div className="login-wrapper">
        <div className="login-card" style={{ display: "grid", gap: "16px" }}>
          <div style={{ textAlign: "center", marginBottom: "4px" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: "64px", height: "64px", borderRadius: "16px", marginBottom: "16px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}>
              <ScanFace size={32} color="#fff" />
            </div>
            <h2 style={{ fontSize: "clamp(20px,5vw,24px)", fontWeight: 600, marginBottom: "8px" }}>
              OnDex Merchant Panel
            </h2>
            <p style={{ color: muted, fontSize: "14px", lineHeight: 1.5 }}>
              Kirish OnDex akkauntingiz orqali: parol yoki Telegram kodi, biznes egasi uchun
              ikki bosqichli himoya bilan.
            </p>
          </div>

          {error && (
            <div role="alert" style={{
              padding: "12px 14px", borderRadius: "12px",
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
              color: "#ef4444", fontSize: "14px", display: "flex", gap: "8px", alignItems: "flex-start",
            }}>
              <XCircle size={16} style={{ flexShrink: 0, marginTop: "1px" }} />
              <span style={{ wordBreak: "break-word" }}>{error}</span>
            </div>
          )}

          <button type="button" className="submit-btn" onClick={login} disabled={going} autoFocus>
            {going ? "OnDex'ga o'tilmoqda..." : "Qaytadan urinish"}
            {!going && <ArrowRight size={18} />}
          </button>

          <p style={{ color: muted, fontSize: "12px", textAlign: "center", margin: 0 }}>
            Parol va kodlar faqat OnDex serveriga yuboriladi.
          </p>
        </div>
      </div>
    </>
  );
}
