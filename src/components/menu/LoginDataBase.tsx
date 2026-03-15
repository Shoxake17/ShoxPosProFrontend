// components/menu/UserProductsCount.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { api } from "../../utils/api"; // yo'lni loyihangizga moslashtiring
import { useTranslation } from "../../components/languages/Menu"; // yoki to'g'ri yo'l

interface UserProductsCountProps {
  theme: "dark" | "light";
}

const LoginDataBase: React.FC<UserProductsCountProps> = ({ theme }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [userProductCount, setUserProductCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const getUserLogin = () => {
      const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
      return (
        currentUser?.login ||
        localStorage.getItem("currentLogin") ||
        localStorage.getItem("login") ||
        localStorage.getItem("activeUser") ||
        null
      );
    };

    const login = getUserLogin();

    if (!login) {
      console.warn("Foydalanuvchi login topilmadi");
      setLoading(false);
      return;
    }

    const fetchUserProducts = async () => {
      try {
        setLoading(true);
        const res = await api(`/api/products/user-products/${login}`);
        const data = await res.json();
        setUserProductCount(Array.isArray(data) ? data.length : 0);
      } catch (err) {
        console.error("Foydalanuvchi mahsulotlari olishda xato:", err);
        setUserProductCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProducts();
  }, []);

  return (
    <div
      onClick={() => navigate("/kirim-bazasi")}
      style={{
        padding: 24,
        borderRadius: 20,
        background: "linear-gradient(135deg, #6366f1, #a855f7)",
        cursor: loading ? "not-allowed" : "pointer",
        color: "#fff",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        opacity: loading ? 0.7 : 1,
        pointerEvents: loading ? "none" : "auto",
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 12px 24px rgba(0,0,0,0.2)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <ClipboardList size={28} />
      <h2 style={{ fontSize: 32, margin: "10px 0", fontWeight: 700 }}>
        {loading ? "..." : `${userProductCount} ${t("pieces")}`}
      </h2>
      <p style={{ opacity: 0.9, fontSize: 14 }}>{t("incomeDashboard")}</p>
    </div>
  );
};

export default LoginDataBase;