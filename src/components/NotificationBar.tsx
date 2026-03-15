// components/Notification.tsx
import React from "react";
import { Bell } from "lucide-react";

interface NotificationProps {
  theme: "dark" | "light";
}

const Notification: React.FC<NotificationProps> = ({ theme }) => {
  return (
    <button
      style={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        border: "none",
        background: theme === "dark" ? "#1a1f2e" : "#f1f5f9",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = theme === "dark" ? "#262d3d" : "#e2e8f0";
        e.currentTarget.style.transform = "scale(1.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = theme === "dark" ? "#1a1f2e" : "#f1f5f9";
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      <Bell
        size={20}
        color={theme === "dark" ? "#8b92a7" : "#64748b"}
      />
    </button>
  );
};

export default Notification;