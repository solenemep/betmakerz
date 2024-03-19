//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./libraries/UncheckedMath.sol";
import "./libraries/Listing.sol";

import "./interfaces/IEvent.sol";

import "./interfaces/IEventRegistry.sol";

/// @author @solenemep
/// @title Event
/// @notice Carries game bet and rewarding logic

/// EventOption unallow bets
error CannotBet();

/// Bet amount is too low
error NotSufficientBetAmount();

/// Sender must be admin from EventRegistry
error NotEventRegistry();

/// Pool must exist
error NotExistingPool();

/// User has nothing to withdraw
error CannotWithdraw();

/// Dealine has passed and cannot be modifed
error WrongDealine();

/// Deadline has passed, event cannot be closed
error DeadlinePassed();

contract Event is IEvent {
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.UintSet;
    using UncheckedMath for uint256;
    using SafeERC20 for IERC20;

    uint256 public constant ONE_YEAR = 52 weeks;
    uint256 public constant PERCENTAGE_100 = 100;

    IERC20 public immutable token;
    IEventRegistry public immutable eventRegistry;

    uint256 public immutable commissionPercentage;
    uint256 public immutable minBetAmount;

    uint256 public immutable nbTeam;
    uint256 internal _totalTreasury;
    mapping(uint256 => PoolInfo) internal _poolInfo; // poolID -> PoolInfo
    mapping(uint256 => mapping(address => uint256)) public betAmount; // poolID -> bettor -> betAmount

    mapping(address => EnumerableSet.UintSet) internal _partnerIDs;

    uint256 public deadline;
    Result public gameResult;
    uint256 internal _winnerPoolID;

    event BetPlaced(uint256 indexed poolID, address indexed bettor, uint256 indexed tokenAmount, uint256 partnerID);
    event CommissionPaid(uint256 indexed tokenAmount);
    event TreasuryTransfered(uint256 indexed tokenAmount);
    event BetRefunded(uint256 indexed poolID, address indexed bettor, uint256 indexed tokenAmount);
    event BetRewarded(uint256 indexed poolID, address indexed bettor, uint256 indexed tokenAmount);

    modifier onlyEventRegistry() {
        if (msg.sender != address(eventRegistry)) {
            revert NotEventRegistry();
        }
        _;
    }

    modifier existingPool(uint256 poolID) {
        if (nbTeam < poolID) {
            revert NotExistingPool();
        }
        _;
    }

    constructor(address tokenAddress, uint256 _commissionPercentage, uint256 _minBetAmount, uint256 _nbTeam) {
        token = IERC20(tokenAddress);
        eventRegistry = IEventRegistry(msg.sender);

        commissionPercentage = _commissionPercentage;
        minBetAmount = _minBetAmount;
        nbTeam = _nbTeam;

        deadline = block.timestamp.uncheckedAdd(ONE_YEAR);
    }

    // =================
    // ||   LISTING   ||
    // =================

    /// @notice counts bettors per poolID
    /// @param poolID uint256
    /// @return count of bettors per poolID
    function countBettorsPerPool(uint256 poolID) external view returns (uint256) {
        return _poolInfo[poolID].bettorAddresses.length();
    }

    /// @notice counts partnerIDs per bettor
    /// @param bettor address
    /// @return count of partnerIDs per bettor
    function countPartnerIDs(address bettor) external view returns (uint256) {
        return _partnerIDs[bettor].length();
    }

    /// @notice returns list of bettors per poolID
    /// @dev use with countBettorsPerPool()
    /// @param offset uint256 use 0
    /// @param limit uint256 result of countBettorsPerPool()
    /// @param poolID uint256
    /// @return bettorList array of bettor addresses
    function listBettorsPerPool(
        uint256 offset,
        uint256 limit,
        uint256 poolID
    ) external view returns (address[] memory bettorList) {
        return Listing.listAdd(offset, limit, _poolInfo[poolID].bettorAddresses);
    }

    /// @notice returns list of partners per bettor
    /// @dev use with countPartnerIDs()
    /// @param offset uint256 use 0
    /// @param limit uint256 result of countPartnerIDs()
    /// @param bettor address
    /// @return partnerIDList array of partner ids
    function listPartnerIDs(
        uint256 offset,
        uint256 limit,
        address bettor
    ) external view returns (uint256[] memory partnerIDList) {
        return Listing.listUint(offset, limit, _partnerIDs[bettor]);
    }

    // ==================
    // ||   SETTINGS   ||
    // ==================

    /// @dev only accessible by EventRegistry contract
    /// @param newDealine dealine for
    function setDealine(uint256 newDealine) external onlyEventRegistry {
        if (deadline < block.timestamp || newDealine < block.timestamp) {
            revert WrongDealine();
        }
        deadline = newDealine;
    }

    // =============
    // ||   BET   ||
    // =============

    /// @notice user can place a bet on choosen pool
    /// @dev user must have allowed token transfer before
    /// @param poolID uint256 poolID = 0 for draw or poolID = existing poolID
    /// @param tokenAmount uint256 amount of bet
    /// @param partnerID uint256 partnerID
    function placeBet(uint256 poolID, uint256 tokenAmount, uint256 partnerID) external existingPool(poolID) {
        if (!eventRegistry.canBet(address(this))) {
            revert CannotBet();
        }
        if (tokenAmount < minBetAmount) {
            revert NotSufficientBetAmount();
        }

        _totalTreasury += tokenAmount;
        _poolInfo[poolID].treasury += tokenAmount;
        _poolInfo[poolID].bettorAddresses.add(msg.sender);
        betAmount[poolID][msg.sender] += tokenAmount;

        _partnerIDs[msg.sender].add(partnerID);

        token.safeTransferFrom(msg.sender, address(this), tokenAmount);

        emit BetPlaced(poolID, msg.sender, tokenAmount, partnerID);
    }

    // =================
    // ||   CLOSURE   ||
    // =================

    /// @dev only accessible by EventRegistry contract
    /// @param result Result is NULL or WIN
    /// @param winnerPoolID uint256
    function closeEvent(Result result, uint256 winnerPoolID) external onlyEventRegistry existingPool(winnerPoolID) {
        if (block.timestamp >= deadline) {
            revert DeadlinePassed();
        }
        if (result == Result.NULL) {
            gameResult = result;
        } else if (result == Result.WIN) {
            _distributePool(winnerPoolID);
        }
    }

    function _distributePool(uint256 winnerPoolID) internal {
        uint256 winnerTreasury = _poolInfo[winnerPoolID].treasury;
        uint256 totalTreasury = _totalTreasury;

        if (winnerTreasury == totalTreasury || _onePoolOnly()) {
            gameResult = Result.NULL;
        } else if (winnerTreasury == 0) {
            // by default gameResult = Result.NONE;
            token.safeTransfer(eventRegistry.ownerAddress(), totalTreasury);

            emit TreasuryTransfered(totalTreasury);
        } else {
            gameResult = Result.WIN;
            _winnerPoolID = winnerPoolID;

            uint256 commission = ((totalTreasury.uncheckedSub(winnerTreasury)) * commissionPercentage).uncheckedDiv(
                PERCENTAGE_100
            );
            if (commission > 0) {
                token.safeTransfer(eventRegistry.ownerAddress(), commission);
            }

            emit CommissionPaid(commission);
        }
    }

    function _onePoolOnly() internal view returns (bool onePoolOnly) {
        uint256 _nbTeam = nbTeam;
        uint256 totalTreasury = _totalTreasury;

        for (uint256 i = 0; i <= _nbTeam; i++) {
            uint256 poolTreasury = _poolInfo[i].treasury;
            if (poolTreasury == totalTreasury) {
                onePoolOnly = true;
                break;
            } else if (poolTreasury != 0) {
                break;
            }
        }
    }

    // ====================
    // ||   GAME BOARD   ||
    // ====================

    /// @notice get treasury per poolID
    /// @param poolID uint256
    /// @return treasury uint256 amount in treasury for poolID
    function treasury(uint256 poolID) external view returns (uint256) {
        return _poolInfo[poolID].treasury;
    }

    /// @notice get poolShare per poolID
    /// @param poolID uint256
    /// @return poolShare uint256 poolShare for poolID
    function poolShare(uint256 poolID) external view returns (uint256) {
        return (_poolInfo[poolID].treasury * PERCENTAGE_100) / _totalTreasury;
    }

    /// @notice get potentialGain for bet on poolID
    /// @notice if user did not bet for poolID, potentialGain = 0
    /// @param poolID uint256
    /// @param bettor address
    /// @return potentialGain uint256 potential return for actual bet
    function potentialGain(uint256 poolID, address bettor) external view returns (uint256) {
        uint256 gainAmount = _calculateGain(poolID, betAmount[poolID][bettor]);
        return betAmount[poolID][bettor] + gainAmount;
    }

    // ==================
    // ||   WITHDRAW   ||
    // ==================

    function _calculateGain(uint256 winnerPoolID, uint256 actualBetAmount) internal view returns (uint256) {
        uint256 winnerTreasury = _poolInfo[winnerPoolID].treasury;
        return
            (actualBetAmount *
                ((_totalTreasury.uncheckedSub(winnerTreasury)) * (PERCENTAGE_100 - commissionPercentage)).uncheckedDiv(
                    PERCENTAGE_100
                )) / winnerTreasury;
    }

    /// @notice user can withdraw his due amount on game
    /// @notice if NONE, user cannot withdraw
    /// @notice if NULL, user gets actualBetAmount for all pools
    /// @notice if WIN, user gets actualBetAmount + gainAmount for winning team
    /// @notice if user loose, he gets nothing
    function withdraw() external {
        if (gameResult == Result.NONE && block.timestamp < deadline) {
            revert CannotWithdraw();
        }

        uint256 totalTokenAmount;
        uint256 _nbTeam = nbTeam;

        if (gameResult == Result.NULL || block.timestamp >= deadline) {
            for (uint256 i = 0; i <= _nbTeam; i++) {
                totalTokenAmount += _withdrawBet(i, msg.sender);
            }
        } else if (gameResult == Result.WIN) {
            totalTokenAmount = _withdrawGain(msg.sender);
        }

        if (totalTokenAmount > 0) {
            token.safeTransfer(msg.sender, totalTokenAmount);
        }
    }

    function _withdrawBet(uint256 poolID, address bettor) internal returns (uint256 tokenAmount) {
        uint256 actualBetAmount = betAmount[poolID][bettor];

        if (actualBetAmount != 0) {
            tokenAmount = actualBetAmount;
            delete betAmount[poolID][bettor];

            emit BetRefunded(poolID, bettor, actualBetAmount);
        }
    }

    function _withdrawGain(address bettor) internal returns (uint256 tokenAmount) {
        uint256 winnerPoolID = _winnerPoolID;
        uint256 actualBetAmount = betAmount[winnerPoolID][bettor];

        if (actualBetAmount != 0) {
            uint256 gainAmount;
            if (_poolInfo[winnerPoolID].treasury != _totalTreasury) {
                gainAmount = _calculateGain(winnerPoolID, actualBetAmount);
            }
            tokenAmount = actualBetAmount + gainAmount;
            delete betAmount[winnerPoolID][bettor];

            emit BetRewarded(winnerPoolID, bettor, actualBetAmount + gainAmount);
        }
    }
}
