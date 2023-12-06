//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

interface IEvent {
    enum Team {
        TEAM_A,
        TEAM_B
    }

    struct BetInfo {
        Team team;
        uint256 betAmount;
    }

    struct PoolInfo {
        uint256 treasury;
        uint256 bettors;
    }
}
