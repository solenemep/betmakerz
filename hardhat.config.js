require('@openzeppelin/hardhat-upgrades');
require('@nomicfoundation/hardhat-chai-matchers');
require('@nomicfoundation/hardhat-ethers');
require('@nomiclabs/hardhat-web3');
require('hardhat-contract-sizer');
// require('hardhat-gas-reporter');

require('dotenv').config();
const args = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: '0.8.20',
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
  },
  etherscan: {
    apiKey: args.ETHERSCAN_API_KEY,
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 1000,
    },
  },
};
