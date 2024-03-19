const { ethers, upgrades } = require('hardhat');
const { toWei } = web3.utils;

const args = process.env;

const ADMIN_ROLE = web3.utils.soliditySha3('ADMIN_ROLE');
const to = [
  '0xA2931862BbEecDdC6b42208ea741Ad73fcb6fcb3',
  '0xD73ee5C55F943B3695AAB2743c00a3F2C7F62798',
  '0xd3E81c4950D6C7a2673ab9cBb98E6DD57522334f',
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with the account:', deployer.address);

  // deploy USDTMock
  const usdt = await ethers.deployContract('USDTMock', [deployer.address]);
  await usdt.waitForDeployment();
  console.log('USDTMock deployed at : ', await usdt.getAddress());

  // deploy EventRegistry
  const EventRegistry = await ethers.getContractFactory('EventRegistry');
  const eventRegistry = await upgrades.deployProxy(EventRegistry, [deployer.address, await usdt.getAddress()]);
  await eventRegistry.waitForDeployment();
  console.log('EventRegistry deployed at : ', await eventRegistry.getAddress());

  // grant roles
  await eventRegistry.grantRole(ADMIN_ROLE, to[0]);
  console.log(`ADMIN_ROLE granted to ${to[0]}`);
  await eventRegistry.grantRole(ADMIN_ROLE, to[1]);
  console.log(`ADMIN_ROLE granted to ${to[1]}`);
  await eventRegistry.grantRole(ADMIN_ROLE, to[2]);
  console.log(`ADMIN_ROLE granted to ${to[2]}`);

  // transfer tokens
  await usdt.transfer(to[0], toWei('100000'));
  console.log(`100000USDT transfered to ${to[0]}`);
  await usdt.transfer(to[1], toWei('100000'));
  console.log(`100000USDT transfered to ${to[1]}`);
  await usdt.transfer(to[2], toWei('100000'));
  console.log(`100000USDT transfered to ${to[2]}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
