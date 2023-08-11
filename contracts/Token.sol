// SPDX-License-Identifier: MIT
pragma solidity >0.8.0;
import "./interfaces/IERC20.sol";
import "./libraries/SafeMath.sol";

contract Token is IERC20 {
    using SafeMath for uint256;
    string public name;
    string public symbol;
    uint256 public decimals;
    address public creator;

    mapping(address => uint256) balances;
    mapping(address => mapping(address => uint256)) allowances;

    uint256 public totalTokens;

    event Transfer(address from, address to, uint256 value);
    event Approval(address from, address spender, uint256 value);

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _decimals,
        uint256 _totalTokens
    ) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        totalTokens = _totalTokens;
        balances[msg.sender] = _totalTokens;
        creator = msg.sender;
    }

    function balanceOf(address owner) external view returns (uint256) {
        return balances[owner];
    }

    function allowance(
        address owner,
        address spender
    ) external view returns (uint256) {
        return allowances[owner][spender];
    }

    function transfer(address to, uint256 tokens) external returns (bool) {
        require(
            to != msg.sender,
            "EMTT: Error => You cannot transfer to your own account"
        );
        require(
            balances[msg.sender] >= tokens,
            "EMTT: Error => Balance not sufficient"
        );
        balances[msg.sender] = balances[msg.sender].sub(tokens);
        balances[to] = balances[to].add(tokens);
        emit Transfer(msg.sender, to, tokens);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokens
    ) external returns (bool) {
        // require(from != msg.sender, "EMTT: Error => You cannot use transferFrom for your own account");

        uint256 bal_from = balances[from];
        uint256 bal_to = balances[to];
        uint256 allowance_to = allowances[from][to];

        require(bal_from >= tokens, "EMTT: Error => Balance not sufficient");
        require(
            allowance_to >= tokens,
            "EMTT: Error => This many tokens not allowed"
        );

        allowance_to = allowance_to.sub(tokens);
        bal_from = bal_from.sub(tokens);
        bal_to = bal_to.add(tokens);
        emit Transfer(from, to, tokens);
        balances[from] = bal_from;
        balances[to] = bal_to;
        allowances[from][to] = allowance_to;
        return true;
    }

    function approve(address spender, uint256 tokens) external returns (bool) {
        allowances[msg.sender][spender] = tokens;
        emit Approval(msg.sender, spender, tokens);
        return true;
    }

    function totalSupply() external view returns (uint256) {
        return totalTokens;
    }

    function getCreator() external view returns (address) {
        return creator;
    }
}
