// SPDX-License-Identifier: MIT
pragma solidity >0.8.0;

interface IERC20 {
    function balanceOf(address owner) external view returns (uint256);

    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);

    function transfer(address to, uint256 tokens) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 tokens
    ) external returns (bool);

    function approve(address spender, uint256 tokens) external returns (bool);

    function getCreator() external view returns (address);

    function totalSupply() external view returns (uint256);
}
