const { ethers } = require("hardhat");

const CONTRACT = "0xf25186B5081Ff5cE73482AD761DB0eB0d25abfBF";

const MINISTRY_ADDRESS    = "0xC2d1d2E1Ac203a17CBE2C6f3CEc6764aaaA83268";
const UNIVERSITY_ADDRESS  = "0x26eE2A909C3543E906552e3BA61D89E2cc8a918b";
const YASSINE_ADDRESS     = "0x5067593C61E4F43C790c10763cB6023bc8d8664c";
const MOUAD_ADDRESS       = "0x3203799afbaafb484f37F9924a42f2BB2B1A67fE";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer :", deployer.address);

  const contract = await ethers.getContractAt("DiplomaRegistry", CONTRACT);
  const MINISTRY_ROLE = await contract.MINISTRY_ROLE();

  // ── 1. Accorder MINISTRY_ROLE ──────────────────────────────────────────────
  console.log("\n[1/5] Accord du MINISTRY_ROLE à", MINISTRY_ADDRESS);
  const tx1 = await contract.grantRole(MINISTRY_ROLE, MINISTRY_ADDRESS);
  await tx1.wait();
  console.log("      ✅ MINISTRY_ROLE accordé");

  // ── 2. Financer les comptes (gas) ─────────────────────────────────────────
  const amount = ethers.parseEther("2");

  for (const [label, addr] of [
    ["Ministère",   MINISTRY_ADDRESS],
    ["Université",  UNIVERSITY_ADDRESS],
    ["Yassine",     YASSINE_ADDRESS],
    ["Mouad",       MOUAD_ADDRESS],
  ]) {
    const balance = await ethers.provider.getBalance(addr);
    if (balance < ethers.parseEther("0.5")) {
      console.log(`[ETH] Envoi de 2 ETH vers ${label} (${addr})`);
      const tx = await deployer.sendTransaction({ to: addr, value: amount });
      await tx.wait();
      console.log(`      ✅ Financé`);
    } else {
      console.log(`[ETH] ${label} déjà financé (${ethers.formatEther(balance)} ETH)`);
    }
  }

  // ── 3. Vérification finale ─────────────────────────────────────────────────
  console.log("\n── Vérification des rôles ──────────────────────────────────────");
  const ISSUER_ROLE = await contract.ISSUER_ROLE();
  for (const [label, addr] of [
    ["Ministère",  MINISTRY_ADDRESS],
    ["Université", UNIVERSITY_ADDRESS],
    ["Yassine",    YASSINE_ADDRESS],
    ["Mouad",      MOUAD_ADDRESS],
  ]) {
    const m = await contract.hasRole(MINISTRY_ROLE, addr);
    const i = await contract.hasRole(ISSUER_ROLE,   addr);
    console.log(`  ${label.padEnd(12)} | MINISTRY: ${String(m).padEnd(5)} | ISSUER: ${i}`);
  }

  console.log("\n✅ Setup terminé. Le Ministère peut maintenant accréditer les universités via le dashboard.");
}

main().catch((e) => { console.error(e); process.exit(1); });
