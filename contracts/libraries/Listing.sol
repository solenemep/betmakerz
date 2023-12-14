// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

import "./UncheckedMath.sol";

library Listing {
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.UintSet;
    using UncheckedMath for uint256;
    using Math for uint256;

    function listAdd(
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

    function listUint(
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
}
