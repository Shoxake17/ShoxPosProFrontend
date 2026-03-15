import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Sahifa komponentlari
import Login from "./Login";
import Menu from "./Menu";
import Settings from "./Settings";
import KirimDashboard from "./KirimDashboard";
import MaxQoshish from "./MaxQoshish";
import MaxsulotBazasi from "./MaxsulotBazasi";
import Scan from "./Scan";
import Scanner from "./Scanner";
import Sotilgan from "./Sotilgan";
import Qarzlar from "./Qarzlar";
import Card from "./Card";
import Chatbot from "./Chatbot";

function App() {
  return (
    <Router>
      <Routes>
        {/* Login sahifasi */}
        <Route path="/" element={<Login />} />

        {/* Menu */}
        <Route path="/menu" element={<Menu />} />

        {/* Settings */}
        <Route path="/settings" element={<Settings />} />

        {/* Kirim Dashboard (boss access) */}
        <Route path="/kirim-dashboard" element={<KirimDashboard />} />

        {/* Maxsulotlar */}
        <Route path="/add-product" element={<MaxQoshish />} />
        <Route path="/products" element={<MaxsulotBazasi />} />
        <Route path="/scan" element={<Scan />} />

        {/* QR/Barcode Scanner */}
        <Route path="/scanner" element={<Scanner />} />

        {/* Sotilgan maxsulotlar */}
        <Route path="/sales" element={<Sotilgan />} />

        {/* Daily report / diagramma */}

        {/* Qarzlar */}
        <Route path="/debts" element={<Qarzlar />} />

        {/* Card */}
        <Route path="/card" element={<Card />} />

        {/* Chatbot */}
        <Route path="/chatbot" element={<Chatbot />} />

        {/* Boshqa yo‘llarga redirect */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
