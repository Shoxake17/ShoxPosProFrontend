import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import { api } from "../../utils/api";
import { useTranslation } from "react-i18next";

interface PharmDataBaseProps {
  theme: "dark" | "light";
}

const PharmDataBase: React.FC<PharmDataBaseProps> = ({ theme }) => {
  const navigate = useNavigate();
  
  const { t } = useTranslation('menu');

  const [productCount, setProductCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchProductCount = async () => {
      try {
        setLoading(true);
        const res = await api("/api/pharmacy/pharm-base/count");
        const data = await res.json();
        setProductCount(data.count || 0);
      } catch (err) {
        console.error("Umumiy dorixona bazasi soni olishda xato:", err);
        setProductCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchProductCount();
  }, []);

  return (
    <div
      onClick={() => navigate("/pharm-base")}
      style={{
        padding: 24,
        borderRadius: 20,
        background: "linear-gradient(135deg, #f97316, #17c196ff)",
        cursor: "pointer",
        color: "#fff",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        opacity: loading ? 0.7 : 1,
        pointerEvents: loading ? "none" : "auto",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 12px 24px rgba(0,0,0,0.2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <FileText size={28} />
      <h2 style={{ fontSize: 32, margin: "10px 0", fontWeight: 700 }}>
        {loading ? "..." : `${productCount} ${t("pieces")}`}
      </h2>
      <p style={{ opacity: 0.9, fontSize: 14 }}>Umumiy dorixona bazasi</p>
    </div>
  );
};

export default PharmDataBase;
