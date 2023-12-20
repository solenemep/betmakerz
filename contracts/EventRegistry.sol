//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "./libraries/UncheckedMath.sol";
import "./libraries/Listing.sol";

import "./interfaces/IEventRegistry.sol";

import "./Event.sol";

/// @author @solenemep
/// @title EventRegistry
/// @notice Registers all event addresses
/// @notice Carries ownable set up of events

/// Event has already been closed
error AlreadyClosed();

contract EventRegistry is IEventRegistry, AccessControlUpgradeable {
    using EnumerableSet for EnumerableSet.AddressSet;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    address public tokenAddress;

    EnumerableSet.AddressSet internal _eventAddresses;
    EnumerableSet.AddressSet internal _openEventAddresses;
    mapping(address => uint256) internal _stopBets;

    uint256 public override commissionPercentage;

    event EventCreated(address indexed eventAddress);
    event EventCanceled(address indexed eventAddress);
    event EventEnded(address indexed eventAddress, uint256 indexed winnerTeamID);

    modifier eventOpened(address eventAddress) {
        if (!_openEventAddresses.contains(eventAddress)) {
            revert AlreadyClosed();
        }
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address owner, address _tokenAddress) external initializer {
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, owner);

        tokenAddress = _tokenAddress;
        commissionPercentage = 10;
    }

    // =================
    // ||   LISTING   ||
    // =================

    // TODO natspec
    function countEvents() external view returns (uint256) {
        return _eventAddresses.length();
    }

    // TODO natspec
    function countOpenEvents() external view returns (uint256) {
        return _openEventAddresses.length();
    }

    // TODO natspec
    /// @notice use with countEvents()
    function listEvents(uint256 offset, uint256 limit) external view returns (address[] memory eventList) {
        return Listing.listAdd(offset, limit, _eventAddresses);
    }

    // TODO natspec
    /// @notice use with countOpenEvents()
    function listOpenEvents(uint256 offset, uint256 limit) external view returns (address[] memory eventList) {
        return Listing.listAdd(offset, limit, _openEventAddresses);
    }

    // ==================
    // ||   SETTINGS   ||
    // ==================

    // TODO natspec
    function setTokenAddress(address newTokenAddress) external onlyRole(ADMIN_ROLE) {
        tokenAddress = newTokenAddress;
    }

    // TODO natspec
    function setCommissionPercentage(uint256 newCommissionPercentage) external onlyRole(ADMIN_ROLE) {
        commissionPercentage = newCommissionPercentage;
    }

    // TODO natspec
    function enableBet(address eventAddress) external onlyRole(ADMIN_ROLE) {
        if (_stopBets[eventAddress] != 0) {
            _betAllowance(eventAddress, 0);
        }
    }

    // TODO natspec
    function disableBet(address eventAddress) external onlyRole(ADMIN_ROLE) {
        if (_stopBets[eventAddress] == 0 || block.timestamp <= _stopBets[eventAddress]) {
            _betAllowance(eventAddress, block.timestamp);
        }
    }

    // TODO natspec
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

    // TODO natspec
    function canBet(address eventAddress) public view override returns (bool) {
        if (_stopBets[eventAddress] == 0 || block.timestamp < _stopBets[eventAddress]) {
            return true;
        }
    }

    // ================
    // ||   EVENTS   ||
    // ================

    // TODO natspec
    function createEvent(uint256 nbTeam) external onlyRole(ADMIN_ROLE) {
        Event eventContract = new Event(tokenAddress, commissionPercentage, nbTeam);
        address eventAddress = address(eventContract);

        _eventAddresses.add(eventAddress);
        _openEventAddresses.add(eventAddress);

        emit EventCreated(eventAddress);
    }

    // TODO natspec
    function cancelEvent(address eventAddress) external onlyRole(ADMIN_ROLE) eventOpened(eventAddress) {
        Event(eventAddress).closeEvent(0);
        _closeEvent(eventAddress);

        emit EventCanceled(eventAddress);
    }

    // TODO natspec
    function endEvent(address eventAddress, uint256 result) external onlyRole(ADMIN_ROLE) eventOpened(eventAddress) {
        Event(eventAddress).closeEvent(result);
        _closeEvent(eventAddress);

        emit EventEnded(eventAddress, result);
    }

    function _closeEvent(address eventAddress) internal {
        if (canBet(eventAddress)) {
            _stopBets[eventAddress] = block.timestamp;
        }
        _openEventAddresses.remove(eventAddress);
    }
}
