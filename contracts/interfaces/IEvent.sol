//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

interface IEvent {
    struct PoolInfo {
        EnumerableSet.AddressSet bettorAddresses;
        uint256 treasury;
    }
}
