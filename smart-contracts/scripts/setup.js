const fs = require("fs");
const path = require("path");

async function main() {
  // Load deployment addresses
  const deploymentsDir = path.join(__dirname, "../deployments");
  let deploymentAddresses = {};

  // Find deployment file for current network
  const files = fs.readdirSync(deploymentsDir);
  const deploymentFile = files.find((f) => f.endsWith("-deployment.json"));

  if (deploymentFile) {
    const deploymentPath = path.join(deploymentsDir, deploymentFile);
    deploymentAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  }

  console.log("\n========================================");
  console.log("Setting Up Diploma Verification System");
  console.log("========================================\n");

  const [admin, issuer1, issuer2, verifier1, verifier2, holder1] =
    await ethers.getSigners();

  console.log("Admin Address:", admin.address);
  console.log("Test Issuer 1:", issuer1.address);
  console.log("Test Issuer 2:", issuer2.address);
  console.log("Test Verifier 1:", verifier1.address);
  console.log("Test Verifier 2:", verifier2.address);
  console.log("Test Holder 1:", holder1.address);
  console.log();

  // Connect to deployed contracts
  const DiplomaRegistry = await ethers.getContractAt(
    "DiplomaRegistry",
    deploymentAddresses.DiplomaRegistry
  );
  const IssuerRegistry = await ethers.getContractAt(
    "IssuerRegistry",
    deploymentAddresses.IssuerRegistry
  );
  const CredentialVerifier = await ethers.getContractAt(
    "CredentialVerifier",
    deploymentAddresses.CredentialVerifier
  );

  // 1. Register Issuers
  console.log("1. Registering Authorized Issuers...\n");

  const issuers = [
    {
      address: issuer1.address,
      name: "University of Paris",
      email: "registry@universite-paris.fr",
      website: "https://www.universite-paris.fr",
      country: "France",
      type: 0, // UNIVERSITY
      docURI: "QmUniParis123456789", // Sample IPFS hash
    },
    {
      address: issuer2.address,
      name: "National Engineering School",
      email: "diplomas@esn.fr",
      website: "https://www.esn.fr",
      country: "France",
      type: 0, // UNIVERSITY
      docURI: "QmESN987654321", // Sample IPFS hash
    },
  ];

  for (const issuer of issuers) {
    try {
      const tx = await IssuerRegistry.registerIssuer(
        issuer.address,
        issuer.name,
        issuer.email,
        issuer.website,
        issuer.country,
        issuer.type,
        issuer.docURI
      );
      await tx.wait();
      console.log(`   ✓ Registered: ${issuer.name}`);
    } catch (error) {
      console.log(`   ✗ Error registering ${issuer.name}:`, error.message);
    }
  }

  console.log();

  // 2. Authorize Issuers in DiplomaRegistry
  console.log("2. Authorizing Issuers in DiplomaRegistry...\n");

  for (const issuer of issuers) {
    try {
      const tx = await DiplomaRegistry.authorizeIssuer(
        issuer.address,
        issuer.name
      );
      await tx.wait();
      console.log(`   ✓ Authorized: ${issuer.name}`);
    } catch (error) {
      console.log(`   ✗ Error authorizing ${issuer.name}:`, error.message);
    }
  }

  console.log();

  // 3. Register Verifiers
  console.log("3. Registering Verifiers...\n");

  const verifiers = [
    {
      address: verifier1.address,
      name: "Tech Company HR",
    },
    {
      address: verifier2.address,
      name: "University Admissions",
    },
  ];

  for (const verifier of verifiers) {
    try {
      const tx = await CredentialVerifier.registerVerifier(
        verifier.address,
        verifier.name
      );
      await tx.wait();
      console.log(`   ✓ Registered Verifier: ${verifier.name}`);
    } catch (error) {
      console.log(
        `   ✗ Error registering verifier ${verifier.name}:`,
        error.message
      );
    }
  }

  console.log("\n========================================");
  console.log("Setup Complete!");
  console.log("========================================");
  console.log("\nSetup Summary:");
  console.log(`  - Issuers registered: ${issuers.length}`);
  console.log(`  - Issuers authorized: ${issuers.length}`);
  console.log(`  - Verifiers registered: ${verifiers.length}`);
  console.log("\nTest Accounts:");
  console.log(`  Admin: ${admin.address}`);
  console.log(`  Issuer 1: ${issuer1.address}`);
  console.log(`  Issuer 2: ${issuer2.address}`);
  console.log(`  Verifier 1: ${verifier1.address}`);
  console.log(`  Verifier 2: ${verifier2.address}`);
  console.log(`  Holder 1: ${holder1.address}`);
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Setup failed:", error);
    process.exit(1);
  });
