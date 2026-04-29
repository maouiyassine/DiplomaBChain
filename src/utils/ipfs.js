const IPFS_API_URL = process.env.IPFS_API_URL;

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function uploadToIpfs(file, hash) {
  // ── Tentative IPFS si configuré ───────────────────────────────────────────
  if (IPFS_API_URL) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(`${IPFS_API_URL}/add?pin=true`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (response.ok) {
        const data = await response.json();
        return { cid: `ipfs://${data.Hash}`, available: true };
      }
    } catch {
      // IPFS non disponible, on continue avec le serveur local
    }
  }

  // ── Serveur local (webpack dev server) ───────────────────────────────────
  try {
    const base64 = await readFileAsBase64(file);
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash, data: base64, filename: file.name }),
    });
    if (response.ok) {
      const { url } = await response.json();
      return { cid: url, available: true };
    }
  } catch (e) {
    console.warn('Upload local échoué :', e.message);
  }

  return { cid: null, available: false };
}
