// Login.tsx — OnDex akkaunti bilan kirish (telefon -> Telegram kodi yoki parol).
// ShoxPos'ning o'z login/parol tizimi YO'Q: hamma narsani OnDex tekshiradi,
// shuning uchun Flutter ilovasi bilan AYNI akkaunt va AYNI ma'lumot.
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance, { setMemoryCsrfToken } from "../api/axiosInstance";
import { getFullDeviceInfo, getDeviceId as getStoredDeviceId } from "../utils/deviceUtils";
import { getLayoutStyles } from "../components/layout/MainLayout";
import { invalidateAuthCache } from "../components/layout/ProtectedRoute";
import { ArrowRight, XCircle, ScanFace, Send, ArrowLeft } from "lucide-react";

const PHONE_DIGITS = 9; // +998 dan keyingi raqamlar

type Step = "phone" | "code";

// "901234567" -> "90 123 45 67"
const groupPhone = (d: string) =>
  [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(" ");

export default function Login() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [step, setStep] = useState<Step>("phone");
  const [digits, setDigits] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordMode, setPasswordMode] = useState(false);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const csrfReady = useRef(false);

  useEffect(() => {
    const saved = (localStorage.getItem("theme") as "dark" | "light") || "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
    invalidateAuthCache();
  }, []);

  const phone = `+998${digits}`;
  const phoneValid = digits.length === PHONE_DIGITS;

  const errorText = (e: any, fallback: string): string =>
    e?.response?.data?.message || fallback;

  // POST'lar CSRF tokenini talab qiladi (axios uni xotiradan qo'shadi).
  const ensureCsrf = async () => {
    if (csrfReady.current) return;
    const res = await axiosInstance.get("/csrf-token");
    setMemoryCsrfToken(res.data.csrfToken);
    csrfReady.current = true;
  };

  const deviceBody = async () => {
    const deviceId = await getStoredDeviceId();
    if (!deviceId) throw new Error("device");
    const info = await getFullDeviceInfo();
    return { deviceId, deviceType: info.deviceType, deviceOS: info.deviceOS };
  };

  const run = async (fn: () => Promise<void>) => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      await fn();
    } catch (e: any) {
      if (e?.message === "device") {
        setError("Qurilma identifikatori aniqlanmadi. Brauzer sozlamalarini tekshiring.");
      } else {
        setError(errorText(e, "Server bilan bog'lanib bo'lmadi"));
        // CSRF muddati o'tgan bo'lishi mumkin — keyingi urinishda yangilanadi.
        if (e?.response?.status === 403) csrfReady.current = false;
      }
    } finally {
      setLoading(false);
    }
  };

  // 1) Telegram botga havola olish
  const startTelegram = () =>
    run(async () => {
      if (!phoneValid) {
        setError("Telefon raqamini to'liq kiriting");
        return;
      }
      await ensureCsrf();
      const res = await axiosInstance.post("/auth/ondex/telegram-start", { phone });
      const link = res.data.deepLink as string;
      setDeepLink(link);
      setStep("code");
      setCode("");
      // Bot DARHOL ochiladi; brauzer oynani to'ssa ham tugma qoladi.
      window.open(link, "_blank", "noopener,noreferrer");
    });

  // 2) Telegramdan kelgan kodni tasdiqlash
  const verifyCode = () =>
    run(async () => {
      await ensureCsrf();
      await axiosInstance.post("/auth/ondex/verify", { phone, code, ...(await deviceBody()) });
      navigate("/auth/complete", { replace: true });
    });

  // Parol bilan (hamkorga superadmin bergan yoki o'zi o'rnatgan parol)
  const loginWithPassword = () =>
    run(async () => {
      if (!phoneValid || !password) {
        setError("Telefon va parolni kiriting");
        return;
      }
      await ensureCsrf();
      await axiosInstance.post("/auth/ondex/password", { phone, password, ...(await deviceBody()) });
      navigate("/auth/complete", { replace: true });
    });

  const restart = () => {
    setStep("phone");
    setDeepLink(null);
    setCode("");
    setError("");
  };

  const isDark = theme === "dark";
  const layoutStyles = getLayoutStyles(theme);
  const muted = isDark ? "#8b92a7" : "#64748b";
  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "14px 16px",
    background: isDark ? "#0f1420" : "#f8f9ff",
    border: `1px solid ${isDark ? "#2a3144" : "#e2e8f0"}`,
    borderRadius: "12px", color: isDark ? "#fff" : "#1a1f2e",
    fontSize: "15px", outline: "none",
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === "code") verifyCode();
    else if (passwordMode) loginWithPassword();
    else startTelegram();
  };

  const primaryLabel =
    step === "code" ? "Kirish" : passwordMode ? "Kirish" : "Telegram orqali kod olish";
  const primaryDisabled =
    loading ||
    (step === "code" ? code.length < 4 : !phoneValid || (passwordMode && !password));

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
        .link-btn {
          background: none; border: none; cursor: pointer; padding: 6px 0;
          font-size: 13.5px; font-weight: 600; color: #667eea;
        }
      `}</style>

      <div className="login-wrapper">
        <form className="login-card" onSubmit={onSubmit} style={{ display: "grid", gap: "16px" }}>
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
            <p style={{ color: muted, fontSize: "14px" }}>
              {step === "code"
                ? "Telegram botdan kelgan kodni kiriting"
                : "OnDex akkauntingiz raqami bilan kiring"}
            </p>
          </div>

          {/* TELEFON */}
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: muted }}>
              Telefon raqam
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <span style={{ ...inputStyle, width: "auto", display: "flex", alignItems: "center", fontWeight: 600 }}>
                +998
              </span>
              <input
                type="tel" inputMode="numeric" autoComplete="tel" placeholder="90 123 45 67"
                value={groupPhone(digits)} disabled={step === "code" || loading}
                onChange={(e) => setDigits(e.target.value.replace(/\D/g, "").slice(0, PHONE_DIGITS))}
                style={inputStyle} autoFocus
              />
            </div>
          </div>

          {/* PAROL (faqat parol rejimida) */}
          {step === "phone" && passwordMode && (
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: muted }}>
                Parol
              </label>
              <input
                type="password" autoComplete="current-password" value={password}
                onChange={(e) => setPassword(e.target.value)} disabled={loading}
                style={inputStyle}
              />
            </div>
          )}

          {/* KOD */}
          {step === "code" && (
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: muted }}>
                Tasdiqlash kodi
              </label>
              <input
                type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="123456"
                maxLength={8} value={code} autoFocus disabled={loading}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                style={{ ...inputStyle, textAlign: "center", fontSize: "22px", letterSpacing: "6px" }}
              />
              {deepLink && (
                <button
                  type="button" className="link-btn"
                  onClick={() => window.open(deepLink, "_blank", "noopener,noreferrer")}
                >
                  <Send size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />
                  Telegramni ochish
                </button>
              )}
            </div>
          )}

          {error && (
            <div style={{
              padding: "12px 14px", borderRadius: "12px",
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
              color: "#ef4444", fontSize: "14px", display: "flex", gap: "8px", alignItems: "flex-start",
            }}>
              <XCircle size={16} style={{ flexShrink: 0, marginTop: "1px" }} />
              <span style={{ wordBreak: "break-word" }}>{error}</span>
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={primaryDisabled}>
            {loading ? "Kutilmoqda..." : primaryLabel}
            {!loading && <ArrowRight size={18} />}
          </button>

          {step === "code" ? (
            <button type="button" className="link-btn" onClick={restart} disabled={loading}>
              <ArrowLeft size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />
              Boshqa raqam
            </button>
          ) : (
            <button
              type="button" className="link-btn" disabled={loading}
              onClick={() => { setPasswordMode((m) => !m); setError(""); }}
            >
              {passwordMode ? "Telegram kodi bilan kirish" : "Parol bilan kirish"}
            </button>
          )}
        </form>
      </div>
    </>
  );
}
