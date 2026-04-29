const { ethers } = require("hardhat");

async function main() {
  const address = process.argv[process.argv.length - 1];
  if (!ethers.isAddress(address)) {
    console.error("Usage: npx hardhat run scripts/fund-account.js --network besuLocal <adresse>");
    process.exit(1);
  }
  const [deployer] = await ethers.getSigners();
  const tx = await deployer.sendTransaction({ to: address, value: ethers.parseEther("2") });
  await tx.wait();
  console.log(`✅ 2 ETH envoyés à ${address}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
