import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import { connectWallet, BESU_CHAIN_ID } from "./utils/blockchain.js";
import UniversityDashboard from "./pages/UniversityDashboard.js";
import StudentDashboard    from "./pages/StudentDashboard.js";
import EmployerDashboard   from "./pages/EmployerDashboard.js";
import MinistryDashboard   from "./pages/MinistryDashboard.js";
import Home                from "./pages/Home.js";
import Verify              from "./pages/Verify.js";

const NAV_LINKS = [
  { to: "/ministry",   label: "Ministère",       icon: "🏛️" },
  { to: "/university", label: "Université",       icon: "🏫" },
  { to: "/student",    label: "Étudiant",         icon: "🎓" },
  { to: "/employer",   label: "Vérification",     icon: "🏢" },
  { to: "/verify",     label: "Vérifier par hash",icon: "🔍" },
];

function useWallet() {
  const [account, setAccount]           = useState(null);
  const [wrongNetwork, setWrongNetwork] = useState(false);

  const refresh = async () => {
    if (!window.ethereum) return;
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    setAccount(accounts[0] || null);
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    setWrongNetwork(chainId !== BESU_CHAIN_ID);
  };

  useEffect(() => {
    refresh();
    if (!window.ethereum) return;
    window.ethereum.on("accountsChanged", refresh);
    window.ethereum.on("chainChanged",    refresh);
    return () => {
      window.ethereum.removeListener("accountsChanged", refresh);
      window.ethereum.removeListener("chainChanged",    refresh);
    };
  }, []);

  const connect = async () => {
    try {
      await connectWallet();
      await refresh();
    } catch (e) {
      if (e.code === -32002 || e.message?.includes("déjà une fenêtre")) {
        alert("MetaMask a déjà une fenêtre ouverte — clique sur l'icône 🦊 dans ta barre d'extensions.");
      } else if (e.code !== 4001) {
        alert("Erreur : " + e.message);
      }
    }
  };

  return { account, wrongNetwork, connect, refresh };
}

function Layout() {
  const location = useLocation();
  const isHome   = location.pathname === "/";
  const { account, wrongNetwork, connect } = useWallet();

  const short = account
    ? account.slice(0, 6) + "…" + account.slice(-4)
    : null;

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>

      {/* ── Bandeau réseau ─────────────────────────────────────────────── */}
      {wrongNetwork && account && (
        <div style={{
          background: "#fffbeb",
          borderBottom: "1px solid #fcd34d",
          padding: "8px 24px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontSize: "13px",
          color: "#92400e",
        }}>
          <span>⚠️</span>
          <span>
            Réseau incorrect — tu es connecté sur un autre réseau que <strong>Diploma Besu</strong>.
          </span>
          <button onClick={connect} style={{
            marginLeft: "auto",
            padding: "4px 14px",
            background: "#f59e0b",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontWeight: "600",
            fontSize: "12px",
            cursor: "pointer",
          }}>
            Changer de réseau
          </button>
        </div>
      )}

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        gap: "2px",
        padding: "0 24px",
        height: "56px",
        background: "#fff",
        borderBottom: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0,0,0,.06)",
      }}>
        {/* Logo */}
        <NavLink to="/" style={{
          fontWeight: "800",
          fontSize: "15px",
          color: "#0f172a",
          textDecoration: "none",
          marginRight: "20px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          flexShrink: 0,
        }}>
          🎓 DiplomaChain
        </NavLink>

        {/* Divider */}
        <div style={{ width: "1px", height: "20px", background: "#e2e8f0", marginRight: "12px" }} />

        {/* Links */}
        {NAV_LINKS.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "6px 12px",
            borderRadius: "7px",
            fontSize: "13.5px",
            fontWeight: "600",
            textDecoration: "none",
            color:           isActive ? "#2563eb"    : "#475569",
            background:      isActive ? "#eff6ff"    : "transparent",
            transition: "all .15s",
          })}>
            <span style={{ fontSize: "14px" }}>{icon}</span>
            {label}
          </NavLink>
        ))}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Wallet */}
        {account && !wrongNetwork ? (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "20px",
              fontSize: "12.5px",
              fontWeight: "600",
              color: "#15803d",
            }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
              {short}
            </div>
            <button onClick={connect} style={{
              padding: "5px 12px",
              background: "transparent",
              border: "1px solid #e2e8f0",
              borderRadius: "7px",
              fontSize: "12.5px",
              fontWeight: "600",
              color: "#475569",
              cursor: "pointer",
            }}>
              Changer
            </button>
          </div>
        ) : (
          <button onClick={connect} style={{
            padding: "7px 16px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "7px",
            fontSize: "13px",
            fontWeight: "700",
            cursor: "pointer",
          }}>
            Connecter le wallet
          </button>
        )}
      </nav>

      {/* ── Contenu ────────────────────────────────────────────────────── */}
      <div style={{ padding: isHome ? "0" : "28px 24px" }}>
        <Routes>
          <Route path="/"           element={<Home />} />
          <Route path="/ministry"   element={<MinistryDashboard />} />
          <Route path="/university" element={<UniversityDashboard />} />
          <Route path="/student"    element={<StudentDashboard />} />
          <Route path="/employer"   element={<EmployerDashboard />} />
          <Route path="/verify"     element={<Verify />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
