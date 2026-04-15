import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  Check, 
  X, 
  Crown, 
  Star, 
  ArrowLeft,
  Gift
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useTranslation } from "react-i18next";

const SubscriptionPlans: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useTranslation("common");
  
  const currentPlan = user?.subscription?.plan || "free";
  const isTrial = user?.subscription?.isTrial;
  const trialEndDate = user?.subscription?.trialEndDate;

  const plans = [
    {
      id: "free",
      name: "Free",
      price: "0",
      period: "/oy",
      features: [
        { name: "Menu saxifasi", included: true },
        { name: "MaxsulotBazasi saxifasi", included: true },
        { name: "Sotish terminal saxifasi", included: true },
        { name: "Sotilgan maxsulotlar ro'yhati", included: true },
        { name: "Til va Mavzu (Theme) sozlamalari", included: true },
        { name: "Logout funksiyasi", included: true },
        { name: "Qarzlar saxifasi", included: false },
        { name: "Chat saxifasi", included: false },
        { name: "Kirim bazasi", included: false },
        { name: "Hisobotlar", included: false },
        { name: "AI yordamchisi", included: false },
      ],
      popular: false,
      buttonText: "Joriy Reja"
    },
    {
      id: "basic",
      name: "Basic",
      price: "49 000",
      period: "/oy",
      features: [
        { name: "Menu saxifasi", included: true },
        { name: "MaxsulotBazasi saxifasi", included: true },
        { name: "Sotish terminal saxifasi", included: true },
        { name: "Sotilgan maxsulotlar ro'yhati", included: true },
        { name: "Qarzlar saxifasi", included: true },
        { name: "Chat saxifasi", included: true },
        { name: "Sozlamalarning barcha funksiyalari", included: true },
        { name: "Kirim bazasi", included: false },
        { name: "Hisobotlar", included: false },
        { name: "AI yordamchisi", included: false },
      ],
      popular: false,
      buttonText: "Basic'ga O'tish"
    },
    {
      id: "pro",
      name: "Pro",
      price: "99 000",
      period: "/oy",
      features: [
        { name: "Barcha Basic rejasi funksiyalari", included: true },
        { name: "Kirim bazasi", included: true },
        { name: "Hisobotlar", included: true },
        { name: "AI yordamchisi", included: true },
        { name: "Maxsulot qo'shish", included: true },
        { name: "Barcha cheklovlarsiz foydalanish", included: true },
        { name: "Maxsus qo'llab-quvvatlash", included: true },
      ],
      popular: true,
      buttonText: "Pro'ga O'tish"
    }
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      padding: "2rem"
    }}>
      {/* Header */}
      <div style={{ marginBottom: "3rem", maxWidth: "1200px", margin: "0 auto 3rem auto" }}>
        <button
          onClick={() => navigate("/menu")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "#94a3b8",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            marginBottom: "1.5rem",
            fontSize: "1rem"
          }}
        >
          <ArrowLeft size={20} />
          Orqaga
        </button>

        <div style={{ textAlign: "center" }}>
          <h1 style={{
            fontSize: "2.5rem",
            fontWeight: 800,
            color: "white",
            marginBottom: "0.5rem"
          }}>
            Obuna Rejalari
          </h1>
          <p style={{
            fontSize: "1.125rem",
            color: "#94a3b8",
            maxWidth: "500px",
            margin: "0 auto"
          }}>
            Ishingiz uchun eng mos rejani tanlang va biznesingizni o'stiring
          </p>

          {isTrial && trialEndDate && (
            <div style={{
              marginTop: "1.5rem",
              padding: "1rem 1.5rem",
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              borderRadius: "12px",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.75rem"
            }}>
              <Gift size={20} color="white" />
              <span style={{ color: "white", fontWeight: 600 }}>
                7 kunlik Pro rejasi sinov davri davom etmoqda!
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Plans Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "2rem",
        maxWidth: "1200px",
        margin: "0 auto"
      }}>
        {plans.map((plan) => (
          <div
            key={plan.id}
            style={{
              background: plan.popular
                ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
                : "#1e293b",
              border: plan.popular
                ? "2px solid #667eea"
                : "2px solid #334155",
              borderRadius: "20px",
              padding: "2rem",
              position: "relative",
              transform: plan.popular ? "scale(1.05)" : "scale(1)",
              transition: "all 0.3s ease"
            }}
          >
            {plan.popular && (
              <div style={{
                position: "absolute",
                top: "-12px",
                left: "50%",
                transform: "translateX(-50%)",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                padding: "0.5rem 1.5rem",
                borderRadius: "999px",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}>
                <Crown size={16} color="white" />
                <span style={{ color: "white", fontWeight: 700, fontSize: "0.875rem" }}>
                  Mashhur
                </span>
              </div>
            )}

            <div style={{ marginBottom: "2rem" }}>
              <h3 style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "white",
                marginBottom: "0.5rem"
              }}>
                {plan.name}
              </h3>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem" }}>
                <span style={{
                  fontSize: "2.5rem",
                  fontWeight: 800,
                  color: "white"
                }}>
                  {plan.price}
                </span>
                <span style={{ color: "#94a3b8" }}>{plan.period}</span>
              </div>
            </div>

            <div style={{ marginBottom: "2rem" }}>
              {plan.features.map((feature, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem 0",
                    borderBottom: idx < plan.features.length - 1 ? "1px solid #334155" : "none"
                  }}
                >
                  {feature.included ? (
                    <Check size={20} color="#10b981" />
                  ) : (
                    <X size={20} color="#64748b" />
                  )}
                  <span style={{
                    color: feature.included ? "#e2e8f0" : "#64748b",
                    fontSize: "0.95rem"
                  }}>
                    {feature.name}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                console.log(`Selecting ${plan.name} plan`);
              }}
              disabled={currentPlan === plan.id}
              style={{
                width: "100%",
                padding: "1rem 1.5rem",
                borderRadius: "12px",
                border: "none",
                cursor: currentPlan === plan.id ? "not-allowed" : "pointer",
                fontSize: "1rem",
                fontWeight: 600,
                background: currentPlan === plan.id
                  ? "#334155"
                  : plan.popular
                  ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                  : "#334155",
                color: currentPlan === plan.id ? "#94a3b8" : "white",
                transition: "all 0.3s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem"
              }}
            >
              {currentPlan === plan.id && <Check size={20} />}
              {currentPlan === plan.id ? "Joriy Reja" : plan.buttonText}
            </button>
          </div>
        ))}
      </div>

      {/* Footer Note */}
      <div style={{
        textAlign: "center",
        marginTop: "3rem",
        color: "#64748b",
        fontSize: "0.875rem"
      }}>
        <p>Har qanday savol bo'lsa, biz bilan bog'laning</p>
      </div>
    </div>
  );
};

export default SubscriptionPlans;
