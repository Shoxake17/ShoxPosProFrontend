// src/components/menu/Profile.tsx
import React from "react";
import { UserCircle } from "lucide-react";

interface ProfileProps {
  theme: "dark" | "light";
}

const Profile: React.FC<ProfileProps> = ({ theme }) => {
  return (
    <div
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
        e.currentTarget.style.borderColor = theme === "dark" ? "#1f2937" : "#e5e7eb";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <UserCircle color="#6366f1" size={32} style={{ marginBottom: 12 }} />
      <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: theme === "dark" ? "#fff" : "#1a1f2e",
            margin: 0,
          }}
        >
          {"Profil"}
        </p>
    </div>
  );
};

export default Profile;
