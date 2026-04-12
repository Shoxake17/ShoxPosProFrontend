// MainLayout.tsx
import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import {
  User, Wifi, WifiOff,
  BatteryLow, BatteryMedium, BatteryFull, BatteryCharging,
} from "lucide-react";
import { useResponsive } from "../../hooks/useResponsive";
import Notification from "../NotificationBar";
import { useTranslation } from 'react-i18next';
import { useHandTrackingContext } from "../../context/HandTrackingContext";
import MobileBottomBar from "./MobileBottomBar"; // ✅ Import qilindi

// ─────────────────────────────────────────────
// Types & Helpers
// ─────────────────────────────────────────────
export interface LayoutProps {
  children: React.ReactNode;
  theme: "dark" | "light";
  title: string;
  userImage?: string | null;
  handleImageUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export type Theme = "dark" | "light";

export const getLayoutStyles = (theme: Theme) => ({
  background: theme === "dark" ? "#0a0e1a" : "#f8f9ff",
  color:      theme === "dark" ? "#fff"    : "#1a1f2e",
  transition: "all 0.3s ease",
});

export const tc = (theme: Theme, dark: string, light: string) =>
  theme === "dark" ? dark : light;

// ─────────────────────────────────────────────
// Battery helpers
// ─────────────────────────────────────────────
const getBatteryColor = (isCharging: boolean, level: number): string => {
  if (isCharging) return "#22c55e";
  if (level > 50) return "#22c55e";
  if (level > 20) return "#eab308";
  return "#ef4444";
};

const getBatteryIcon = (isCharging: boolean, level: number, size: number) => {
  if (isCharging) return <BatteryCharging size={size} strokeWidth={2.5} />;
  if (level > 80) return <BatteryFull size={size} strokeWidth={2.5} />;
  if (level > 20) return <BatteryMedium size={size} strokeWidth={2.5} />;
  return <BatteryLow size={size} strokeWidth={2.5} />;
};

// ─────────────────────────────────────────────
// Custom hook: battery + network
// ─────────────────────────────────────────────
const useDeviceStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isCharging, setIsCharging] = useState(false);

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
        battery.addEventListener("levelchange",   () => updateBattery(battery));
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
const BatteryIndicator: React.FC<{
  isCharging: boolean; level: number; isMobile: boolean; theme: Theme;
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

const NetworkIndicator: React.FC<{ isOnline: boolean; isMobile: boolean }> = ({ isOnline, isMobile }) => (
  <div style={{
    display: "flex",
    padding: isMobile ? "7px" : "10px",
    borderRadius: "50px",
    background: isOnline ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
    color: isOnline ? "#22c55e" : "#ef4444",
  }}>
    {isOnline
      ? <Wifi     size={isMobile ? 18 : 23} strokeWidth={2.5} />
      : <WifiOff size={isMobile ? 18 : 23} strokeWidth={2.5} />
    }
  </div>
);

// ─────────────────────────────────────────────
// Main Layout Component
// ─────────────────────────────────────────────
export default function MainLayout({
  children, theme, title, userImage = null, handleImageUpload,
}: LayoutProps) {
  const { isMobile, sidebarOpen, setSidebarOpen } = useResponsive();
  const { isOnline, batteryLevel, isCharging } = useDeviceStatus();
  const { t } = useTranslation('common');

  useHandTrackingContext();

  const isDark = theme === "dark";

  return (
    <div style={{
      background: isDark ? "#0a0e1a" : "#f8f9ff",
      minHeight: "100vh",
      width: "100%",
      color: isDark ? "#fff" : "#1a1f2e",
      position: "relative",
    }}>

      {/* ✅ Desktop da Sidebar, mobileda MobileBottomBar */}
      {!isMobile && (
        <Sidebar theme={theme} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      )}

      <main style={{
        marginLeft: isMobile ? 0 : (sidebarOpen ? "280px" : "80px"),
        // ✅ Mobileda BottomBar ustiga chiqmasligi uchun pastdan bo'sh joy
        paddingBottom: isMobile ? "100px" : "30px",
        padding: isMobile ? "15px 15px 100px 15px" : "30px",
        transition: "margin-left 0.3s ease",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}>

        {/* Header */}
        <header style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 32,
          gap: 16,
          paddingLeft: isMobile && !sidebarOpen ? "50px" : "0px",
        }}>
          <h1 style={{
            fontSize: isMobile ? "24px" : "42px",
            fontWeight: 800,
            background: "linear-gradient(90deg,#3b82f6,#8b5cf6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            margin: 0,
          }}>
            {title}
          </h1>

          <div style={{ display: "flex", gap: isMobile ? 8 : 16, alignItems: "center" }}>
            <BatteryIndicator isCharging={isCharging} level={batteryLevel} isMobile={isMobile} theme={theme} />
            <NetworkIndicator isOnline={isOnline} isMobile={isMobile} />
            <Notification theme={theme} />
          </div>
        </header>

        {/* Sahifa kontenti */}
        <div style={{ flex: 1 }}>
          {children}
        </div>
      </main>

      {/* ✅ Faqat mobileda MobileBottomBar ko'rsatiladi */}
      {isMobile && (
        <MobileBottomBar theme={theme} />
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background-color: ${isDark ? "#0a0e1a" : "#f8f9ff"} !important;
          overflow-x: hidden;
          width: 100%;
        }
        #root {
          width: 100%;
        }
      `}} />
    </div>
  );
}