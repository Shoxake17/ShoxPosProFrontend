import React, { useState } from "react";
import MainLayout from "../components/layout/MainLayout";
import { useTranslation } from 'react-i18next';
import { useResponsive } from "../hooks/useResponsive";
import { useNavigate } from 'react-router-dom';

import PharmDataBase from "../components/pharm-menu/PharmDataBase";
import PharmLoginDataBase from "../components/pharm-menu/PharmLoginDataBase";
import PharmSotuvlar from "../components/pharm-menu/PharmSotuvlar";
import PharmQr from "../components/pharm-menu/PharmQr";
import PharmTolov from "../components/pharm-menu/PharmTolov";
import PharmHisobot from "../components/pharm-menu/PharmHisobot";
import PharmChat from "../components/pharm-menu/PharmChat";
import { getSessionLogin } from "../utils/clientSession";

export default function PharmMenu() {
  const { t } = useTranslation('menu');
  const { isMobile } = useResponsive();

  const [userImage] = useState<string | null>(localStorage.getItem("userImage"));
  const [theme] = useState<"dark" | "light">(
    (localStorage.getItem("theme") as "dark" | "light") || "dark"
  );
  const currentUserLogin = getSessionLogin();
  const navigate = useNavigate();
  return (
    <MainLayout theme={theme} userImage={userImage} title="Dorixona paneli">
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 20, marginBottom: 30 }}>
        <div data-clickable><PharmDataBase theme={theme} /></div>
        <div data-clickable><PharmLoginDataBase theme={theme} /></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        <div data-clickable><PharmSotuvlar theme={theme} /></div>
        <div data-clickable><PharmQr theme={theme} /></div>
        <div data-clickable><PharmTolov theme={theme} /></div>
        <div data-clickable><PharmHisobot theme={theme} /></div>
        <div data-clickable><PharmChat theme={theme} /></div>
      </div>
    </MainLayout>
  );
}
