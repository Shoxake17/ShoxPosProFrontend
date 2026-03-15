// src/pages/Menu.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../components/MainLayout";
import { useTranslation } from "../components/languages/Menu";
import { setupAuthCheck } from '../utils/authUtils';
import { useResponsive } from "../hooks/useResponsive"; // useResponsive hookini import qilamiz

import CashbackChart from "../components/menu/CashbackChart";
import DataBase from "../components/menu/DataBase";
import UserProductsCount from "../components/menu/LoginDataBase";
import Chat from "../components/menu/Chat";
import Tolov from "../components/menu/Tolov";
import Hisobot from "../components/menu/Hisobot";
import Sotuvlar from "../components/menu/Sotuvlar";
import Qr from "../components/menu/Qr";

export default function Menu() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isMobile } = useResponsive(); // Mobil holatni aniqlaymiz

  const [userImage, setUserImage] = useState<string | null>(
    localStorage.getItem("userImage")
  );
  const [theme] = useState<"dark" | "light">(
    (localStorage.getItem("theme") as "dark" | "light") || "dark"
  );

  useEffect(() => {
    const cleanup = setupAuthCheck(navigate);
    return cleanup;
  }, [navigate]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const imgData = reader.result as string;
        setUserImage(imgData);
        localStorage.setItem("userImage", imgData);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <MainLayout
      theme={theme}
      userImage={userImage}
      handleImageUpload={handleImageUpload}
      title={t("dashboard")}
    >
      {/* Stat Cards - Yuqoridagi katta bloklar (Baza va Mahsulotlar) */}
      <div
        style={{
          display: "grid",
          // Mobilda 1ta, planshet/desktopda moslashuvchan
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(260px, 1fr))",
          gap: isMobile ? 12 : 20,
          marginBottom: isMobile ? 24 : 40,
        }}
      >
        <DataBase theme={theme} />
        <UserProductsCount theme={theme} />
      </div>

      {/* Quick Actions - Elementlarni bir qatorda 2 tadan chiqarish */}
      <div
        style={{
          display: "grid",
          // Mobilda aniq 2ta ustun, desktopda min 160px dan
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(160px, 1fr))",
          gap: isMobile ? 12 : 16,
        }}
      >
        <Qr theme={theme} />
        <Sotuvlar theme={theme} />
        <Hisobot theme={theme} />
        <Tolov theme={theme} />
        <Chat theme={theme} />
      </div>
    </MainLayout>
  );
}