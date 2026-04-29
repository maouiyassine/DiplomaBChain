const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("\n==========================================");
  console.log("  Déploiement sur Hyperledger Besu");
  console.log("==========================================\n");

  console.log(`Deployer  : ${deployer.address}`);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance   : ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    throw new Error("Le compte deployer n'a pas de fonds. Vérifiez que Besu tourne en mode dev.");
  }

  const network = await ethers.provider.getNetwork();
  console.log(`Réseau    : chainId=${network.chainId}\n`);

  // 1. DiplomaRegistry
  console.log("1. Déploiement de DiplomaRegistry...");
  const DiplomaRegistry = await ethers.getContractFactory("DiplomaRegistry");
  const diplomaRegistry = await DiplomaRegistry.deploy();
  await diplomaRegistry.waitForDeployment();
  const diplomaAddress = await diplomaRegistry.getAddress();
  console.log(`   ✅ DiplomaRegistry : ${diplomaAddress}`);

  // 2. IssuerRegistry
  console.log("\n2. Déploiement de IssuerRegistry...");
  const IssuerRegistry = await ethers.getContractFactory("IssuerRegistry");
  const issuerRegistry = await IssuerRegistry.deploy();
  await issuerRegistry.waitForDeployment();
  const issuerAddress = await issuerRegistry.getAddress();
  console.log(`   ✅ IssuerRegistry  : ${issuerAddress}`);

  // 3. CredentialVerifier
  console.log("\n3. Déploiement de CredentialVerifier...");
  const CredentialVerifier = await ethers.getContractFactory("CredentialVerifier");
  const credentialVerifier = await CredentialVerifier.deploy();
  await credentialVerifier.waitForDeployment();
  const verifierAddress = await credentialVerifier.getAddress();
  console.log(`   ✅ CredentialVerifier : ${verifierAddress}`);

  // Sauvegarde des adresses
  const deployment = {
    network: "Hyperledger Besu (dev)",
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    DiplomaRegistry: diplomaAddress,
    IssuerRegistry: issuerAddress,
    CredentialVerifier: verifierAddress,
    deploymentDate: new Date().toISOString(),
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });

  const deploymentPath = path.join(deploymentsDir, "besu-deployment.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log(`\n📄 Adresses sauvegardées dans : deployments/besu-deployment.json`);

  // Mise à jour automatique de src/utils/blockchain.js
  const blockchainJsPath = path.join(__dirname, "../../src/utils/blockchain.js");
  if (fs.existsSync(blockchainJsPath)) {
    let content = fs.readFileSync(blockchainJsPath, "utf8");
    content = content.replace(
      /const contractAddress = ".*?";/,
      `const contractAddress = "${diplomaAddress}"; // Besu deployment ${new Date().toISOString()}`
    );
    fs.writeFileSync(blockchainJsPath, content);
    console.log(`🔗 blockchain.js mis à jour avec l'adresse du contrat`);
  }

  console.log("\n==========================================");
  console.log("  ✅ Déploiement terminé avec succès !");
  console.log("==========================================\n");
  console.log("Résumé :");
  console.log(`  DiplomaRegistry   : ${diplomaAddress}`);
  console.log(`  IssuerRegistry    : ${issuerAddress}`);
  console.log(`  CredentialVerifier: ${verifierAddress}`);
  console.log("\nProchaine étape : npm run besu:setup\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Déploiement échoué :", error.message);
    process.exit(1);
  });
