import React, { useState } from 'react';
import { hashFile } from '../utils/hashUtils.js';
import { uploadToIpfs } from '../utils/ipfs.js';

const DiplomaUploader = ({ onResult }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [status, setStatus] = useState('');

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setStatus('');
    onResult(null);
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setStatus('Veuillez choisir un fichier');
      return;
    }

    setStatus('Calcul du hash...');

    try {
      const credentialHash = await hashFile(selectedFile);
      setStatus('Upload sur IPFS...');
      const ipfsHash = await uploadToIpfs(selectedFile);

      const result = {
        validationHash: credentialHash,
        ipfsCid: ipfsHash,
        filename: selectedFile.name,
      };

      setStatus('Téléversement terminé.');
      onResult(result);
    } catch (error) {
      setStatus('Erreur lors du traitement du fichier.');
      console.error(error);
    }
  };

  return (
    <div className="uploader">
      <form onSubmit={handleUpload} className="form-group">
        <label htmlFor="diplomaFile">Choisir un diplôme</label>
        <input id="diplomaFile" type="file" onChange={handleFileChange} />
        <button type="submit" className="btn btn-secondary">
          Calculer et téléverser
        </button>
      </form>
      {selectedFile && <p>Fichier sélectionné : {selectedFile.name}</p>}
      {status && <p className="status-message">{status}</p>}
    </div>
  );
};

export default DiplomaUploader;
