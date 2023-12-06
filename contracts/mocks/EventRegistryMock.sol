//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

import "../EventRegistry.sol";

import "./EventMock.sol";

/// @author @solenemep
/// @title EventRegistryMock
/// @notice Registers all event addresses
/// @notice Carries ownable set up of events

contract EventRegistryMock is EventRegistry {
    function stopBets(address eventAddress) external view returns (uint256) {
        return _stopBets[eventAddress];
    }

    function canBetMock(address eventAddress) external view returns (bool) {
        return _canBet(eventAddress);
    }
}