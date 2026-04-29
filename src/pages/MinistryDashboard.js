import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getMinistryData, authorizeIssuer, removeIssuer, approveCredential, rejectCredential, checkMinistryRole } from "../utils/blockchain.js";
import "../styles/dashboard.css";

const STATUS_LABELS = ["⏳ En attente", "✅ Valide", "⏸️ Suspendu", "❌ Révoqué", "🚫 Rejeté"];
const STATUS_COLORS = ["#b45309",       "#15803d",   "#d97706",     "#b91c1c",    "#7f1d1d"];
const TYPE_LABELS   = ["Diplôme", "Certificat", "Licence", "Relevé de notes", "Formation"];

function MinistryDashboard() {
  const [loading, setLoading]           = useState(false);
  const [message, setMessage]           = useState("");
  const [isMinistry, setIsMinistry]     = useState(null);
  const [data, setData]                 = useState({ issuers: [], pending: [], allCredentials: [], totalCredentials: 0 });
  const [accreditForm, setAccreditForm] = useState({ address: "", name: "" });
  const [rejectReason, setRejectReason] = useState({});
  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => { init(); }, []);

  const init = async () => {
    try {
      const hasRole = await checkMinistryRole();
      setIsMinistry(hasRole);
      if (hasRole) await loadData();
    } catch { setIsMinistry(false); }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await getMinistryData();
      setData(result);
    } catch (e) {
      setMessage("❌ Erreur : " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccredit = async (e) => {
    e.preventDefault();
    if (!ethers.isAddress(accreditForm.address)) { setMessage("❌ Adresse Ethereum invalide"); return; }
    try {
      setLoading(true);
      setMessage("⏳ Accréditation en cours...");
      await authorizeIssuer(accreditForm.address, accreditForm.name);
      setMessage(`✅ ${accreditForm.name} accréditée avec succès`);
      setAccreditForm({ address: "", name: "" });
      await loadData();
    } catch (e) { setMessage("❌ " + e.message); }
    finally { setLoading(false); }
  };

  const handleRemove = async (address, name) => {
    if (!window.confirm(`Retirer l'accréditation de ${name} ?`)) return;
    try {
      setLoading(true);
      setMessage("⏳ Retrait en cours...");
      await removeIssuer(address);
      setMessage(`✅ Accréditation de ${name} retirée`);
      await loadData();
    } catch (e) { setMessage("❌ " + e.message); }
    finally { setLoading(false); }
  };

  const handleApprove = async (id) => {
    try {
      setLoading(true);
      setMessage("⏳ Approbation en cours...");
      await approveCredential(id);
      setMessage(`✅ Diplôme #${id} approuvé`);
      await loadData();
    } catch (e) { setMessage("❌ " + e.message); }
    finally { setLoading(false); }
  };

  const handleReject = async (id) => {
    try {
      setLoading(true);
      setMessage("⏳ Rejet en cours...");
      await rejectCredential(id, rejectReason[id] || "Rejeté par le ministère");
      setMessage(`🚫 Diplôme #${id} rejeté`);
      await loadData();
    } catch (e) { setMessage("❌ " + e.message); }
    finally { setLoading(false); }
  };

  if (isMinistry === null) return (
    <div className="dashboard-container">
      <h1>🏛️ Ministère de l'Enseignement Supérieur</h1>
      <p className="loading">⏳ Vérification des droits d'accès...</p>
    </div>
  );

  if (!isMinistry) return (
    <div className="dashboard-container">
      <h1>🏛️ Ministère de l'Enseignement Supérieur</h1>
      <div className="message-box" style={{ borderColor: "#dc2626", background: "#fef2f2", color: "#991b1b", margin: "32px" }}>
        ⛔ Accès refusé — Ce compte n'a pas le rôle Ministère.
      </div>
    </div>
  );

  const activeIssuers = data.issuers.filter(i => i.isActive).length;

  // Diplômes filtrés
  const q = search.toLowerCase();
  const filtered = (data.allCredentials || [])
    .filter((c) => {
      const matchStatus = filterStatus === "all" || String(Number(c.status)) === filterStatus;
      const matchSearch = !q ||
        c.holderName?.toLowerCase().includes(q) ||
        c.institutionName?.toLowerCase().includes(q) ||
        c.fieldOfStudy?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    })
    .sort((a, b) => Number(b.issueDate) - Number(a.issueDate));

  return (
    <div className="dashboard-container">
      <h1>🏛️ Ministère de l'Enseignement Supérieur — Portail de Gestion</h1>

      {/* ── STATISTIQUES ── */}
      <section className="stats-section" style={{ margin: "24px 32px 20px" }}>
        <h2>Vue d'ensemble</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{activeIssuers}</div>
            <div className="stat-label">Universités accréditées</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: "var(--warning)" }}>{data.pending.length}</div>
            <div className="stat-label">En attente d'approbation</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{(data.allCredentials || []).filter(c => Number(c.status) === 1).length}</div>
            <div className="stat-label">Diplômes approuvés</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{data.totalCredentials}</div>
            <div className="stat-label">Total émis</div>
          </div>
        </div>
      </section>

      {message && <div className="message-box">{message}</div>}

      {/* ── ACCRÉDITATION ── */}
      <section className="form-section">
        <h2>🏫 Accréditation d'un établissement</h2>
        <form onSubmit={handleAccredit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Nom de l'établissement</label>
              <input type="text" placeholder="Ex : Université Mohammed V" value={accreditForm.name}
                onChange={(e) => setAccreditForm({ ...accreditForm, name: e.target.value })}
                disabled={loading} required />
            </div>
            <div className="form-group">
              <label>Adresse Ethereum</label>
              <input type="text" placeholder="0x..." value={accreditForm.address}
                onChange={(e) => setAccreditForm({ ...accreditForm, address: e.target.value })}
                disabled={loading} required />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "⏳ Traitement..." : "✅ Accréditer l'établissement"}
          </button>
        </form>
      </section>

      {/* ── UNIVERSITÉS ── */}
      <section className="list-section">
        <h2>🏛️ Registre des établissements</h2>
        <div className="list-toolbar">
          <button className="btn-secondary" onClick={loadData} disabled={loading}>🔄 Actualiser</button>
        </div>
        {data.issuers.length === 0 ? (
          <p className="empty">Aucun établissement enregistré</p>
        ) : (
          <div className="diplomas-list">
            <table className="diploma-table">
              <thead>
                <tr>
                  <th>Établissement</th>
                  <th>Adresse Ethereum</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.issuers.map((issuer) => (
                  <tr key={issuer.address}>
                    <td style={{ fontWeight: 600 }}>{issuer.name || "—"}</td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "var(--muted)" }}>
                      {issuer.address}
                    </td>
                    <td>
                      <span className="status-badge" style={{ backgroundColor: issuer.isActive ? "#15803d" : "#b91c1c" }}>
                        {issuer.isActive ? "✅ Accréditée" : "❌ Retirée"}
                      </span>
                    </td>
                    <td className="td-actions">
                      {issuer.isActive && (
                        <button className="btn-danger" onClick={() => handleRemove(issuer.address, issuer.name)} disabled={loading}>
                          Retirer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── DIPLÔMES EN ATTENTE ── */}
      {data.pending.length > 0 && (
        <section className="list-section" style={{ borderTopColor: "var(--warning)" }}>
          <h2 style={{ color: "var(--warning)" }}>⏳ Diplômes en attente d'approbation ({data.pending.length})</h2>
          <div className="diplomas-list">
            <table className="diploma-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Titulaire</th>
                  <th>Type</th>
                  <th>Institution</th>
                  <th>Domaine</th>
                  <th>Date</th>
                  <th>Décision</th>
                </tr>
              </thead>
              <tbody>
                {data.pending.map((c) => (
                  <tr key={c.id}>
                    <td style={{ color: "var(--muted)", fontWeight: 600 }}>{c.id}</td>
                    <td style={{ fontWeight: 600 }}>{c.holderName}</td>
                    <td>{TYPE_LABELS[Number(c.credentialType)] ?? "—"}</td>
                    <td>{c.institutionName}</td>
                    <td>{c.fieldOfStudy}</td>
                    <td>{new Date(Number(c.issueDate) * 1000).toLocaleDateString("fr-FR")}</td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button className="btn-primary" onClick={() => handleApprove(c.id)} disabled={loading}>
                            ✅ Approuver
                          </button>
                          <button className="btn-danger" onClick={() => handleReject(c.id)} disabled={loading}>
                            🚫 Rejeter
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Motif du rejet (optionnel)"
                          value={rejectReason[c.id] || ""}
                          onChange={(e) => setRejectReason({ ...rejectReason, [c.id]: e.target.value })}
                          style={{ padding: "4px 8px", fontSize: "12px", border: "1px solid var(--border)", borderRadius: "4px" }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── REGISTRE GÉNÉRAL ── */}
      <section className="list-section">
        <h2>📋 Registre général des diplômes</h2>
        <div className="list-toolbar">
          <input
            type="text"
            placeholder="🔍  Rechercher par nom, institution ou domaine..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">Tous les statuts</option>
            <option value="0">⏳ En attente</option>
            <option value="1">✅ Valide</option>
            <option value="2">⏸️ Suspendu</option>
            <option value="3">❌ Révoqué</option>
            <option value="4">🚫 Rejeté</option>
          </select>
          <button className="btn-secondary" onClick={loadData} disabled={loading}>🔄</button>
        </div>

        {filtered.length === 0 ? (
          <p className="empty">Aucun diplôme trouvé</p>
        ) : (
          <div className="diplomas-list">
            <table className="diploma-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Titulaire</th>
                  <th>Type</th>
                  <th>Institution</th>
                  <th>Domaine</th>
                  <th>Date d'émission</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const si = Number(c.status);
                  return (
                    <tr key={c.id}>
                      <td style={{ color: "var(--muted)", fontWeight: 600 }}>{c.id}</td>
                      <td style={{ fontWeight: 600 }}>{c.holderName}</td>
                      <td>{TYPE_LABELS[Number(c.credentialType)] ?? "—"}</td>
                      <td>{c.institutionName}</td>
                      <td>{c.fieldOfStudy}</td>
                      <td>{new Date(Number(c.issueDate) * 1000).toLocaleDateString("fr-FR")}</td>
                      <td>
                        <span className="status-badge" style={{ backgroundColor: STATUS_COLORS[si] || "#64748b" }}>
                          {STATUS_LABELS[si] || "Inconnu"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default MinistryDashboard;
