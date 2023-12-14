//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

interface IEventRegistry {
    enum Result {
        NO_WIN,
        WIN_A,
        WIN_B
    }

    function commissionPercentage() external view returns (uint256);

    function canBet(address eventAddress) external view returns (bool);
}
