// SPDX-License-Identifier: MIT
pragma solidity >0.8.0;

interface ICoreLogic {
    function createPair(
        address addrToken0,
        address addrToken1
    ) external returns (address pair);

    function addLiquidity(
        address addrToken0,
        address addrToken1,
        uint256 token0In,
        uint256 token1In
    ) external returns (bool);

    function swapTokens(
        address addrToken0,
        address addrToken1,
        uint256 token0In,
        address to
    ) external returns (bool);

    function burn(
        address addrToken0,
        address addrToken1
    ) external returns (bool);

    function getPairMap(
        address addrToken0,
        address addrToken1
    ) external returns (address);
}
