import "@nomicfoundation/hardhat-toolbox";

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Local Hyperledger Besu network
    besuLocal: {
      url: "http://127.0.0.1:8545",
      accounts: [
        "0x8f2a55949038a9610f50fb23b5883af3521923d8b0c8eef1d6b0f40d35bfb8ed", // Additional account 1
      ],
      chainId: 1337,
      gasPrice: 0,
      gas: 9000000,
    },

    // Besu test network (multiple nodes)
    besuTestNet: {
      url: "http://127.0.0.1:8545",
      accounts: [
        "0x8f2a55949038a9610f50fb23b5883af3521923d8b0c8eef1d6b0f40d35bfb8ed",
        "0x59c6995e998f97a5a0044966f0945389dc9e86dae037f92a6ae7b48f9e2c5a639", // Additional account 2
        "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", // Additional account 3
        "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", // Additional account 4
        "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a", // Additional account 5
      ],
      chainId: 1337,
      gasPrice: 0,
      gas: 9000000,
    },

    // Local Hardhat network
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
    },
  },
  paths: {
    sources: "./smart-contracts/contracts",
    tests: "./smart-contracts/test",
    cache: "./smart-contracts/cache",
    artifacts: "./smart-contracts/artifacts",
    deployments: "./smart-contracts/deployments",
  },
};