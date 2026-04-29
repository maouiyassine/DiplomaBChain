import React, { useState, useRef, useEffect } from "react";
import { verifyCredentialByHash } from "../utils/blockchain.js";
import { hashFile } from "../utils/hashUtils.js";
import "../styles/dashboard.css";

const CREDENTIAL_TYPES = ["Diplôme", "Certificat", "Licence", "Relevé de notes", "Formation"];
const STATUS_LABELS = { 0: "EN ATTENTE", 1: "VALIDE", 2: "SUSPENDU", 3: "RÉVOQUÉ", 4: "REJETÉ" };

function extractHashFromQrContent(content) {
  if (!content) return null;
  const trimmed = content.trim();
  // Try to parse as URL and extract ?hash= param
  try {
    const url = new URL(trimmed);
    const hash = url.searchParams.get("hash");
    if (hash) return hash;
  } catch {
    // Not a URL
  }
  // Direct hash format (with or without 0x)
  if (/^0x[0-9a-fA-F]{40,}$/.test(trimmed) || /^[0-9a-fA-F]{40,}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

function EmployerDashboard() {
  const [verificationCount, setVerificationCount] = useState(0);

  // PDF verification state
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // QR image state
  const [qrImageFile, setQrImageFile] = useState(null);
  const [qrImageLoading, setQrImageLoading] = useState(false);

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [scanStatus, setScanStatus] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  // Shared result / error state
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [lastHash, setLastHash] = useState(null);

  // --- Core verification ---
  const runVerification = async (hash) => {
    setError(null);
    setResult(null);
    setLastHash(hash);
    try {
      const data = await verifyCredentialByHash(hash);
      setResult(data);
      setVerificationCount((c) => c + 1);
    } catch (e) {
      setError(e.message || "Erreur lors de la vérification.");
    }
  };

  // --- PDF Upload ---
  const handlePdfVerify = async () => {
    if (!pdfFile) return;
    setPdfLoading(true);
    setError(null);
    setResult(null);
    try {
      const hex = await hashFile(pdfFile);
      await runVerification(hex);
    } catch (e) {
      setError(e.message || "Impossible de lire le fichier PDF.");
    } finally {
      setPdfLoading(false);
    }
  };

  // --- QR Image Upload ---
  const handleQrImageVerify = async () => {
    if (!qrImageFile) return;
    setQrImageLoading(true);
    setError(null);
    setResult(null);
    try {
      if (!("BarcodeDetector" in window)) {
        setError("BarcodeDetector non supporté par ce navigateur. Utilisez Chrome ou Edge récent.");
        return;
      }
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const bitmap = await createImageBitmap(qrImageFile);
      const barcodes = await detector.detect(bitmap);
      if (!barcodes.length) {
        setError("Aucun QR code détecté dans l'image.");
        return;
      }
      const content = barcodes[0].rawValue;
      const hash = extractHashFromQrContent(content);
      if (!hash) {
        setError(`QR code décodé mais contenu invalide : "${content}"`);
        return;
      }
      await runVerification(hash);
    } catch (e) {
      setError(e.message || "Erreur lors du décodage du QR code.");
    } finally {
      setQrImageLoading(false);
    }
  };

  // --- Camera QR Scanner ---
  const startCamera = async () => {
    setCameraError(null);
    setScanStatus(null);
    setError(null);
    setResult(null);
    try {
      if (!("BarcodeDetector" in window)) {
        setCameraError("BarcodeDetector non supporté par ce navigateur. Utilisez Chrome ou Edge récent.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setCameraActive(true);
      setScanStatus("Positionnez le QR code devant la caméra...");
    } catch (e) {
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        setCameraError(
          "Permission caméra refusée. Dans Chrome : clique sur l'icône 🔒 dans la barre d'adresse → Autorisations du site → Caméra → Autoriser, puis recharge la page."
        );
      } else if (e.name === "NotFoundError") {
        setCameraError("Aucune caméra détectée sur cet appareil.");
      } else {
        setCameraError("Impossible d'accéder à la caméra : " + (e.message || e));
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setCameraActive(false);
    setScanStatus(null);
  };

  // Attach stream to video element once camera becomes active
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play();

      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length) {
            const content = barcodes[0].rawValue;
            const hash = extractHashFromQrContent(content);
            if (hash) {
              stopCamera();
              setScanStatus("QR code détecté !");
              await runVerification(hash);
            } else {
              setScanStatus(`QR détecté mais contenu non reconnu : "${content}"`);
            }
          }
        } catch {
          // Frame not ready, ignore
        }
      }, 500);
    }
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [cameraActive]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  const isValid = result && result.isValid;
  const displayValid = result && result.isValid; // isValid est déjà true uniquement si status === ISSUED (1)

  const formatDate = (timestamp) => {
    if (!timestamp || timestamp === "0") return "—";
    const n = Number(timestamp);
    if (n === 0) return "—";
    return new Date(n * 1000).toLocaleDateString("fr-FR");
  };

  return (
    <div className="dashboard-container">
      <h1>🏢 Dashboard Vérification</h1>

      {/* Stats */}
      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-card" style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)" }}>
            <div className="stat-value">{verificationCount}</div>
            <div className="stat-label">Vérifications effectuées</div>
          </div>
          <div className="stat-card" style={{ background: "linear-gradient(135deg, #064e3b 0%, #10b981 100%)" }}>
            <div className="stat-value">🔒</div>
            <div className="stat-label">Vérification blockchain sécurisée</div>
          </div>
        </div>
      </section>

      {/* Action Panels */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", marginBottom: "32px" }}>

        {/* Panel 1 — Upload PDF */}
        <div className="form-section">
          <h2>🔍 Vérifier par PDF</h2>
          <p style={{ color: "#666", fontSize: "14px", marginBottom: "20px" }}>
            Importez le fichier PDF du diplôme. Son empreinte numérique sera calculée et comparée à la blockchain.
          </p>
          <div className="form-group">
            <label htmlFor="pdfUpload">Fichier PDF</label>
            <input
              id="pdfUpload"
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => {
                setPdfFile(e.target.files[0] || null);
                setResult(null);
                setError(null);
              }}
            />
            {pdfFile && (
              <small>📄 {pdfFile.name} ({(pdfFile.size / 1024).toFixed(1)} Ko)</small>
            )}
          </div>
          <button
            className="btn-primary"
            onClick={handlePdfVerify}
            disabled={!pdfFile || pdfLoading}
            style={{ marginTop: "12px" }}
          >
            {pdfLoading ? "⏳ Calcul du hash..." : "🔍 Vérifier ce diplôme"}
          </button>
        </div>

        {/* Panel 2 — QR Code Scanner */}
        <div className="form-section">
          <h2>📷 Scanner un QR code</h2>
          <p style={{ color: "#666", fontSize: "14px", marginBottom: "20px" }}>
            Scannez le QR code fourni par l'étudiant, soit en important une image, soit via la caméra.
          </p>

          {/* Sub-option A: QR Image Upload */}
          <div className="form-group" style={{ marginBottom: "16px" }}>
            <label htmlFor="qrImage">Image du QR code</label>
            <input
              id="qrImage"
              type="file"
              accept="image/*"
              onChange={(e) => {
                setQrImageFile(e.target.files[0] || null);
                setResult(null);
                setError(null);
              }}
            />
          </div>
          <button
            className="btn-primary"
            onClick={handleQrImageVerify}
            disabled={!qrImageFile || qrImageLoading}
            style={{ marginBottom: "20px" }}
          >
            {qrImageLoading ? "⏳ Décodage..." : "📤 Vérifier depuis l'image"}
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <div style={{ flex: 1, height: "1px", backgroundColor: "#e0e0e0" }} />
            <span style={{ color: "#999", fontSize: "13px" }}>ou</span>
            <div style={{ flex: 1, height: "1px", backgroundColor: "#e0e0e0" }} />
          </div>

          {/* Sub-option B: Camera */}
          {!cameraActive ? (
            <button className="btn-secondary" onClick={startCamera} style={{ alignSelf: "flex-start" }}>
              📷 Utiliser la caméra
            </button>
          ) : (
            <button className="btn-danger" onClick={stopCamera} style={{ alignSelf: "flex-start" }}>
              ⏹ Arrêter la caméra
            </button>
          )}

          {cameraError && (
            <div className="message-box" style={{ borderLeftColor: "#dc3545", marginTop: "12px" }}>
              ⚠️ {cameraError}
            </div>
          )}

          {cameraActive && (
            <div style={{ marginTop: "16px" }}>
              <video
                ref={videoRef}
                style={{ width: "100%", borderRadius: "8px", border: "2px solid #007bff" }}
                playsInline
                muted
              />
              <canvas ref={canvasRef} style={{ display: "none" }} />
              {scanStatus && (
                <p style={{ textAlign: "center", marginTop: "8px", color: "#555", fontSize: "14px" }}>
                  🔄 {scanStatus}
                </p>
              )}
            </div>
          )}
          {!cameraActive && scanStatus && (
            <p style={{ color: "#10b981", fontWeight: "600", marginTop: "8px", fontSize: "14px" }}>
              ✅ {scanStatus}
            </p>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="message-box" style={{ borderLeftColor: "#dc3545", backgroundColor: "#fff5f5", marginBottom: "24px" }}>
          ❌ {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <section className="list-section">
          <h2>✅ Résultat de la vérification</h2>

          {/* Verdict banner */}
          <div
            style={{
              padding: "24px",
              borderRadius: "10px",
              textAlign: "center",
              marginBottom: "24px",
              background: displayValid
                ? "linear-gradient(135deg, #064e3b 0%, #10b981 100%)"
                : "linear-gradient(135deg, #7f1d1d 0%, #dc3545 100%)",
              color: "white",
            }}
          >
            <div style={{ fontSize: "3em", marginBottom: "8px" }}>
              {displayValid ? "✅" : "❌"}
            </div>
            <div style={{ fontSize: "1.8em", fontWeight: "bold" }}>
              {displayValid
                ? "Diplôme VALIDE"
                : result.credentialData
                ? `Diplôme ${STATUS_LABELS[Number(result.credentialData.status)] || "INVALIDE"}`
                : "Diplôme INVALIDE / NON TROUVÉ"}
            </div>
            <div style={{ marginTop: "8px", opacity: 0.85, fontSize: "14px" }}>
              {displayValid
                ? "Ce diplôme est authentique et enregistré sur la blockchain."
                : "Ce diplôme ne peut pas être considéré comme authentique."}
            </div>
          </div>

          {/* Credential details */}
          {result.credentialData && result.isValid && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
              }}
            >
              {[
                { label: "Titulaire", value: result.credentialData.holderName },
                { label: "Établissement", value: result.credentialData.institutionName },
                { label: "Domaine d'études", value: result.credentialData.fieldOfStudy },
                {
                  label: "Type",
                  value: CREDENTIAL_TYPES[Number(result.credentialData.credentialType)] || "—",
                },
                { label: "Date d'émission", value: formatDate(result.credentialData.issueDate) },
                {
                  label: "Expiration",
                  value: formatDate(result.credentialData.expiryDate),
                },
                {
                  label: "Statut",
                  value: STATUS_LABELS[Number(result.credentialData.status)] || "—",
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    background: "#f8f9fa",
                    border: "1px solid #e0e0e0",
                    borderRadius: "8px",
                    padding: "16px",
                  }}
                >
                  <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px", fontWeight: "600", textTransform: "uppercase" }}>
                    {label}
                  </div>
                  <div style={{ fontSize: "15px", color: "#333", fontWeight: "500" }}>
                    {value || "—"}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Hash used */}
          {lastHash && (
            <div style={{ marginTop: "20px", padding: "12px 16px", background: "#f1f5f9", borderRadius: "6px", fontSize: "12px", color: "#666", wordBreak: "break-all" }}>
              <strong>Hash vérifié :</strong> {lastHash}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default EmployerDashboard;
