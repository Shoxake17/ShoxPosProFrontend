import { useState } from "react";
import MainLayout from "../components/layout/MainLayout";
import { useTranslation } from 'react-i18next';
import { useResponsive } from "../hooks/useResponsive";

import DataBase from "../components/menu/DataBase";
import UserProductsCount from "../components/menu/LoginDataBase";
import Hisobot from "../components/menu/Hisobot";
import Sotuvlar from "../components/menu/Sotuvlar";

// Chat, "To'lov" va "QR" kartalari OLIB TASHLANDI: chat — OnDex support servisida,
// qolgan ikkisi hech narsa qilmaydigan "Tez orada" tugmalari edi (soxta tugma taqiqlangan).
export default function Menu() {
  const { t } = useTranslation('menu');
  const { isMobile } = useResponsive();

  const [userImage] = useState<string | null>(localStorage.getItem("userImage"));
  const [theme] = useState<"dark" | "light">(
    (localStorage.getItem("theme") as "dark" | "light") || "dark"
  );

  return (
    <MainLayout theme={theme} userImage={userImage} title={t("dashboard")}>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 20, marginBottom: 30 }}>
        <div data-clickable><DataBase theme={theme} /></div>
        <div data-clickable><UserProductsCount theme={theme} /></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        <div data-clickable><Sotuvlar theme={theme} /></div>
        <div data-clickable><Hisobot theme={theme} /></div>
      </div>
    </MainLayout>
  );
}
