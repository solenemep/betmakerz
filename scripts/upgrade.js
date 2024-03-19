const { ethers, upgrades } = require('hardhat');

const args = process.env;

async function main() {
  // upgrade EventRegistry
  const EventRegistry = await ethers.getContractFactory('EventRegistry');
  const eventRegistry = await upgrades.upgradeProxy(args.REGISTRY, EventRegistry);
  console.log('EventRegistry upgraded at : ', await eventRegistry.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
