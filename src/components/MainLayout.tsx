// src/components/MainLayout.tsx
import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import {
  User, Wifi, WifiOff,
  BatteryLow, BatteryMedium, BatteryFull, BatteryCharging,
} from "lucide-react";
import { useResponsive } from "../hooks/useResponsive";
import Notification from "./NotificationBar";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface LayoutProps {
  children: React.ReactNode;
  theme: "dark" | "light";
  title: string;
  userImage?: string | null;
  handleImageUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

type Theme = "dark" | "light";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
export const getLayoutStyles = (theme: Theme) => ({
  background: theme === "dark" ? "#0a0e1a" : "#f8f9ff",
  color:      theme === "dark" ? "#fff"    : "#1a1f2e",
  transition: "all 0.3s ease",
});

const tc = (theme: Theme, dark: string, light: string) =>
  theme === "dark" ? dark : light;

const getBatteryColor = (isCharging: boolean, level: number): string => {
  if (isCharging)  return "#22c55e";
  if (level > 50)  return "#22c55e";
  if (level > 20)  return "#eab308";
  return "#ef4444";
};

const getBatteryIcon = (isCharging: boolean, level: number, size: number) => {
  if (isCharging)  return <BatteryCharging size={size} strokeWidth={2.5} />;
  if (level > 80)  return <BatteryFull     size={size} strokeWidth={2.5} />;
  if (level > 20)  return <BatteryMedium   size={size} strokeWidth={2.5} />;
  return                  <BatteryLow      size={size} strokeWidth={2.5} />;
};

// ─────────────────────────────────────────────
// Custom hook: battery + network
// ─────────────────────────────────────────────
const useDeviceStatus = () => {
  const [isOnline,      setIsOnline]      = useState(navigator.onLine);
  const [batteryLevel,  setBatteryLevel]  = useState(100);
  const [isCharging,    setIsCharging]    = useState(false);

  useEffect(() => {
    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);

    let battery: any;

    const updateBattery = (bat: any) => {
      setBatteryLevel(Math.round(bat.level * 100));
      setIsCharging(bat.charging);
    };

    if ((navigator as any).getBattery) {
      (navigator as any).getBattery().then((bat: any) => {
        battery = bat;
        updateBattery(battery);
        battery.addEventListener("levelchange",  () => updateBattery(battery));
        battery.addEventListener("chargingchange", () => updateBattery(battery));
      });
    }

    return () => {
      window.removeEventListener("online",  onOnline);
      window.removeEventListener("offline", onOffline);
      if (battery) {
        battery.removeEventListener("levelchange",   () => updateBattery(battery));
        battery.removeEventListener("chargingchange", () => updateBattery(battery));
      }
    };
  }, []);

  return { isOnline, batteryLevel, isCharging };
};

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

/** Batareya ko'rsatkichi */
const BatteryIndicator: React.FC<{
  isCharging: boolean;
  level: number;
  isMobile: boolean;
  theme: Theme;
}> = ({ isCharging, level, isMobile, theme }) => (
  <div style={{
    display: "flex", alignItems: "center",
    padding: isMobile ? "5px 10px" : "10px",
    borderRadius: "50px",
    background: tc(theme, "rgba(255,255,255,0.05)", "rgba(0,0,0,0.05)"),
    color: getBatteryColor(isCharging, level),
    gap: isMobile ? 4 : 8,
    fontWeight: "bold",
    fontSize: isMobile ? "12px" : "14px",
  }}>
    {getBatteryIcon(isCharging, level, isMobile ? 18 : 23)}
    <span>{level}%</span>
  </div>
);

/** Tarmoq holati */
const NetworkIndicator: React.FC<{
  isOnline: boolean;
  isMobile: boolean;
}> = ({ isOnline, isMobile }) => (
  <div style={{
    display: "flex",
    padding: isMobile ? "7px" : "10px",
    borderRadius: "50px",
    background: isOnline ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
    color:      isOnline ? "#22c55e"              : "#ef4444",
  }}>
    {isOnline
      ? <Wifi    size={isMobile ? 18 : 23} strokeWidth={2.5} />
      : <WifiOff size={isMobile ? 18 : 23} strokeWidth={2.5} />
    }
  </div>
);

/** Profil avatar */
const ProfileAvatar: React.FC<{
  userImage: string | null | undefined;
  isMobile: boolean;
  theme: Theme;
}> = ({ userImage, isMobile, theme }) => (
  <>
    <div
      onClick={() => !isMobile && document.getElementById("fileInput")?.click()}
      style={{
        width:      isMobile ? 36 : 44,
        height:     isMobile ? 36 : 44,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #667eea, #764ba2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor:     isMobile ? "default" : "pointer",
        overflow: "hidden",
        border: `2px solid ${tc(theme, "#1a1f2e", "#e2e8f0")}`,
        flexShrink: 0,
        opacity:        isMobile ? 0 : 1,
        visibility:     isMobile ? "hidden" : "visible",
        pointerEvents:  isMobile ? "none"   : "auto",
        transition: "all 0.3s ease",
      }}
    >
      {userImage
        ? <img src={userImage} alt="User" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <User size={isMobile ? 18 : 20} color="#fff" />
      }
    </div>
    <input
      type="file" id="fileInput"
      style={{ display: "none" }}
      accept="image/*"
    />
  </>
);

/** Header o'ng tomon: barcha status ikonkalari */
const HeaderActions: React.FC<{
  theme: Theme;
  isMobile: boolean;
  isOnline: boolean;
  batteryLevel: number;
  isCharging: boolean;
  userImage: string | null | undefined;
  handleImageUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ theme, isMobile, isOnline, batteryLevel, isCharging, userImage, handleImageUpload }) => (
  <div style={{ display: "flex", gap: isMobile ? 8 : 16, alignItems: "center", flexShrink: 0 }}>
    <BatteryIndicator
      isCharging={isCharging}
      level={batteryLevel}
      isMobile={isMobile}
      theme={theme}
    />
    <NetworkIndicator isOnline={isOnline} isMobile={isMobile} />
    <Notification theme={theme} />
    <ProfileAvatar userImage={userImage} isMobile={isMobile} theme={theme} />
    <input
      type="file" id="fileInput" style={{ display: "none" }}
      onChange={handleImageUpload} accept="image/*"
    />
  </div>
);

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function MainLayout({
  children, theme, title, userImage = null, handleImageUpload,
}: LayoutProps) {
  const { isMobile, sidebarOpen, setSidebarOpen } = useResponsive();
  const { isOnline, batteryLevel, isCharging }    = useDeviceStatus();

  return (
    <div style={{
      background:  tc(theme, "#0a0e1a", "#f8f9ff"),
      minHeight: "100vh", margin: -8,
      color:       tc(theme, "#fff", "#1a1f2e"),
      transition: "all 0.3s ease", overflowX: "hidden",
    }}>
      <Sidebar theme={theme} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <main style={{
        background:  tc(theme, "#0a0e1a", "#f8f9ff"),
        marginLeft:  isMobile ? 0 : (sidebarOpen ? 280 : 80),
        padding:     isMobile ? "15px" : "30px",
        transition: "margin-left 0.3s ease",
        minHeight: "100vh", boxSizing: "border-box",
      }}>
        <header style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 32, gap: isMobile ? 12 : 16,
          width: "100%",
          paddingLeft: isMobile && !sidebarOpen ? "48px" : "0px",
          transition: "padding-left 0.3s ease",
        }}>
          {/* Sarlavha */}
          <div style={{ display: "flex", alignItems: "center", minWidth: 0, flexShrink: 1 }}>
            <h1 style={{
              fontSize:   isMobile ? "22px" : "42px",
              fontWeight: 800,
              background: "linear-gradient(90deg,#3b82f6,#8b5cf6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              margin: 0, whiteSpace: "nowrap",
              overflow: "hidden", textOverflow: "ellipsis",
              lineHeight: isMobile ? "1.2" : "normal",
            }}>
              {title}
            </h1>
          </div>

          {/* Statuslar */}
          <HeaderActions
            theme={theme}
            isMobile={isMobile}
            isOnline={isOnline}
            batteryLevel={batteryLevel}
            isCharging={isCharging}
            userImage={userImage}
            handleImageUpload={handleImageUpload}
          />
        </header>

        {children}
      </main>
    </div>
  );
}