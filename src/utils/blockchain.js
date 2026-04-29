import { ethers } from "ethers";
import abi from "./abi.json";

const contractAddress = "0xf25186B5081Ff5cE73482AD761DB0eB0d25abfBF"; // Besu deployment 2026-04-26 (fix _grantRole)
const BESU_TEST_PRIVATE_KEY = process.env.BESU_TEST_PRIVATE_KEY;
export const BESU_CHAIN_ID = "0x539"; // 1337 en hex

export async function connectWallet() {
  if (!window.ethereum) throw new Error("MetaMask non détecté");

  try {
    await window.ethereum.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    });
  } catch (e) {
    // -32002 : une popup MetaMask est déjà ouverte — l'amener au premier plan
    if (e.code === -32002) {
      throw new Error("MetaMask a déjà une fenêtre ouverte. Vérifie l'icône MetaMask dans ton navigateur.");
    }
    // 4001 : l'utilisateur a refusé
    if (e.code === 4001) return;
    throw e;
  }

  const chainId = await window.ethereum.request({ method: "eth_chainId" });
  if (chainId !== BESU_CHAIN_ID) {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BESU_CHAIN_ID }],
      });
    } catch (e) {
      if (e.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: BESU_CHAIN_ID,
            chainName: "Diploma Besu",
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: ["http://127.0.0.1:8545"],
          }],
        });
      } else if (e.code !== 4001) {
        throw e;
      }
    }
  }
}

export async function getContract() {
  if (window.ethereum) {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    if (!accounts || accounts.length === 0) {
      throw new Error("Wallet non connecté. Clique sur 'Connecter'.");
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(contractAddress, abi, signer);
  } else {
    const provider = new ethers.JsonRpcProvider("http://localhost:3001/rpc");
    const signer = new ethers.Wallet(BESU_TEST_PRIVATE_KEY, provider);
    return new ethers.Contract(contractAddress, abi, signer);
  }
}

export async function getReadOnlyContract() {
  const provider = window.ethereum
    ? new ethers.BrowserProvider(window.ethereum)
    : new ethers.JsonRpcProvider("http://localhost:3001/rpc");
  return new ethers.Contract(contractAddress, abi, provider);
}

export async function verifyCredentialByHash(credentialHash) {
  const contract = await getReadOnlyContract();
  try {
    const result = await contract.verifyCredentialByHash(credentialHash);
    return {
      isValid: result[0],
      credentialData: {
        id: result[1].id,
        issuer: result[1].issuer,
        holder: result[1].holder,
        holderName: result[1].holderName,
        credentialURI: result[1].credentialURI,
        credentialHash: result[1].credentialHash,
        credentialType: result[1].credentialType,
        status: result[1].status,
        issueDate: result[1].issueDate,
        expiryDate: result[1].expiryDate,
        institutionName: result[1].institutionName,
        fieldOfStudy: result[1].fieldOfStudy,
      },
    };
  } catch (error) {
    console.error("Erreur vérification:", error);
    throw new Error("Diplôme non trouvé ou erreur de vérification");
  }
}

// ─── Fonctions Ministère ──────────────────────────────────────────────────────

export async function authorizeIssuer(address, institutionName) {
  const contract = await getContract();
  const tx = await contract.authorizeIssuer(address, institutionName);
  return tx.wait();
}

export async function removeIssuer(address) {
  const contract = await getContract();
  const tx = await contract.removeIssuer(address);
  return tx.wait();
}

export async function approveCredential(credentialId) {
  const contract = await getContract();
  const tx = await contract.approveCredential(credentialId);
  return tx.wait();
}

export async function rejectCredential(credentialId, reason) {
  const contract = await getContract();
  const tx = await contract.rejectCredential(credentialId, reason);
  return tx.wait();
}

export async function getMinistryData() {
  const contract = await getReadOnlyContract();
  const issuerAddresses = await contract.getAllIssuers();
  const issuers = await Promise.all(
    issuerAddresses.map(async (addr) => ({
      address: addr,
      name: await contract.issuerNames(addr),
      isActive: await contract.authorizedIssuers(addr),
    }))
  );

  const total = Number(await contract.getTotalCredentialsCount());
  const ids = Array.from({ length: total }, (_, i) => i);
  const allCredentials = await Promise.all(ids.map((i) => contract.getCredential(i)));

  const mapped = allCredentials.map((c, i) => ({
    id:             i,
    holderName:     c.holderName,
    institutionName:c.institutionName,
    fieldOfStudy:   c.fieldOfStudy,
    credentialType: c.credentialType,
    issueDate:      c.issueDate,
    status:         c.status,
    issuer:         c.issuer,
    holder:         c.holder,
  }));

  const pending = mapped.filter((c) => Number(c.status) === 0);

  return { issuers, pending, allCredentials: mapped, totalCredentials: total };
}

export async function checkMinistryRole() {
  const contract = await getContract();
  const address = await contract.runner.getAddress();
  const MINISTRY_ROLE = await contract.MINISTRY_ROLE();
  return contract.hasRole(MINISTRY_ROLE, address);
}
