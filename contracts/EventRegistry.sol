//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

import "./libraries/UncheckedMath.sol";

import "./interfaces/IEventRegistry.sol";

import "./Event.sol";

/// @author @solenemep
/// @title EventRegistry
/// @notice Registers all event addresses
/// @notice Carries ownable set up of events

contract EventRegistry is IEventRegistry, AccessControlUpgradeable {
    using EnumerableSet for EnumerableSet.AddressSet;
    using UncheckedMath for uint256;
    using Math for uint256;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    EnumerableSet.AddressSet internal _eventAddresses;
    mapping(address => uint256) internal _stopBets;

    event EventCreated(address indexed eventAddress);
    event EventEnded(address indexed eventAddress);
    event EventCanceled(address indexed eventAddress);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address owner) external initializer {
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, owner);
    }

    // =================
    // ||   LISTING   ||
    // =================

    function countEvents() external view returns (uint256) {
        return _eventAddresses.length();
    }

    /// @notice use with count()
    function listEvents(uint256 offset, uint256 limit) external view returns (address[] memory eventList) {
        return _list(offset, limit, _eventAddresses);
    }

    function _list(
        uint256 offset,
        uint256 limit,
        EnumerableSet.AddressSet storage set
    ) internal view returns (address[] memory eventList) {
        uint256 to = (offset.uncheckedAdd(limit)).min(set.length()).max(offset);

        eventList = new address[](to.uncheckedSub(offset));

        for (uint256 i = offset; i < to; i++) {
            uint256 index = i.uncheckedSub(offset);
            eventList[index] = set.at(i);
        }
    }

    // ==================
    // ||   SETTINGS   ||
    // ==================

    function enableBet(address eventAddress) external onlyRole(ADMIN_ROLE) {
        if (_stopBets[eventAddress] != 0) {
            _betAllowance(eventAddress, 0);
        }
    }

    function disableBet(address eventAddress) external onlyRole(ADMIN_ROLE) {
        if (_stopBets[eventAddress] == 0 || block.timestamp <= _stopBets[eventAddress]) {
            _betAllowance(eventAddress, block.timestamp);
        }
    }

    function disableBetAtDate(address eventAddress, uint256 stopBets) external onlyRole(ADMIN_ROLE) {
        if (
            block.timestamp <= stopBets && (_stopBets[eventAddress] == 0 || block.timestamp <= _stopBets[eventAddress])
        ) {
            _betAllowance(eventAddress, stopBets);
        }
    }

    function _betAllowance(address eventAddress, uint256 stopBets) internal {
        _stopBets[eventAddress] = stopBets;
    }

    // ================
    // ||   STATUS   ||
    // ================

    function canBet() external view override returns (bool) {
        _canBet(msg.sender);
    }

    function _canBet(address eventAddress) internal view returns (bool) {
        if (_stopBets[eventAddress] == 0 || block.timestamp < _stopBets[eventAddress]) {
            return true;
        }
    }

    // ================
    // ||   EVENTS   ||
    // ================

    function createEvent() external onlyRole(ADMIN_ROLE) {
        Event eventContract = new Event();
        address eventAddress = address(eventContract);
        _eventAddresses.add(eventAddress);

        emit EventCreated(eventAddress);
    }

    function endEvent(address eventAddress) external onlyRole(ADMIN_ROLE) {
        Event(eventAddress).endEvent();
        _closeEvent(eventAddress);

        emit EventEnded(eventAddress);
    }

    function cancelEvent(address eventAddress) external onlyRole(ADMIN_ROLE) {
        Event(eventAddress).cancelEvent();
        _closeEvent(eventAddress);

        emit EventCanceled(eventAddress);
    }

    function _closeEvent(address eventAddress) internal {
        if (_canBet(eventAddress)) {
            _stopBets[eventAddress] = block.timestamp;
        }
    }
}
