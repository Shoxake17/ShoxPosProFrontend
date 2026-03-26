import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import {
  User, Wifi, WifiOff,
  BatteryLow, BatteryMedium, BatteryFull, BatteryCharging
} from "lucide-react";
import { useResponsive } from "../hooks/useResponsive";
import Notification from "./NotificationBar";

interface LayoutProps {
  children: React.ReactNode;
  theme: "dark" | "light";
  title: string;
  userImage?: string | null;
  handleImageUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const getLayoutStyles = (theme: "dark" | "light") => ({
  background: theme === "dark" ? "#0a0e1a" : "#f8f9ff",
  color: theme === "dark" ? "#fff" : "#1a1f2e",
  transition: "all 0.3s ease",
});

export default function MainLayout({
  children,
  theme,
  title,
  userImage = null,
  handleImageUpload,
}: LayoutProps) {
  const { isMobile, sidebarOpen, setSidebarOpen } = useResponsive();

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [batteryLevel, setBatteryLevel] = useState<number>(100);
  const [isCharging, setIsCharging] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    let battery: any;
    const updateBatteryInfo = (bat: any) => {
      setBatteryLevel(Math.round(bat.level * 100));
      setIsCharging(bat.charging);
    };

    if ((navigator as any).getBattery) {
      (navigator as any).getBattery().then((bat: any) => {
        battery = bat;
        updateBatteryInfo(battery);
        battery.addEventListener("levelchange", () => updateBatteryInfo(battery));
        battery.addEventListener("chargingchange", () => updateBatteryInfo(battery));
      });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (battery) {
        battery.removeEventListener("levelchange", () => updateBatteryInfo(battery));
        battery.removeEventListener("chargingchange", () => updateBatteryInfo(battery));
      }
    };
  }, []);

  const getBatteryColor = () => {
    if (isCharging) return "#22c55e";
    if (batteryLevel > 50) return "#22c55e";
    if (batteryLevel > 20) return "#eab308";
    return "#ef4444";
  };

  const getBatteryIcon = () => {
    const iconSize = isMobile ? 18 : 23;
    if (isCharging) return <BatteryCharging size={iconSize} strokeWidth={2.5} />;
    if (batteryLevel > 80) return <BatteryFull size={iconSize} strokeWidth={2.5} />;
    if (batteryLevel > 20) return <BatteryMedium size={iconSize} strokeWidth={2.5} />;
    return <BatteryLow size={iconSize} strokeWidth={2.5} />;
  };

  return (
    <div
      style={{
        background: theme === "dark" ? "#0a0e1a" : "#f8f9ff",
        minHeight: "100vh",
        margin: -8,
        color: theme === "dark" ? "#fff" : "#1a1f2e",
        transition: "all 0.3s ease",
        overflowX: "hidden",
      }}
    >
      <Sidebar theme={theme} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <main
        style={{
          background: theme === "dark" ? "#0a0e1a" : "#f8f9ff",
          marginLeft: isMobile ? 0 : (sidebarOpen ? 280 : 80),
          padding: isMobile ? "15px" : "30px",
          transition: "margin-left 0.3s ease",
          minHeight: "100vh",
          boxSizing: "border-box",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 32,
            gap: isMobile ? 12 : 16,
            width: "100%",
            paddingLeft: isMobile && !sidebarOpen ? "48px" : "0px",
            transition: "padding-left 0.3s ease",
          }}
        >
          {/* Chap tomon: Sarlavha */}
          <div style={{ display: "flex", alignItems: "center", minWidth: 0, flexShrink: 1 }}>
            <h1
              style={{
                fontSize: isMobile ? "22px" : "42px",
                fontWeight: 800,
                background: "linear-gradient(90deg,#3b82f6,#8b5cf6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                margin: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: isMobile ? "1.2" : "normal",
              }}
            >
              {title}
            </h1>
          </div>

          {/* O'ng tomon: Statuslar */}
          <div
            style={{
              display: "flex",
              gap: isMobile ? "8px" : "16px",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            {/* Batareya */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: isMobile ? "5px 10px" : "10px",
                borderRadius: "50px",
                background: theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                color: getBatteryColor(),
                gap: isMobile ? "4px" : "8px",
                fontWeight: "bold",
                fontSize: isMobile ? "12px" : "14px",
              }}
            >
              {getBatteryIcon()}
              <span>{batteryLevel}%</span>
            </div>

            {/* Network */}
            <div
              style={{
                display: "flex",
                padding: isMobile ? "7px" : "10px",
                borderRadius: "50px",
                background: isOnline ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                color: isOnline ? "#22c55e" : "#ef4444",
              }}
            >
              {isOnline ? (
                <Wifi size={isMobile ? 18 : 23} strokeWidth={2.5} />
              ) : (
                <WifiOff size={isMobile ? 18 : 23} strokeWidth={2.5} />
              )}
            </div>

            {/* Notification — har doim o'zi yuklaydi */}
            <Notification theme={theme} />

            {/* Profil */}
            <div
              onClick={() => !isMobile && document.getElementById("fileInput")?.click()}
              style={{
                width: isMobile ? 36 : 44,
                height: isMobile ? 36 : 44,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #667eea, #764ba2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: isMobile ? "default" : "pointer",
                overflow: "hidden",
                border: `2px solid ${theme === "dark" ? "#1a1f2e" : "#e2e8f0"}`,
                flexShrink: 0,
                opacity: isMobile ? 0 : 1,
                visibility: isMobile ? "hidden" : "visible",
                pointerEvents: isMobile ? "none" : "auto",
                transition: "all 0.3s ease",
              }}
            >
              {userImage ? (
                <img src={userImage} alt="User" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <User size={isMobile ? 18 : 20} color="#fff" />
              )}
            </div>

            {/* Fayl yuklash uchun yashirin input */}
            <input
              type="file"
              id="fileInput"
              style={{ display: "none" }}
              onChange={handleImageUpload}
              accept="image/*"
            />
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}