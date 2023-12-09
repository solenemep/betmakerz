//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

interface IEventRegistry {
    function canBet(address eventAddress) external view returns (bool);
}
