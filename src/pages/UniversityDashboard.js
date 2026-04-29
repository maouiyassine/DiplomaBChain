import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getContract } from "../utils/blockchain.js";
import { hashFile } from "../utils/hashUtils.js";
import { uploadToIpfs } from "../utils/ipfs.js";
import "../styles/dashboard.css";

function UniversityDashboard() {
  const [stats, setStats] = useState({
    totalDiplomas: 0,
    isAuthorized: false,
    currentAddress: null,
  });

  const [diplomas, setDiplomas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [issueForm, setIssueForm] = useState({
    studentName: "",
    holderAddress: "",
    diplomaType: 0,
    institutionName: "",
    fieldOfStudy: "",
    file: null,
  });

  // Charger les stats au montage
  useEffect(() => {
    loadStats();
    loadDiplomas();
  }, []);

  const loadStats = async () => {
    try {
      const contract = await getContract();
      if (!contract) return;

      const address = await contract.runner.getAddress().catch(() => "—");
      const ISSUER_ROLE = await contract.ISSUER_ROLE();
      const isAuthorized = await contract.hasRole(ISSUER_ROLE, address);

      setStats({ totalDiplomas: 0, isAuthorized, currentAddress: address });
    } catch (error) {
      console.error("Erreur chargement stats:", error);
    }
  };

  const loadDiplomas = async () => {
    try {
      setLoading(true);
      const contract = await getContract();
      if (!contract) {
        setMessage("❌ MetaMask non connecté");
        return;
      }

      // Récupérer tous les diplômes en parallèle
      const userAddress = await contract.runner.getAddress();
      const count = Number(await contract.getTotalCredentialsCount());
      const ids = Array.from({ length: count }, (_, i) => i);
      const results = await Promise.all(ids.map((i) => contract.getCredential(i)));
      const diplomasList = results
        .map((credential, i) => ({
          id: i,
          holderName: credential.holderName,
          fieldOfStudy: credential.fieldOfStudy,
          institutionName: credential.institutionName,
          issueDate: credential.issueDate,
          expiryDate: credential.expiryDate,
          status: credential.status,
          type: credential.credentialType,
          issuer: credential.issuer,
        }))
        .filter((d) => d.issuer.toLowerCase() === userAddress.toLowerCase());

      const sorted = diplomasList.reverse();
      setDiplomas(sorted);
      setStats((prev) => ({ ...prev, totalDiplomas: sorted.length }));
    } catch (error) {
      console.error("Erreur chargement diplômes:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type) => {
    const types = [
      "Diplôme",
      "Certificat",
      "Licence",
      "Relevé de notes",
      "Formation",
    ];
    return types[type] || "Inconnu";
  };

  const getStatusBadge = (status) => {
    const statuses = {
      0: { label: "⏳ En attente", color: "#f59e0b" },
      1: { label: "✅ Valide",     color: "#28a745" },
      2: { label: "⏸️ Suspendu",  color: "#ffc107" },
      3: { label: "❌ Révoqué",   color: "#dc3545" },
      4: { label: "🚫 Rejeté",    color: "#7f1d1d" },
    };
    return statuses[status] || { label: "Inconnu", color: "#6c757d" };
  };

  const handleSuspend = async (diplomaId) => {
    try {
      setLoading(true);
      setMessage("⏳ Suspension en cours...");
      const contract = await getContract();
      const tx = await contract.suspendCredential(diplomaId, "Suspendu par l'institution");
      await tx.wait();
      setMessage(`✅ Diplôme #${diplomaId} suspendu`);
      setTimeout(() => loadDiplomas(), 1500);
    } catch (error) {
      setMessage(`❌ Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async (diplomaId) => {
    try {
      setLoading(true);
      setMessage("⏳ Réactivation en cours...");
      const contract = await getContract();
      const tx = await contract.reactivateCredential(diplomaId);
      await tx.wait();
      setMessage(`✅ Diplôme #${diplomaId} réactivé`);
      setTimeout(() => loadDiplomas(), 1500);
    } catch (error) {
      setMessage(`❌ Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (diplomaId) => {
    const confirmed = window.confirm(`Révoquer définitivement le diplôme #${diplomaId} ? Cette action est irréversible.`);
    if (!confirmed) return;
    try {
      setLoading(true);
      setMessage("⏳ Révocation en cours...");
      const contract = await getContract();
      const tx = await contract.revokeCredential(diplomaId, "Révoqué par l'institution");
      await tx.wait();
      setMessage(`✅ Diplôme #${diplomaId} révoqué`);
      setTimeout(() => loadDiplomas(), 1500);
    } catch (error) {
      setMessage(`❌ Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueDiploma = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage("⏳ Émission du diplôme en cours...");

      if (!issueForm.studentName || !issueForm.holderAddress || !issueForm.file) {
        setMessage("❌ Veuillez remplir tous les champs");
        setLoading(false);
        return;
      }

      if (!ethers.isAddress(issueForm.holderAddress)) {
        setMessage("❌ Adresse Ethereum de l'étudiant invalide");
        setLoading(false);
        return;
      }

      // Hacher le fichier
      setMessage("⏳ Étape 1/5 : calcul du hash du fichier...");
      const fileHash = await hashFile(issueForm.file);

      // Uploader sur IPFS (optionnel — le diplôme est émis même si IPFS est indisponible)
      setMessage("⏳ Étape 2/5 : vérification IPFS...");
      const { cid, available } = await uploadToIpfs(issueForm.file, fileHash);
      const ipfsHash = cid || fileHash;
      if (available) {
        setMessage(`✅ PDF stocké sur IPFS : ${cid}`);
      } else {
        setMessage("⚠️ Étape 2/5 : IPFS non disponible — on continue sans lien PDF...");
      }

      // Récupérer le contrat
      setMessage("⏳ Étape 3/5 : connexion MetaMask...");
      const contract = await getContract();
      if (!contract) {
        setMessage("❌ MetaMask non connecté");
        setLoading(false);
        return;
      }

      const userAddress = await contract.runner.getAddress();

      // Vérifier si le compte est autorisé comme issuer
      setMessage("⏳ Étape 4/5 : vérification des permissions...");
      const ISSUER_ROLE = await contract.ISSUER_ROLE();
      const isIssuer = await contract.hasRole(ISSUER_ROLE, userAddress);
      if (!isIssuer) {
        setMessage("❌ Ce compte n'est pas accrédité par le Ministère. Demandez une accréditation.");
        setLoading(false);
        return;
      }

      // Émettre le diplôme
      setMessage("⏳ Étape 5/5 : signature MetaMask...");
      const tx = await contract.issueCredential(
        issueForm.holderAddress, // holder = adresse Ethereum de l'étudiant
        issueForm.studentName, // holderName
        ipfsHash, // credentialURI
        ipfsHash, // credentialMetadataURI
        fileHash, // credentialHash
        issueForm.diplomaType, // credentialType
        0, // expiryDate (jamais)
        issueForm.institutionName || "Université", // institutionName
        issueForm.fieldOfStudy || "Général" // fieldOfStudy
      );

      setMessage("⏳ Transaction en attente de confirmation...");
      const receipt = await tx.wait();

      setMessage(
        `✅ Diplôme émis avec succès! TX: ${(receipt.hash || receipt.transactionHash || "").slice(0, 10)}...`
      );

      // Réinitialiser le formulaire
      setIssueForm({
        studentName: "",
        holderAddress: "",
        diplomaType: 0,
        institutionName: "",
        fieldOfStudy: "",
        file: null,
      });

      // Recharger les diplômes
      setTimeout(() => {
        loadStats();
        loadDiplomas();
      }, 2000);
    } catch (error) {
      console.error("Erreur émission:", error);
      setMessage(`❌ Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <h1>🏫 Dashboard Université</h1>

      {/* 📊 STATISTIQUES */}
      <section className="stats-section">
        <h2>📊 Statistiques</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.totalDiplomas}</div>
            <div className="stat-label">Diplômes Émis</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {stats.isAuthorized ? "✅" : "❌"}
            </div>
            <div className="stat-label">Autorisée à émettre</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.currentAddress?.slice(0, 10) || "..."}</div>
            <div className="stat-label">Adresse Ethereum</div>
          </div>
        </div>
      </section>

      {/* Message */}
      {message && <div className="message-box">{message}</div>}

      {/* ➕ FORMULAIRE */}
      <section className="form-section">
        <h2>➕ Émettre un Diplôme</h2>
        <form onSubmit={handleIssueDiploma}>
          <div className="form-grid">
            <div className="form-group">
              <label>Nom de l'Étudiant</label>
              <input
                type="text"
                placeholder="Jean Dupont"
                value={issueForm.studentName}
                onChange={(e) =>
                  setIssueForm({ ...issueForm, studentName: e.target.value })
                }
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label>Adresse Ethereum de l'Étudiant</label>
              <input
                type="text"
                placeholder="0x..."
                value={issueForm.holderAddress}
                onChange={(e) =>
                  setIssueForm({ ...issueForm, holderAddress: e.target.value })
                }
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label>Type de Diplôme</label>
              <select
                value={issueForm.diplomaType}
                onChange={(e) =>
                  setIssueForm({
                    ...issueForm,
                    diplomaType: parseInt(e.target.value),
                  })
                }
                disabled={loading}
              >
                <option value={0}>Diplôme</option>
                <option value={1}>Certificat</option>
                <option value={2}>Licence</option>
                <option value={3}>Relevé de notes</option>
                <option value={4}>Formation</option>
              </select>
            </div>

            <div className="form-group">
              <label>Nom de l'Institution</label>
              <input
                type="text"
                placeholder="Université de Paris"
                value={issueForm.institutionName}
                onChange={(e) =>
                  setIssueForm({ ...issueForm, institutionName: e.target.value })
                }
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Domaine d'études</label>
              <input
                type="text"
                placeholder="Informatique"
                value={issueForm.fieldOfStudy}
                onChange={(e) =>
                  setIssueForm({ ...issueForm, fieldOfStudy: e.target.value })
                }
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Upload PDF</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) =>
                  setIssueForm({
                    ...issueForm,
                    file: e.target.files[0],
                  })
                }
                disabled={loading}
                required
              />
              {issueForm.file && (
                <small>📄 {issueForm.file.name}</small>
              )}
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "⏳ Chargement..." : "Émettre le Diplôme"}
          </button>
        </form>
      </section>

      {/* 📜 LISTE DES DIPLÔMES */}
      <section className="list-section">
        <h2>📜 Registre des diplômes émis</h2>
        <div className="list-toolbar">
          <button onClick={loadDiplomas} disabled={loading} className="btn-secondary">
            🔄 Actualiser
          </button>
        </div>

        {loading ? (
          <p className="loading">⏳ Chargement...</p>
        ) : diplomas.length === 0 ? (
          <p className="empty">Aucun diplôme émis pour le moment</p>
        ) : (
          <div className="diplomas-list">
            <table className="diploma-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Titulaire</th>
                  <th>Type</th>
                  <th>Domaine</th>
                  <th>Date d'émission</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {diplomas.map((diploma) => {
                  const s = getStatusBadge(diploma.status);
                  const st = Number(diploma.status);
                  return (
                    <tr key={diploma.id}>
                      <td style={{ color: "var(--muted)", fontWeight: 600 }}>{diploma.id}</td>
                      <td style={{ fontWeight: 600 }}>{diploma.holderName}</td>
                      <td>{getTypeLabel(diploma.type)}</td>
                      <td>{diploma.fieldOfStudy}</td>
                      <td>{new Date(Number(diploma.issueDate) * 1000).toLocaleDateString("fr-FR")}</td>
                      <td>
                        <span className="status-badge" style={{ backgroundColor: s.color }}>
                          {s.label}
                        </span>
                      </td>
                      <td className="td-actions">
                        {st === 0 && <span style={{ fontSize: "12px", color: "var(--warning)" }}>En attente</span>}
                        {st === 1 && <>
                          <button className="btn-secondary" onClick={() => handleSuspend(diploma.id)} disabled={loading}>Suspendre</button>
                          <button className="btn-danger"    onClick={() => handleRevoke(diploma.id)}  disabled={loading}>Révoquer</button>
                        </>}
                        {st === 2 && <>
                          <button className="btn-primary" onClick={() => handleReactivate(diploma.id)} disabled={loading}>Réactiver</button>
                          <button className="btn-danger"  onClick={() => handleRevoke(diploma.id)}     disabled={loading}>Révoquer</button>
                        </>}
                        {st === 3 && <span style={{ fontSize: "12px", color: "var(--danger)" }}>Révoqué</span>}
                        {st === 4 && <span style={{ fontSize: "12px", color: "var(--danger)" }}>Rejeté</span>}
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

export default UniversityDashboard;
