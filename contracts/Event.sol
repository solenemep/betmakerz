//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "./interfaces/IEvent.sol";

import "./interfaces/IEventRegistry.sol";

/// @author @solenemep
/// @title Event
/// @notice Represents one game

/// EventOption unallow bets
error CannotBet();

/// Sender must be admin from EventRegistry
error NotEventRegistry();

contract Event is IEvent {
    using EnumerableSet for EnumerableSet.AddressSet;

    address internal _eventRegistry;

    EnumerableSet.AddressSet internal _bettorAddresses;
    mapping(address => BetInfo) public betInfo;

    mapping(Team => PoolInfo) public poolInfo;

    modifier onlyEventRegistry() {
        if (msg.sender != _eventRegistry) {
            revert NotEventRegistry();
        }
        _;
    }

    constructor() {
        _eventRegistry = msg.sender;
    }

    // =============
    // ||   BET   ||
    // =============

    function placeBet(uint256 betAmount) external {
        if (!IEventRegistry(_eventRegistry).canBet()) {
            revert CannotBet();
        }
    }

    // ====================
    // ||   GAME BOARD   ||
    // ====================

    function potentialGain(address bettor, Team team) external view returns (uint256) {}

    function poolShare(Team team) external view returns (uint256) {}

    // =================
    // ||   CLOSURE   ||
    // =================

    function endEvent() external onlyEventRegistry {}

    function cancelEvent() external onlyEventRegistry {}
}
