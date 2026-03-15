// components/menu/Tolov.tsx
import React from "react";
import { CreditCard } from "lucide-react";
import { useTranslation } from "../../components/languages/Menu"; // yoki loyihangizdagi to'g'ri yo'l

interface TolovProps {
  theme: "dark" | "light";
}

const Tolov: React.FC<TolovProps> = ({ theme }) => {
  const { t } = useTranslation();

  return (
    <div
      onClick={() => alert("Tez orada")} // keyinchalik bu joyga haqiqiy navigatsiya yoki funksiya qo'yiladi
      style={{
        padding: 20,
        borderRadius: 16,
        background: theme === "dark" ? "#0f172a" : "#ffffff",
        textAlign: "center",
        border: `1px solid ${theme === "dark" ? "#1f2937" : "#e5e7eb"}`,
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.borderColor = "#6366f1";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(99,102,241,0.2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor =
          theme === "dark" ? "#1f2937" : "#e5e7eb";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <CreditCard color="#3b82f6" size={32} style={{ marginBottom: 12 }} />
      <p
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: theme === "dark" ? "#fff" : "#1a1f2e",
          margin: 0,
        }}
      >
        {t("payment")}
      </p>
    </div>
  );
};

export default Tolov;