//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "./libraries/Listing.sol";

import "./interfaces/IEventRegistry.sol";

import "./Event.sol";

/// @author @solenemep
/// @title EventRegistry
/// @notice Registers all event addresses
/// @notice Carries ownable set up of events

/// Event has already been closed
error AlreadyClosed();

/// Trying to set address zero
error WrongTokenAddress();

/// Trying to set address zero
error WrongOwnerAddress();

/// Commission percentage not accepted
error WrongCommissionPercentage();

/// NbTeam not accepted
error WrongNbTeam();

/// Cannot configurate allowance
error CannotConfigurate();

contract EventRegistry is IEventRegistry, AccessControlUpgradeable {
    using EnumerableSet for EnumerableSet.AddressSet;

    uint256 public constant MAX_COMISSION_PERCENTAGE = 50;
    uint256 public constant MIN_NB_TEAM = 2;
    uint256 public constant MAX_NB_TEAM = 30;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    address public tokenAddress;
    address public override ownerAddress;

    EnumerableSet.AddressSet internal _eventAddresses;
    EnumerableSet.AddressSet internal _openEventAddresses;
    mapping(address => uint256) internal _stopBets;

    uint256 public commissionPercentage;

    event EventCreated(uint256 indexed eventID, address indexed eventAddress);
    event EventCancelled(address indexed eventAddress);
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

    function initialize(address _ownerAddress, address _tokenAddress) external initializer {
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _ownerAddress);

        tokenAddress = _tokenAddress;
        ownerAddress = _ownerAddress;
        commissionPercentage = 10;
    }

    // =================
    // ||   LISTING   ||
    // =================

    /// @notice counts events
    /// @return count of events
    function countEvents() external view returns (uint256) {
        return _eventAddresses.length();
    }

    /// @notice counts opened events
    /// @return count of events opened
    function countOpenEvents() external view returns (uint256) {
        return _openEventAddresses.length();
    }

    /// @notice returns list of events
    /// @dev use with countEvents()
    /// @param offset uint256 use 0
    /// @param limit uint256 result of countEvents()
    /// @return eventList array of event addresses
    function listEvents(uint256 offset, uint256 limit) external view returns (address[] memory eventList) {
        return Listing.listAdd(offset, limit, _eventAddresses);
    }

    /// @notice returns list of opened events
    /// @dev use with countOpenEvents()
    /// @param offset uint256 use 0
    /// @param limit uint256 result of countOpenEvents()
    /// @return eventList array of opened event addresses
    function listOpenEvents(uint256 offset, uint256 limit) external view returns (address[] memory eventList) {
        return Listing.listAdd(offset, limit, _openEventAddresses);
    }

    // ==================
    // ||   SETTINGS   ||
    // ==================

    /// @notice set token used for bet and reward logic
    /// @dev only accessible by admin
    /// @param newTokenAddress address of token (ERC20 deployed)
    function setTokenAddress(address newTokenAddress) external onlyRole(ADMIN_ROLE) {
        if (newTokenAddress == address(0)) {
            revert WrongTokenAddress();
        }
        tokenAddress = newTokenAddress;
    }

    /// @notice set owner address that receives commission and treasury
    /// @dev only accessible by admin
    /// @param newOwnerAddress address of owner
    function setOwnerAddress(address newOwnerAddress) external onlyRole(ADMIN_ROLE) {
        if (newOwnerAddress == address(0)) {
            revert WrongOwnerAddress();
        }
        ownerAddress = newOwnerAddress;
    }

    /// @notice set commission percentage for bet and reward logic
    /// @dev only accessible by admin
    /// @param newCommissionPercentage uint256 by default 10%
    function setCommissionPercentage(uint256 newCommissionPercentage) external onlyRole(ADMIN_ROLE) {
        if (newCommissionPercentage == 0 || newCommissionPercentage > MAX_COMISSION_PERCENTAGE) {
            revert WrongCommissionPercentage();
        }
        commissionPercentage = newCommissionPercentage;
    }

    /// @notice set dealine for specific event
    /// @dev only accessible by admin
    /// @param newDealine new deadline
    function setDeadline(address eventAddress, uint256 newDealine) external onlyRole(ADMIN_ROLE) {
        Event(eventAddress).setDealine(newDealine);
    }

    /// @notice enable bet for choosen event
    /// @dev only accessible by admin
    /// @dev enabled by default
    /// @param eventAddress address event to enable
    function enableBet(address eventAddress) external onlyRole(ADMIN_ROLE) {
        if (_stopBets[eventAddress] == 0) {
            revert CannotConfigurate();
        }
        _setBetAllowance(eventAddress, 0);
    }

    /// @notice disable bet for choosen event
    /// @dev only accessible by admin
    /// @dev enabled by default
    /// @param eventAddress address event to disable
    function disableBet(address eventAddress) external onlyRole(ADMIN_ROLE) {
        if (_stopBets[eventAddress] != 0 && block.timestamp > _stopBets[eventAddress]) {
            revert CannotConfigurate();
        }
        _setBetAllowance(eventAddress, block.timestamp);
    }

    /// @notice disable bet for choosen event at choosen date
    /// @dev only accessible by admin
    /// @dev enabled by default
    /// @param eventAddress address event to disable
    /// @param stopBets uint256 block timestamp for future disable
    function disableBetAtDate(address eventAddress, uint256 stopBets) external onlyRole(ADMIN_ROLE) {
        if (block.timestamp > stopBets || (_stopBets[eventAddress] != 0 && block.timestamp > _stopBets[eventAddress])) {
            revert CannotConfigurate();
        }
        _setBetAllowance(eventAddress, stopBets);
    }

    function _setBetAllowance(address eventAddress, uint256 stopBets) internal {
        _stopBets[eventAddress] = stopBets;
    }

    // ================
    // ||   STATUS   ||
    // ================

    /// @notice inform if can or cannot bet on choosen event
    /// @dev used in Event contract at bet function
    /// @param eventAddress address event
    /// @return _canBet bool true if can bet / false if cannot bet
    function canBet(address eventAddress) public view override returns (bool _canBet) {
        return _stopBets[eventAddress] == 0 || block.timestamp < _stopBets[eventAddress];
    }

    // ================
    // ||   EVENTS   ||
    // ================

    /// @notice create new event
    /// @dev only accessible by admin
    /// @dev deploy a new Event contract
    /// @param nbTeam uint256 number of pools for event
    function createEvent(uint256 eventID, uint256 minBetAmount, uint256 nbTeam) external onlyRole(ADMIN_ROLE) {
        if (nbTeam < MIN_NB_TEAM || nbTeam > MAX_NB_TEAM) {
            revert WrongNbTeam();
        }

        Event eventContract = new Event(tokenAddress, commissionPercentage, minBetAmount, nbTeam);
        address eventAddress = address(eventContract);

        _eventAddresses.add(eventAddress);
        _openEventAddresses.add(eventAddress);

        emit EventCreated(eventID, eventAddress);
    }

    /// @notice cancel event
    /// @dev only accessible by admin
    /// @param eventAddress address choosen event to cancel
    function cancelEvent(address eventAddress) external onlyRole(ADMIN_ROLE) eventOpened(eventAddress) {
        Event(eventAddress).closeEvent(IEvent.Result.NULL, 0);
        _closeEvent(eventAddress);

        emit EventCancelled(eventAddress);
    }

    /// @notice end event
    /// @dev only accessible by admin
    /// @param eventAddress address choosen event to end
    /// @param result uint256 result = 0 for draw or result = winnerTeamID
    function endEvent(address eventAddress, uint256 result) external onlyRole(ADMIN_ROLE) eventOpened(eventAddress) {
        Event(eventAddress).closeEvent(IEvent.Result.WIN, result);
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
