require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
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
        "0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3", // 0x627306090abaB3A6e1400e9345bC60c78a8BEf57
        "0xae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f",  // 0xf17f52151EbEF6C7334FAD080c5704D77216b732
      ],
      chainId: 1337,
    },

    // Besu test network (multiple nodes)
    besuTestNet: {
      url: "http://127.0.0.1:8545",
      accounts: [
        "0x8f2a55949038a9610f50fb23b5883af3521923d8b0c8eef1d6b0f40d35bfb8ed",
      ],
      chainId: 2018,
    },

    // For testing with Ganache as fallback
    hardhat: {
      chainId: 1337,
      hardfork: "istanbul",
      gasPrice: 0,
    },
  },

  // Etherscan verification (if needed for public networks)
  etherscan: {
    apiKey: {
      // Add API keys if using public testnets
    },
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  // Mocha test settings
  mocha: {
    timeout: 40000,
  },
};
