const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("\n========================================");
  console.log("Deploying Diploma Verification Contracts");
  console.log("========================================\n");

  console.log(`Deployer Address: ${deployer.address}`);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer Balance: ${ethers.formatEther(balance)} ETH\n`);

  // Deploy DiplomaRegistry
  // Ministry address — compte dédié séparé du déployeur
  const MINISTRY_ADDRESS = "0xf17f52151EbEF6C7334FAD080c5704D77216b732";

  console.log("1. Deploying DiplomaRegistry...");
  console.log(`   Ministry address: ${MINISTRY_ADDRESS}`);
  const DiplomaRegistry = await ethers.getContractFactory("DiplomaRegistry");
  const diplomaRegistry = await DiplomaRegistry.deploy(MINISTRY_ADDRESS);
  await diplomaRegistry.waitForDeployment();

  console.log(`   ✓ DiplomaRegistry deployed at: ${await diplomaRegistry.getAddress()}`);

  // Deploy IssuerRegistry
  console.log("\n2. Deploying IssuerRegistry...");
  const IssuerRegistry = await ethers.getContractFactory("IssuerRegistry");
  const issuerRegistry = await IssuerRegistry.deploy();
  await issuerRegistry.waitForDeployment();

  console.log(`   ✓ IssuerRegistry deployed at: ${await issuerRegistry.getAddress()}`);

  // Deploy CredentialVerifier
  console.log("\n3. Deploying CredentialVerifier...");
  const CredentialVerifier = await ethers.getContractFactory("CredentialVerifier");
  const credentialVerifier = await CredentialVerifier.deploy();
  await credentialVerifier.waitForDeployment();

  console.log(`   ✓ CredentialVerifier deployed at: ${await credentialVerifier.getAddress()}`);

  // Save deployment addresses
  const diplomaAddress = await diplomaRegistry.getAddress();
  const issuerAddress = await issuerRegistry.getAddress();
  const verifierAddress = await credentialVerifier.getAddress();

  const deploymentAddresses = {
    network: "Hardhat Local",
    deployer: deployer.address,
    DiplomaRegistry: diplomaAddress,
    IssuerRegistry: issuerAddress,
    CredentialVerifier: verifierAddress,
    deploymentDate: new Date().toISOString(),
  };

  const deploymentPath = path.join(
    __dirname,
    "../deployments",
    `hardhat-deployment.json`
  );

  // Create deployments directory if it doesn't exist
  if (!fs.existsSync(path.join(__dirname, "../deployments"))) {
    fs.mkdirSync(path.join(__dirname, "../deployments"), { recursive: true });
  }

  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentAddresses, null, 2));

  console.log("\n========================================");
  console.log("Deployment Summary");
  console.log("========================================");
  console.log(JSON.stringify(deploymentAddresses, null, 2));
  console.log("\nDeployment addresses saved to:", deploymentPath);
  console.log("\n✓ All contracts deployed successfully!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
