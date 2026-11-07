import { useState } from "react";
import MainLayout from "../components/layout/MainLayout";
import { useResponsive } from "../hooks/useResponsive";

import PharmDataBase from "../components/pharm-menu/PharmDataBase";
import PharmLoginDataBase from "../components/pharm-menu/PharmLoginDataBase";
import PharmSotuvlar from "../components/pharm-menu/PharmSotuvlar";
import PharmHisobot from "../components/pharm-menu/PharmHisobot";

// Chat, "To'lov" va "QR" kartalari OLIB TASHLANDI (Menu.tsx bilan bir xil sabab).
// TODO (alohida ish): dorixona sahifalari do'kon sahifalari bilan birlashtiriladi (DRY).
export default function PharmMenu() {
  const { isMobile } = useResponsive();

  const [userImage] = useState<string | null>(localStorage.getItem("userImage"));
  const [theme] = useState<"dark" | "light">(
    (localStorage.getItem("theme") as "dark" | "light") || "dark"
  );

  return (
    <MainLayout theme={theme} userImage={userImage} title="Dorixona paneli">
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 20, marginBottom: 30 }}>
        <div data-clickable><PharmDataBase theme={theme} /></div>
        <div data-clickable><PharmLoginDataBase theme={theme} /></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        <div data-clickable><PharmSotuvlar theme={theme} /></div>
        <div data-clickable><PharmHisobot theme={theme} /></div>
      </div>
    </MainLayout>
  );
}
