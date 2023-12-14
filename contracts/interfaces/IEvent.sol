//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

interface IEvent {
    enum Team {
        TEAM_A,
        TEAM_B
    }

    struct PoolInfo {
        EnumerableSet.AddressSet bettorAddresses;
        uint256 treasury;
    }
}
