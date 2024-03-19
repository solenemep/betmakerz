//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IEventRegistry {
    function ownerAddress() external view returns (address);

    function canBet(address eventAddress) external view returns (bool);
}
