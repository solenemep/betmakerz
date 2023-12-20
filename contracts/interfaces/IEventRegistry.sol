//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

interface IEventRegistry {
    function commissionPercentage() external view returns (uint256);

    function canBet(address eventAddress) external view returns (bool);
}
