// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDTMock is ERC20 {
    constructor(string memory name, string memory symbol, address to) ERC20(name, symbol) {
        _mint(to, 1000000 * 10 ** 18);
    }
}
