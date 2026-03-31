// src/pages/Menu.tsx
import React, { useState } from "react";
import MainLayout from "../components/MainLayout";
import { useTranslation } from "../components/languages/Menu";
import { useResponsive } from "../hooks/useResponsive";

import DataBase from "../components/menu/DataBase";
import UserProductsCount from "../components/menu/LoginDataBase";
import Chat from "../components/menu/Chat";
import AdminProfile from "../admin/adminComponents/adminSettings/AdminProfile";
import Tolov from "../components/menu/Tolov";
import { getSessionLogin } from "../utils/clientSession";
import Hisobot from "../components/menu/Hisobot";
import Sotuvlar from "../components/menu/Sotuvlar";
import Qr from "../components/menu/Qr";

export default function Menu() {
  const { t } = useTranslation();
  const { isMobile } = useResponsive();

  const [userImage] = useState<string | null>(localStorage.getItem("userImage"));
  const [theme] = useState<"dark" | "light">(
    (localStorage.getItem("theme") as "dark" | "light") || "dark"
  );
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const currentUserLogin = getSessionLogin();


  return (
    <MainLayout theme={theme} userImage={userImage} title={t("dashboard")}>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 20, marginBottom: 30 }}>
        <div data-clickable><DataBase theme={theme} /></div>
        <div data-clickable><UserProductsCount theme={theme} /></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        <div data-clickable><Sotuvlar theme={theme} /></div>
        <div data-clickable><Qr theme={theme} /></div>
        <div data-clickable><Tolov theme={theme} /></div>
        <div data-clickable><Hisobot theme={theme} /></div>
        <div data-clickable><Chat theme={theme} /></div>
      </div>

      {isProfileModalOpen && (
        <AdminProfile
          theme={theme}
          tc={(d, l) => theme === 'dark' ? d : l}
          currentUserLogin={currentUserLogin || ''}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}
    </MainLayout>
  );
}