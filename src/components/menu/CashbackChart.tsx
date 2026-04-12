// components/menu/CashbackChart.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface CashbackChartProps {
  theme: "dark" | "light";
}

const CashbackChart: React.FC<CashbackChartProps> = ({ theme }) => {
  const { t } = useTranslation();

  // Haftalik sotuvlar ma'lumotlari (statik, keyin API dan olish mumkin)
  const chartData = [
    { day: t("monday"), sales: 12 },
    { day: t("tuesday"), sales: 19 },
    { day: t("wednesday"), sales: 8 },
    { day: t("thursday"), sales: 23 },
    { day: t("friday"), sales: 17 },
    { day: t("saturday"), sales: 29 },
    { day: t("sunday"), sales: 21 },
  ];

  return (
    <div
      style={{
        background: theme === "dark" ? "#0f172a" : "#ffffff",
        padding: 24,
        borderRadius: 20,
        marginBottom: 40,
        border: `1px solid ${theme === "dark" ? "#1f2937" : "#e5e7eb"}`,
        boxShadow:
          theme === "dark"
            ? "0 4px 12px rgba(0,0,0,0.3)"
            : "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      <h2
        style={{
          marginBottom: 20,
          fontWeight: 700,
          fontSize: 20,
          color: theme === "dark" ? "#fff" : "#1a1f2e",
        }}
      >
        {t("weeklySales")}
      </h2>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={theme === "dark" ? "#1f2937" : "#e5e7eb"}
          />
          <XAxis
            dataKey="day"
            stroke="#94a3b8"
            style={{ fontSize: 12 }}
          />
          <YAxis stroke="#94a3b8" style={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              background: theme === "dark" ? "#0b1220" : "#fff",
              borderRadius: 10,
              border: `1px solid ${theme === "dark" ? "#1f2937" : "#e5e7eb"}`,
            }}
            labelStyle={{ color: theme === "dark" ? "#fff" : "#1a1f2e" }}
          />
          <Line
            type="monotone"
            dataKey="sales"
            stroke="#6366f1"
            strokeWidth={3}
            dot={{ fill: "#6366f1", r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CashbackChart;
