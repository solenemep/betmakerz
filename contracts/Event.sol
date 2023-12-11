//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

import "./libraries/UncheckedMath.sol";

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
    using EnumerableSet for EnumerableSet.UintSet;
    using UncheckedMath for uint256;
    using Math for uint256;

    IERC20 public token;

    address public eventRegistry;

    mapping(Team => PoolInfo) internal _poolInfo;
    mapping(Team => mapping(address => uint256)) public betAmount;

    mapping(address => EnumerableSet.UintSet) internal _partnerIDs;

    event BetPlaced(address indexed bettor, Team indexed team, uint256 indexed tokenAmount, uint256 partnerID);

    modifier onlyEventRegistry() {
        if (msg.sender != eventRegistry) {
            revert NotEventRegistry();
        }
        _;
    }

    constructor(address tokenAddress) {
        token = IERC20(tokenAddress);
        eventRegistry = msg.sender;
    }

    // =================
    // ||   LISTING   ||
    // =================

    function countBettorsPerTeam(Team team) external view returns (uint256) {
        return _poolInfo[team].bettorAddresses.length();
    }

    function countPartnerIDs(address bettor) external view returns (uint256) {
        return _partnerIDs[bettor].length();
    }

    /// @notice use with countBettorsPerTeam()
    function listBettorsPerTeam(
        uint256 offset,
        uint256 limit,
        Team team
    ) external view returns (address[] memory bettorList) {
        return _listAdd(offset, limit, _poolInfo[team].bettorAddresses);
    }

    /// @notice use with countPartnerIDs()
    function listPartnerIDs(
        uint256 offset,
        uint256 limit,
        address bettor
    ) external view returns (uint256[] memory eventList) {
        return _listUint(offset, limit, _partnerIDs[bettor]);
    }

    function _listAdd(
        uint256 offset,
        uint256 limit,
        EnumerableSet.AddressSet storage set
    ) internal view returns (address[] memory list) {
        uint256 to = (offset.uncheckedAdd(limit)).min(set.length()).max(offset);

        list = new address[](to.uncheckedSub(offset));

        for (uint256 i = offset; i < to; i++) {
            uint256 index = i.uncheckedSub(offset);
            list[index] = set.at(i);
        }
    }

    function _listUint(
        uint256 offset,
        uint256 limit,
        EnumerableSet.UintSet storage set
    ) internal view returns (uint256[] memory list) {
        uint256 to = (offset.uncheckedAdd(limit)).min(set.length()).max(offset);

        list = new uint256[](to.uncheckedSub(offset));

        for (uint256 i = offset; i < to; i++) {
            uint256 index = i.uncheckedSub(offset);
            list[index] = set.at(i);
        }
    }

    // =============
    // ||   BET   ||
    // =============

    function placeBet(Team team, uint256 tokenAmount, uint256 partnerID) external {
        if (!IEventRegistry(eventRegistry).canBet(address(this))) {
            revert CannotBet();
        }

        _poolInfo[team].treasury += tokenAmount;
        _poolInfo[team].bettorAddresses.add(msg.sender);
        betAmount[team][msg.sender] += tokenAmount;

        _partnerIDs[msg.sender].add(partnerID);

        token.transferFrom(msg.sender, address(this), tokenAmount);

        emit BetPlaced(msg.sender, team, tokenAmount, partnerID);
    }

    // =================
    // ||   CLOSURE   ||
    // =================

    function endEvent(Result result) external onlyEventRegistry {
        _closeEvent(result);
    }

    function cancelEvent() external onlyEventRegistry {
        _closeEvent(Result.DRAW);
    }

    // TODO distribute tokens here
    function _closeEvent(Result result) internal {
        if (result == Result.DRAW) {} else {}
    }

    // ====================
    // ||   GAME BOARD   ||
    // ====================

    function treasury(Team team) external view returns (uint256) {
        return _poolInfo[team].treasury;
    }

    function potentialGain(address bettor, bool win) external view returns (uint256) {}

    function _actualGain(address bettor, Team team) internal view returns (uint256) {}

    function poolShare(Team team) external view returns (uint256) {
        return (_poolInfo[team].treasury * 100) / (_poolInfo[Team.TEAM_A].treasury + _poolInfo[Team.TEAM_B].treasury);
    }
}
