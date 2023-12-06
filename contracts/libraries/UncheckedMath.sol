// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

// CAUTION
// This version of UncheckedMath should only be used with Solidity 0.8 or later,
// because it relies on the compiler's built in overflow checks.

library UncheckedMath {
    function uncheckedAdd(uint256 a, uint256 b) internal pure returns (uint256) {
        unchecked {
            return a + b;
        }
    }

    function uncheckedSub(uint256 a, uint256 b) internal pure returns (uint256) {
        unchecked {
            return a - b;
        }
    }

    function uncheckedMul(uint256 a, uint256 b) internal pure returns (uint256) {
        unchecked {
            return a * b;
        }
    }

    function uncheckedDiv(uint256 a, uint256 b) internal pure returns (uint256) {
        unchecked {
            return a / b;
        }
    }
}
