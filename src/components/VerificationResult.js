import React from 'react';

const VerificationResult = ({ result }) => {
  if (!result) return null;

  return (
    <div className="verification-card">
      <h3>Résultat du traitement</h3>
      <p><strong>Fichier :</strong> {result.filename}</p>
      <p><strong>Hash de vérification :</strong> {result.validationHash}</p>
      <p><strong>CID IPFS :</strong> {result.ipfsCid}</p>
      <p className="note">Vous pouvez utiliser ce hash pour vérifier le diplôme sur la blockchain.</p>
    </div>
  );
};

export default VerificationResult;
