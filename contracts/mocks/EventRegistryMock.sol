//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../EventRegistry.sol";

/// @author @solenemep
/// @title EventRegistryMock
/// @notice Registers all event addresses
/// @notice Carries ownable set up of events

contract EventRegistryMock is EventRegistry {
    function stopBets(address eventAddress) external view returns (uint256) {
        return _stopBets[eventAddress];
    }
}
