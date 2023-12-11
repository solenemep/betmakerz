//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

import "../Event.sol";

/// @author @solenemep
/// @title EventMock
/// @notice Represents one game

contract EventMock is Event {
    constructor(address tokenAddress) Event(tokenAddress) {}
}
