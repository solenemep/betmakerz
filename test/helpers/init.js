const { ethers, upgrades } = require('hardhat');

const args = process.env;

const init = async () => {
  const users = await ethers.getSigners();

  // deploy usdt mock
  const usdt = '';

  // deploy EventRegistry
  const EventRegistry = await ethers.getContractFactory('EventRegistryMock');
  const eventRegistry = await upgrades.deployProxy(EventRegistry, [users[0].address]);
  await eventRegistry.waitForDeployment();
  console.log('EventRegistry deployed to : ', await eventRegistry.getAddress());

  return {
    users,
    usdt,
    eventRegistry,
  };
};

module.exports.init = init;
