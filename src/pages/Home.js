import React from "react";
import { useNavigate } from "react-router-dom";

const ROLES = [
  {
    id: "ministry",
    icon: "🏛️",
    title: "Ministère de l'Enseignement Supérieur",
    description:
      "Accréditez les universités, approuvez ou rejetez les diplômes émis, et supervisez l'ensemble du système.",
    actions: ["Accréditer les universités", "Approuver / rejeter les diplômes", "Superviser les émissions"],
    btnLabel: "Accéder au Dashboard",
    color: "#b45309",
    gradient: "linear-gradient(135deg, #451a03 0%, #b45309 100%)",
  },
  {
    id: "university",
    icon: "🏫",
    title: "Université / Institution",
    description:
      "Émettez des diplômes certifiés sur la blockchain et suivez l'ensemble des credentials émis.",
    actions: ["Émettre un diplôme", "Suivre les émissions", "Suspendre / révoquer"],
    btnLabel: "Accéder au Dashboard",
    color: "#2563eb",
    gradient: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",
  },
  {
    id: "student",
    icon: "🎓",
    title: "Étudiant",
    description:
      "Consultez vos diplômes enregistrés, partagez-les via QR code ou lien sécurisé, et téléchargez vos documents.",
    actions: ["Voir mes diplômes", "Partager via QR code", "Télécharger mes PDF"],
    btnLabel: "Voir mes diplômes",
    color: "#7c3aed",
    gradient: "linear-gradient(135deg, #3b0764 0%, #7c3aed 100%)",
  },
  {
    id: "employer",
    icon: "🏢",
    title: "Employeur / Vérificateur",
    description:
      "Vérifiez l'authenticité d'un diplôme en quelques secondes via l'upload du PDF ou le scan d'un QR code.",
    actions: ["Upload PDF du diplôme", "Scanner un QR code", "Résultat instantané"],
    btnLabel: "Vérifier un diplôme",
    color: "#059669",
    gradient: "linear-gradient(135deg, #064e3b 0%, #059669 100%)",
  },
];

function Home() {
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 20px" }}>

      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: "60px" }}>
        <div style={{ fontSize: "4em", marginBottom: "16px" }}>🎓</div>
        <h1 style={{ fontSize: "2.4em", fontWeight: "800", color: "#1f2937", margin: "0 0 16px" }}>
          Système de Vérification de Diplômes
        </h1>
        <p style={{ fontSize: "1.1em", color: "#6b7280", maxWidth: "600px", margin: "0 auto 24px" }}>
          Une plateforme décentralisée basée sur la blockchain pour émettre, gérer et vérifier
          des diplômes et certificats en toute confiance.
        </p>

        {/* Feature badges */}
        <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
          {["🔒 Blockchain Ethereum", "📁 Stockage IPFS", "⚡ Vérification instantanée", "🔑 MetaMask"].map((badge) => (
            <span
              key={badge}
              style={{
                padding: "6px 14px",
                background: "#f3f4f6",
                border: "1px solid #e5e7eb",
                borderRadius: "20px",
                fontSize: "13px",
                color: "#374151",
                fontWeight: "500",
              }}
            >
              {badge}
            </span>
          ))}
        </div>
      </div>

      {/* Role cards */}
      <p style={{ textAlign: "center", color: "#9ca3af", marginBottom: "28px", fontWeight: "600", letterSpacing: "0.05em", textTransform: "uppercase", fontSize: "13px" }}>
        Choisissez votre rôle
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
        {ROLES.map((role) => (
          <div
            key={role.id}
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              display: "flex",
              flexDirection: "column",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-6px)";
              e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.07)";
            }}
          >
            {/* Card header */}
            <div style={{ background: role.gradient, padding: "28px 24px 20px", color: "white" }}>
              <div style={{ fontSize: "2.8em", marginBottom: "10px" }}>{role.icon}</div>
              <h2 style={{ margin: 0, fontSize: "1.3em", fontWeight: "700" }}>{role.title}</h2>
            </div>

            {/* Card body */}
            <div style={{ padding: "24px", flex: 1, display: "flex", flexDirection: "column" }}>
              <p style={{ color: "#6b7280", fontSize: "14px", lineHeight: "1.6", margin: "0 0 20px" }}>
                {role.description}
              </p>

              {/* Feature list */}
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", flex: 1, pointerEvents: "none" }}>
                {role.actions.map((action) => (
                  <li
                    key={action}
                    style={{
                      padding: "7px 0",
                      fontSize: "14px",
                      color: "#374151",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      pointerEvents: "none",
                    }}
                  >
                    <span style={{ color: role.color, fontWeight: "bold" }}>✓</span>
                    {action}
                  </li>
                ))}
              </ul>

              {/* CTA button */}
              <button
                onClick={() => navigate(`/${role.id}`)}
                style={{
                  width: "100%",
                  padding: "13px",
                  background: role.gradient,
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "15px",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                {role.btnLabel} →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div style={{ marginTop: "72px", textAlign: "center" }}>
        <h2 style={{ color: "#1f2937", fontSize: "1.5em", marginBottom: "40px" }}>Comment ça marche ?</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "24px" }}>
          {[
            { step: "1", icon: "🏛️", title: "Le ministère accrédite", desc: "Le ministère autorise les universités à émettre des diplômes sur la blockchain." },
            { step: "2", icon: "🏫", title: "L'université émet", desc: "Le diplôme est hashé, stocké sur IPFS et soumis au ministère pour approbation." },
            { step: "3", icon: "✅", title: "Le ministère approuve", desc: "Le ministère valide le diplôme — il devient officiellement reconnu on-chain." },
            { step: "4", icon: "🎓", title: "L'étudiant partage", desc: "L'étudiant partage son diplôme approuvé via QR code ou lien sécurisé." },
            { step: "5", icon: "🏢", title: "L'employeur vérifie", desc: "En quelques secondes, la blockchain confirme l'authenticité et l'approbation ministérielle." },
          ].map(({ step, icon, title, desc }) => (
            <div key={step} style={{ padding: "24px", background: "#f9fafb", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
              <div style={{ width: "36px", height: "36px", background: "#2563eb", borderRadius: "50%", color: "white", fontWeight: "800", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>{step}</div>
              <div style={{ fontSize: "2em", marginBottom: "8px" }}>{icon}</div>
              <h3 style={{ margin: "0 0 8px", color: "#1f2937", fontSize: "1em" }}>{title}</h3>
              <p style={{ margin: 0, color: "#6b7280", fontSize: "13px", lineHeight: "1.5" }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Home;
