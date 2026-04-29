import React, { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { getContract } from "../utils/blockchain.js";
import "../styles/dashboard.css";

function normalizeUri(value) {
  if (!value) return "";
  if (value.startsWith("/api/files/")) return value;
  if (value.startsWith("ipfs://"))     return `http://127.0.0.1:8080/ipfs/${value.replace("ipfs://", "")}`;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return "";
}

function StudentDashboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [address, setAddress] = useState("");
  const [diplomas, setDiplomas] = useState([]);

  const totalOwned = useMemo(() => diplomas.length, [diplomas]);

  const loadStudentDiplomas = async () => {
    try {
      setLoading(true);
      setError("");

      const contract = await getContract();
      if (!contract) {
        setError("MetaMask non connecte.");
        return;
      }

      const currentAddress = await contract.runner.getAddress();
      setAddress(currentAddress);

      const ids = await contract.getHolderCredentials(currentAddress);
      const results = await Promise.all(ids.map((id) => contract.getCredential(id)));
      const mine = results.map((c, idx) => ({
        id: Number(ids[idx]),
        holderName: c.holderName,
        credentialHash: c.credentialHash,
        credentialURI: normalizeUri(c.credentialURI),
        credentialType: Number(c.credentialType),
        status: Number(c.status),
        issueDate: Number(c.issueDate),
        institutionName: c.institutionName,
        fieldOfStudy: c.fieldOfStudy,
      }));

      setDiplomas(mine.reverse());
    } catch (e) {
      setError(e?.message || "Erreur de chargement des diplomes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentDiplomas();
  }, []);

  const shareLink = async (hash) => {
    const url = `${window.location.origin}/verify?hash=${encodeURIComponent(hash)}`;
    await navigator.clipboard.writeText(url);
    alert("Lien de vérification copié :\n" + url);
  };

  const getTypeLabel = (type) => {
    const types = ["Diplôme", "Certificat", "Licence", "Relevé de notes", "Formation"];
    return types[type] ?? "Inconnu";
  };

  const getQrValue = (hash) => {
    return `${window.location.origin}/verify?hash=${encodeURIComponent(hash)}`;
  };

  const downloadPdf = (uri) => {
    if (!uri) return;
    const a = document.createElement("a");
    a.href = uri;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.download = "diploma.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="dashboard-container">
      <h1>🎓 Espace Étudiant — Mes Diplômes</h1>

      <section className="stats-section">
        <h2>Vue d'ensemble</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{totalOwned}</div>
            <div className="stat-label">Diplômes reçus</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{diplomas.filter(d => d.status === 1).length}</div>
            <div className="stat-label">Diplômes valides</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ fontSize: "0.95rem", wordBreak: "break-all" }}>
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "—"}
            </div>
            <div className="stat-label">Adresse Ethereum</div>
          </div>
        </div>
      </section>

      {error && <div className="message-box">{error}</div>}

      <section className="list-section">
        <h2>📜 Registre de mes diplômes</h2>
        <div className="list-toolbar">
          <button className="btn-secondary" onClick={loadStudentDiplomas} disabled={loading}>
            🔄 Actualiser
          </button>
        </div>

        {loading && <p className="loading">Chargement...</p>}
        {!loading && diplomas.length === 0 && <p className="empty">Aucun diplome trouve.</p>}

        <div className="diplomas-list">
          {diplomas.map((d) => (
            <div key={d.id} className="diploma-card">
              <div className="diploma-header">
                <h3>{d.holderName || "Etudiant"}</h3>
                <span className="status-badge" style={{ backgroundColor:
                    d.status === 0 ? "#f59e0b" :
                    d.status === 1 ? "#28a745" :
                    d.status === 2 ? "#ffc107" :
                    d.status === 4 ? "#7f1d1d" : "#dc3545"
                }}>
                  {d.status === 0 ? "⏳ En attente" :
                   d.status === 1 ? "✅ Valide"     :
                   d.status === 2 ? "⏸️ Suspendu"  :
                   d.status === 4 ? "🚫 Rejeté"    : "❌ Révoqué"}
                </span>
              </div>
              <div className="diploma-body">
                <p><strong>Type:</strong> {getTypeLabel(d.credentialType)}</p>
                <p><strong>Etablissement:</strong> {d.institutionName}</p>
                <p><strong>Domaine:</strong> {d.fieldOfStudy}</p>
                <p><strong>Date:</strong> {new Date(d.issueDate * 1000).toLocaleDateString()}</p>
              </div>
              {d.status === 1 ? (
                <div className="student-actions">
                  <button className="btn-secondary" onClick={() => shareLink(d.credentialHash)}>
                    Partager lien
                  </button>
                  {d.credentialURI ? (
                    <a
                      href={d.credentialURI}
                      download="diplome.pdf"
                      className="btn-primary"
                      style={{ textDecoration: "none" }}
                    >
                      Télécharger PDF
                    </a>
                  ) : (
                    <span style={{ fontSize: "12px", color: "#94a3b8", alignSelf: "center" }}>
                      PDF non disponible
                    </span>
                  )}
                </div>
              ) : (
                <div style={{ padding: "10px 16px", fontSize: "12px", color: "#94a3b8" }}>
                  {d.status === 0 && "⏳ En attente d'approbation — non partageable"}
                  {d.status === 2 && "⏸️ Diplôme suspendu — non partageable"}
                  {d.status === 3 && "❌ Diplôme révoqué — non partageable"}
                  {d.status === 4 && "🚫 Diplôme rejeté — non partageable"}
                </div>
              )}
              {d.status === 1 && (
                <div className="qr-wrap">
                  <QRCodeSVG value={getQrValue(d.credentialHash)} size={110} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default StudentDashboard;