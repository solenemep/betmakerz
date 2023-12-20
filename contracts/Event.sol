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

/// Team must exist
error NotExistingTeam();

contract Event is IEvent {
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.UintSet;
    using UncheckedMath for uint256;

    IERC20 public token;

    address public eventRegistryAddress;

    uint256 public commissionPercentage;

    uint256 public nbTeam;
    uint256 internal _totalTreasury;
    mapping(uint256 => PoolInfo) internal _poolInfo; // teamID -> PoolInfo
    mapping(uint256 => mapping(address => uint256)) public betAmount; // teamID -> bettor -> betAmount

    mapping(address => EnumerableSet.UintSet) internal _partnerIDs;

    event BetPlaced(uint256 indexed teamID, address indexed bettor, uint256 indexed tokenAmount, uint256 partnerID);
    event BetRefunded(uint256 indexed teamID, address indexed bettor, uint256 indexed tokenAmount);
    event BetRewarded(uint256 indexed teamID, address indexed bettor, uint256 indexed tokenAmount);
    event CommissionPaid(uint256 indexed tokenAmount);
    event TreasuryTransfered(uint256 indexed tokenAmount);

    modifier onlyEventRegistry() {
        if (msg.sender != eventRegistryAddress) {
            revert NotEventRegistry();
        }
        _;
    }

    modifier existingTeam(uint256 teamID) {
        if (teamID == 0 || nbTeam < teamID) {
            revert NotExistingTeam();
        }
        _;
    }

    constructor(address tokenAddress, uint256 _commissionPercentage, uint256 _nbTeam) {
        token = IERC20(tokenAddress);
        eventRegistryAddress = msg.sender;

        commissionPercentage = _commissionPercentage;
        nbTeam = _nbTeam;
    }

    // =================
    // ||   LISTING   ||
    // =================

    // TODO natspec
    function countBettorsPerTeam(uint256 teamID) external view returns (uint256) {
        return _poolInfo[teamID].bettorAddresses.length();
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
        uint256 teamID
    ) external view returns (address[] memory bettorList) {
        return Listing.listAdd(offset, limit, _poolInfo[teamID].bettorAddresses);
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
    function placeBet(uint256 teamID, uint256 tokenAmount, uint256 partnerID) external existingTeam(teamID) {
        if (!IEventRegistry(eventRegistryAddress).canBet(address(this))) {
            revert CannotBet();
        }

        _totalTreasury += tokenAmount;
        _poolInfo[teamID].treasury += tokenAmount;
        _poolInfo[teamID].bettorAddresses.add(msg.sender);
        betAmount[teamID][msg.sender] += tokenAmount;

        _partnerIDs[msg.sender].add(partnerID);

        token.transferFrom(msg.sender, address(this), tokenAmount);

        emit BetPlaced(teamID, msg.sender, tokenAmount, partnerID);
    }

    // =================
    // ||   CLOSURE   ||
    // =================

    function closeEvent(uint256 result) external onlyEventRegistry {
        if (result == 0) {
            for (uint256 i = 1; i <= nbTeam; i++) {
                if (_poolInfo[i].treasury != 0) {
                    _refundTeam(i, _poolInfo[i].bettorAddresses.length());
                }
            }
        } else {
            _distributeTeam(result);
        }
    }

    function _distributeTeam(uint256 winnerTeamID) internal {
        if (_totalTreasury != 0) {
            uint256 winnerTreasury = _poolInfo[winnerTeamID].treasury;
            if (winnerTreasury == _totalTreasury) {
                _refundTeam(winnerTeamID, _poolInfo[winnerTeamID].bettorAddresses.length());
            } else if (winnerTreasury == 0) {
                token.transfer(address(eventRegistryAddress), _totalTreasury);

                emit TreasuryTransfered(_totalTreasury);
            } else {
                uint256 commission = ((_totalTreasury.uncheckedSub(winnerTreasury)) * commissionPercentage)
                    .uncheckedDiv(100);
                token.transfer(address(eventRegistryAddress), commission);

                emit CommissionPaid(commission);

                _rewardTeam(winnerTeamID, _poolInfo[winnerTeamID].bettorAddresses.length());
            }
        }
    }

    function _refundTeam(uint256 teamID, uint256 limit) internal {
        for (uint256 i = 0; i < limit; i++) {
            address bettor = _poolInfo[teamID].bettorAddresses.at(i);
            uint256 actualBetAmount = betAmount[teamID][bettor];
            token.transfer(bettor, actualBetAmount);

            emit BetRefunded(teamID, bettor, actualBetAmount);
        }
    }

    function _rewardTeam(uint256 winnerTeamID, uint256 limit) internal {
        for (uint256 i = 0; i < limit; i++) {
            address bettor = _poolInfo[winnerTeamID].bettorAddresses.at(i);
            uint256 actualBetAmount = betAmount[winnerTeamID][bettor];
            uint256 gainAmount = _calculateGain(winnerTeamID, actualBetAmount);

            token.transfer(bettor, actualBetAmount + gainAmount);

            emit BetRewarded(winnerTeamID, bettor, actualBetAmount + gainAmount);
        }
    }

    function _calculateGain(uint256 winnerTeamID, uint256 actualBetAmount) internal view returns (uint256) {
        uint256 winnerTreasury = _poolInfo[winnerTeamID].treasury;
        return
            (actualBetAmount *
                ((_totalTreasury.uncheckedSub(winnerTreasury)) * (100 - commissionPercentage)).uncheckedDiv(100)) /
            winnerTreasury;
    }

    // ====================
    // ||   GAME BOARD   ||
    // ====================

    // TODO natspec
    function treasury(uint256 teamID) external view returns (uint256) {
        return _poolInfo[teamID].treasury;
    }

    // TODO natspec
    function potentialGain(uint256 teamID, address bettor) external view returns (uint256) {
        uint256 gainAmount = _calculateGain(teamID, betAmount[teamID][bettor]);
        return betAmount[teamID][bettor] + gainAmount;
    }

    // TODO natspec
    function poolShare(uint256 teamID) external view returns (uint256) {
        return (_poolInfo[teamID].treasury * 100) / _totalTreasury;
    }
}
