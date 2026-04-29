export async function hashFile(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return '0x' + bufferToHex(hashBuffer);
}

export function bufferToHex(buffer) {
  return Array.prototype.map
    .call(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
