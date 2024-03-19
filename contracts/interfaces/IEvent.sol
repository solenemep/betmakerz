//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

interface IEvent {
    enum Result {
        NONE, // no result has been communicated
        NULL, // event has been canceled or all bets are on same pool
        WIN // one pool is winner
    }

    struct PoolInfo {
        EnumerableSet.AddressSet bettorAddresses;
        uint256 treasury;
    }
}
