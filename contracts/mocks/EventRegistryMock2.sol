//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

import "./EventRegistryMock.sol";

/// @author @solenemep
/// @title EventRegistryMock
/// @notice Registers all event addresses
/// @notice Carries ownable set up of events

contract EventRegistryMock2 is EventRegistryMock {
    function random() external pure returns (uint256) {
        return 24102023;
    }
}
