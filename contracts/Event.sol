//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./libraries/UncheckedMath.sol";
import "./libraries/Listing.sol";

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

    IERC20 public token;

    address public eventRegistryAddress;

    uint256 public commissionPercentage;

    mapping(Team => PoolInfo) internal _poolInfo;
    mapping(Team => mapping(address => uint256)) public betAmount;

    mapping(address => EnumerableSet.UintSet) internal _partnerIDs;

    event BetPlaced(Team indexed team, address indexed bettor, uint256 indexed tokenAmount, uint256 partnerID);
    event BetRefunded(Team indexed team, address indexed bettor, uint256 indexed tokenAmount);
    event BetRewarded(Team indexed team, address indexed bettor, uint256 indexed tokenAmount);

    modifier onlyEventRegistry() {
        if (msg.sender != eventRegistryAddress) {
            revert NotEventRegistry();
        }
        _;
    }

    constructor(address tokenAddress, uint256 commissionPercent) {
        token = IERC20(tokenAddress);
        eventRegistryAddress = msg.sender;
        commissionPercentage = commissionPercent;
    }

    // =================
    // ||   LISTING   ||
    // =================

    // TODO natspec
    function countBettorsPerTeam(Team team) external view returns (uint256) {
        return _poolInfo[team].bettorAddresses.length();
    }

    // TODO natspec
    function countPartnerIDs(address bettor) external view returns (uint256) {
        return _partnerIDs[bettor].length();
    }

    // TODO natspec
    /// @notice use with countBettorsPerTeam()
    function listBettorsPerTeam(
        uint256 offset,
        uint256 limit,
        Team team
    ) external view returns (address[] memory bettorList) {
        return Listing.listAdd(offset, limit, _poolInfo[team].bettorAddresses);
    }

    // TODO natspec
    /// @notice use with countPartnerIDs()
    function listPartnerIDs(
        uint256 offset,
        uint256 limit,
        address bettor
    ) external view returns (uint256[] memory eventList) {
        return Listing.listUint(offset, limit, _partnerIDs[bettor]);
    }

    // =============
    // ||   BET   ||
    // =============

    // TODO natspec
    function placeBet(Team team, uint256 tokenAmount, uint256 partnerID) external {
        if (!IEventRegistry(eventRegistryAddress).canBet(address(this))) {
            revert CannotBet();
        }

        _poolInfo[team].treasury += tokenAmount;
        _poolInfo[team].bettorAddresses.add(msg.sender);
        betAmount[team][msg.sender] += tokenAmount;

        _partnerIDs[msg.sender].add(partnerID);

        token.transferFrom(msg.sender, address(this), tokenAmount);

        emit BetPlaced(team, msg.sender, tokenAmount, partnerID);
    }

    // =================
    // ||   CLOSURE   ||
    // =================

    function closeEvent(IEventRegistry.Result result) external onlyEventRegistry {
        if (result == IEventRegistry.Result.NO_WIN) {
            if (_poolInfo[Team.TEAM_A].treasury != 0) {
                _refundTeam(Team.TEAM_A, _poolInfo[Team.TEAM_A].bettorAddresses.length());
            }
            if (_poolInfo[Team.TEAM_B].treasury != 0) {
                _refundTeam(Team.TEAM_B, _poolInfo[Team.TEAM_B].bettorAddresses.length());
            }
        } else {
            if (result == IEventRegistry.Result.WIN_A) {
                _distributeTeam(Team.TEAM_A, Team.TEAM_B);
            } else if (result == IEventRegistry.Result.WIN_B) {
                _distributeTeam(Team.TEAM_B, Team.TEAM_A);
            }
        }
    }

    function _distributeTeam(Team winnerTeam, Team looserTeam) internal {
        if (_poolInfo[winnerTeam].treasury != 0 && _poolInfo[looserTeam].treasury == 0) {
            _refundTeam(winnerTeam, _poolInfo[winnerTeam].bettorAddresses.length());
        } else if (_poolInfo[winnerTeam].treasury == 0 && _poolInfo[looserTeam].treasury != 0) {
            token.transfer(address(eventRegistryAddress), _poolInfo[looserTeam].treasury);
        } else if (_poolInfo[winnerTeam].treasury != 0 && _poolInfo[looserTeam].treasury != 0) {
            uint256 commission = (_poolInfo[looserTeam].treasury * commissionPercentage).uncheckedDiv(100);
            token.transfer(address(eventRegistryAddress), commission);
            _rewardTeam(winnerTeam, looserTeam, _poolInfo[winnerTeam].bettorAddresses.length());
        }
    }

    function _refundTeam(Team team, uint256 limit) internal {
        for (uint256 i = 0; i < limit; i++) {
            address bettor = _poolInfo[team].bettorAddresses.at(i);
            uint256 actualBetAmount = betAmount[team][bettor];
            token.transfer(bettor, actualBetAmount);

            emit BetRefunded(team, bettor, actualBetAmount);
        }
    }

    function _rewardTeam(Team winnerTeam, Team looserTeam, uint256 limit) internal {
        for (uint256 i = 0; i < limit; i++) {
            address bettor = _poolInfo[winnerTeam].bettorAddresses.at(i);
            uint256 actualBetAmount = betAmount[winnerTeam][bettor];
            uint256 gainAmount = _calculateGain(winnerTeam, looserTeam, actualBetAmount, 0);

            token.transfer(bettor, actualBetAmount + gainAmount);

            emit BetRewarded(winnerTeam, bettor, actualBetAmount + gainAmount);
        }
    }

    function _calculateGain(
        Team winnerTeam,
        Team looserTeam,
        uint256 actualBetAmount,
        uint256 potentialBetAmount
    ) internal view returns (uint256) {
        uint256 winnerTreasury = _poolInfo[winnerTeam].treasury + potentialBetAmount;
        return
            ((actualBetAmount + potentialBetAmount) *
                (_poolInfo[looserTeam].treasury * (100 - commissionPercentage)).uncheckedDiv(100)) / winnerTreasury;
    }

    // ====================
    // ||   GAME BOARD   ||
    // ====================

    // TODO natspec
    function treasury(Team team) external view returns (uint256) {
        return _poolInfo[team].treasury;
    }

    // TODO natspec
    function potentialGain(Team team, address bettor, uint256 potentialBetAmount) external view returns (uint256) {
        uint256 gainAmount = team == Team.TEAM_A
            ? _calculateGain(Team.TEAM_A, Team.TEAM_B, betAmount[team][bettor], potentialBetAmount)
            : _calculateGain(Team.TEAM_B, Team.TEAM_A, betAmount[team][bettor], potentialBetAmount);
        return betAmount[team][bettor] + potentialBetAmount + gainAmount;
    }

    // TODO natspec
    function poolShare(Team team) external view returns (uint256) {
        return (_poolInfo[team].treasury * 100) / (_poolInfo[Team.TEAM_A].treasury + _poolInfo[Team.TEAM_B].treasury);
    }
}
