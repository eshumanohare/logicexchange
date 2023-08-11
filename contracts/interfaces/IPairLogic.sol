// SPDX-License-Identifier: MIT
pragma solidity >0.8.0;

interface IPairLogic {
    function setLogicEthPool(
        address _ADDR_LOGIC_ETH_POOL
    ) external returns (bool);

    function addLiquidity(
        address lp,
        uint256 token0In,
        uint256 token1In
    ) external returns (bool);

    function swap(
        uint256 token0In,
        address to,
        address swapper
    ) external returns (uint256);

    function burnTokens(address owner) external returns (bool);

    function getliquidityProviders() external view returns (address[] memory);
}
