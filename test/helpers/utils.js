const { time } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants.js');
const { takeSnapshot } = require('@nomicfoundation/hardhat-network-helpers');
const BigNumber = require('bignumber.js');
const { toWei } = web3.utils;

let _snapshot;
async function snapshot() {
  _snapshot = await takeSnapshot();
}
async function restore() {
  await _snapshot.restore();
}

function toBN(number) {
  return new BigNumber(number);
}

async function getCosts(tx) {
  const receipt = await web3.eth.getTransactionReceipt(tx.hash);
  const gasUsed = receipt.gasUsed;
  const gasPrice = Number(tx.gasPrice);
  const gasCost = toBN(gasUsed).times(gasPrice);
  console.log('gas used : ' + gasUsed);
  console.log(
    'gas price : ' +
      toBN(gasPrice)
        .div(10 ** 18)
        .toFixed()
        .toString() +
      ' ETH'
  );
  console.log(
    'tx cost : ' +
      toBN(gasCost)
        .div(10 ** 18)
        .toFixed()
        .toString() +
      ' ETH'
  );
}

async function getCurrentBlockTimestamp() {
  return (await web3.eth.getBlock('latest')).timestamp;
}

async function increaseTime(duration) {
  await time.increase(duration);
}

async function increaseTimeTo(target) {
  await time.increaseTo(target);
}

module.exports = {
  ZERO_ADDRESS,
  toWei,
  snapshot,
  restore,
  toBN,
  getCosts,
  getCurrentBlockTimestamp,
  increaseTime,
  increaseTimeTo,
};
