//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./EventRegistryMock.sol";

/// @author @solenemep
/// @title EventRegistryMock2
/// @notice Registers all event addresses
/// @notice Carries ownable set up of events

contract EventRegistryMock2 is EventRegistryMock {
    function random() external pure returns (uint256) {
        return 24102023;
    }
}
