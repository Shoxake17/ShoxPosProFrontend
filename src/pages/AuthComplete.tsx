// AuthComplete.tsx — OnDex'dan qaytgach: sessiyani tasdiqlab, ilovani ishga tushiradi
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import { getFullDeviceInfo, getDeviceId as getStoredDeviceId } from "../utils/deviceUtils";
import { reconnectSocket, getSocket } from "../utils/socket";
import { invalidateAuthCache } from "../components/layout/ProtectedRoute";
import { setupAuthCheck } from "../utils/authUtils";
import { subscribeToPushNotifications } from "../utils/pushNotification";
import { syncUserCategoriesToIDB } from "../components/Category";
import { landingPath } from "../utils/storeAccess";

export default function AuthComplete() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    // StrictMode ikki marta chaqirsa ham bir marta ishlaydi
    if (started.current) return;
    started.current = true;

    (async () => {
      try {
        const res = await axiosInstance.get("/verify-session");
        const user = res.data?.user;
        const role = String(user?.role || "").toLowerCase().trim();
        if (res.status !== 200 || !user || (role !== "admin" && role !== "cashier")) {
          setError("Sessiya o'rnatilmadi. Qaytadan kiring.");
          return;
        }

        sessionStorage.setItem("currentUser", JSON.stringify(user));
        if (user.shopCategories) syncUserCategoriesToIDB(user.login, user.shopCategories);
        invalidateAuthCache();

        const deviceId = await getStoredDeviceId();
        const info = await getFullDeviceInfo();
        reconnectSocket(user.login, deviceId);
        setTimeout(() => {
          getSocket().emit("userLogged", {
            login: user.login,
            deviceId,
            deviceType: info.deviceType,
            deviceOS: info.deviceOS,
            active: true,
          });
        }, 500);

        setupAuthCheck(navigate);
        subscribeToPushNotifications();
        navigate(landingPath(role, user.storeCategory), { replace: true });
      } catch {
        setError("Sessiyani tekshirib bo'lmadi. Qaytadan kiring.");
      }
    })();
  }, [navigate]);

  return (
    <div style={{
      position: "fixed", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: "16px", padding: "16px",
      textAlign: "center",
    }}>
      {error ? (
        <>
          <p style={{ color: "#ef4444", fontSize: "15px" }}>{error}</p>
          <button
            onClick={() => navigate("/login", { replace: true })}
            style={{
              padding: "12px 24px", border: "none", borderRadius: "12px", color: "#fff",
              fontSize: "15px", fontWeight: 600, cursor: "pointer",
              background: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)",
            }}
          >
            Kirish sahifasiga
          </button>
        </>
      ) : (
        <p style={{ fontSize: "15px" }}>Kirilmoqda...</p>
      )}
    </div>
  );
}
