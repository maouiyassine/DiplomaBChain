import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { verifyCredentialByHash } from '../utils/blockchain.js';

const Verify = () => {
  const [searchParams] = useSearchParams();
  const [credentialHash, setCredentialHash] = useState('');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  // Lire le hash depuis l'URL (?hash=0x...) et vérifier automatiquement
  useEffect(() => {
    const hashFromUrl = searchParams.get('hash');
    if (hashFromUrl) {
      setCredentialHash(hashFromUrl);
      verifyCredentialByHash(hashFromUrl)
        .then(setStatus)
        .catch((err) => setError(err.message || 'Erreur lors de la vérification.'));
    }
  }, []);

  const extractHash = (input) => {
    const trimmed = input.trim();
    try {
      const url = new URL(trimmed);
      const h = url.searchParams.get("hash");
      if (h) return h;
    } catch {}
    return trimmed;
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    setError(null);
    setStatus(null);

    try {
      const hash = extractHash(credentialHash);
      const result = await verifyCredentialByHash(hash);
      setStatus(result);
    } catch (err) {
      setError(err.message || 'Erreur lors de la vérification.');
    }
  };

  return (
    <section className="page page-verify">
      <div className="card">
        <h2>Vérifier un diplôme</h2>
        <form onSubmit={handleVerify} className="form-group">
          <label htmlFor="credentialHash">Hash du diplôme</label>
          <input
            id="credentialHash"
            type="text"
            value={credentialHash}
            onChange={(e) => setCredentialHash(e.target.value)}
            placeholder="0x..."
          />
          <button type="submit" className="btn btn-primary">
            Vérifier
          </button>
        </form>
        {error && <p className="alert alert-error">{error}</p>}
        {status && (
          <div className="verification-summary">
            <p>Diplôme valide : <strong>{status.isValid ? 'Oui' : 'Non'}</strong></p>
            {status.credentialData && (
              <div className="credential-data">
                <p><strong>Titre :</strong> {status.credentialData.holderName}</p>
                <p><strong>Établissement :</strong> {status.credentialData.institutionName}</p>
                <p><strong>Domaine :</strong> {status.credentialData.fieldOfStudy}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default Verify;
