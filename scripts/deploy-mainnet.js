const { ethers, upgrades } = require('hardhat');

const args = process.env;

const ADMIN_ROLE = web3.utils.soliditySha3('ADMIN_ROLE');
const to = ['0x379124A8c80212851Ae34450c6939B2469fa6244', '0xF9b9c8eeb886C7a3CfF7B7F7600a32a4B80DC6fe'];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with the account:', deployer.address);

  // // deploy EventRegistry
  const EventRegistry = await ethers.getContractFactory('EventRegistry');
  const eventRegistry = await upgrades.deployProxy(EventRegistry, [args.DEPLOYER_WALLET, args.USDT_ADDRESS]);
  await eventRegistry.waitForDeployment();
  console.log('EventRegistry deployed at : ', await eventRegistry.getAddress());

  // // grant roles
  await eventRegistry.grantRole(ADMIN_ROLE, to[0]);
  console.log(`ADMIN_ROLE granted to ${to[0]}`);
  await eventRegistry.grantRole(ADMIN_ROLE, to[1]);
  console.log(`ADMIN_ROLE granted to ${to[1]}`);

  // change ownerAddress
  await eventRegistry.setOwnerAddress(args.OWNER_ADDRESS);
  console.log(`ownerAddress sets to ${args.OWNER_ADDRESS}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
