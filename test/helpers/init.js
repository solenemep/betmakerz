const { ethers, upgrades } = require('hardhat');

const args = process.env;

const init = async () => {
  const users = await ethers.getSigners();

  // deploy usdt mock
  const usdt = await ethers.deployContract('USDTMock', [users[0].address]);
  await usdt.waitForDeployment();

  // deploy EventRegistry
  const EventRegistry = await ethers.getContractFactory('EventRegistryMock');
  const eventRegistry = await upgrades.deployProxy(EventRegistry, [users[0].address, await usdt.getAddress()]);
  await eventRegistry.waitForDeployment();
  console.log('EventRegistry deployed at : ', await eventRegistry.getAddress());

  return {
    users,
    usdt,
    eventRegistry,
  };
};

module.exports.init = init;
