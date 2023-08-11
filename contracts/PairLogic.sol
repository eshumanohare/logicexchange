// SPDX-License-Identifier: MIT
pragma solidity >0.8.0;

import "./interfaces/IERC20.sol";
import "./libraries/SafeMath.sol";

contract PairLogic {
    using SafeMath for uint256;

    address public addrToken0;
    address public addrToken1;
    address public core;
    address public constant ADDR_LOGICCOIN =
        0xA4f226D269b46509BF2ABf67b3f93D0b45341a69; // address of the LogicCoin ERC20 token
    address public constant ADDR_ETH =
        0x922aB4ff7f3fA77Ab11E823C6C5bF2d982A1268E;
    address public ADDR_LOGIC_ETH_POOL;
    mapping(address => uint256[4]) public lpShares; // [token0Invested, token1Invested, token0Share, token1Share]
    address[] public liquidityProviders;
    uint256 public reserveToken0;
    uint256 public reserveToken1;

    constructor(
        address _addrToken0,
        address _addrToken1,
        address _core
    ) public {
        addrToken0 = _addrToken0;
        addrToken1 = _addrToken1;
        core = _core;
    }

    function setLogicEthPool(
        address _ADDR_LOGIC_ETH_POOL
    ) external CoreCalling returns (bool) {
        // ADDR_LOGIC_ETH_POOL = ICoreLogic(core).getPairMap(ADDR_LOGICCOIN, ADDR_ETH);
        ADDR_LOGIC_ETH_POOL = _ADDR_LOGIC_ETH_POOL;
        require(
            ADDR_LOGIC_ETH_POOL != address(0),
            "PairLogic: Error => Failed while setting LOGIC/ETH pool"
        );
        return true;
    }

    function addLiquidity(
        address lp,
        address _addrToken0,
        address _addrToken1,
        uint256 _token0In,
        uint256 _token1In
    )
        external
        CoreCalling
        TokensNotZero(_token0In, _token1In)
        TokensInRange(_token0In, _token1In)
        returns (bool)
    {
        uint256 _reserve0 = reserveToken0;
        uint256 _reserve1 = reserveToken1;
        bool changed = false;

        if (_addrToken0 != addrToken0) {
            _addrToken0 = addrToken1;
            _addrToken1 = addrToken0;
            _reserve0 = reserveToken1;
            _reserve1 = reserveToken0;
            changed = true;
        }

        if (_reserve0 != 0) {
            // check for one reserve is sufficient
            // update the balanced amount of tokens to deposit
            _token0In = _reserve0.mul(_token1In).div(_reserve1);
            _token1In = _reserve1.mul(_token0In).div(_reserve0);
        }

        // rechecking of balances is necessary
        require(
            IERC20(_addrToken0).balanceOf(lp) >= _token0In,
            "PairLogic: Error => Balance insufficient for Token 0"
        );
        require(
            IERC20(_addrToken1).balanceOf(lp) >= _token1In,
            "PairLogic: Error => Balance insufficient for Token 1"
        );

        bool success = IERC20(_addrToken0).transferFrom(
            lp,
            address(this),
            _token0In
        );
        require(success, "PairLogic: Error => Transfer Failed for Token 0");

        success = IERC20(_addrToken1).transferFrom(
            lp,
            address(this),
            _token1In
        );
        require(success, "PairLogic: Error => Transfer Failed for Token 1");

        liquidityProviders.push(lp);

        _reserve0 = _reserve0.add(_token0In);
        _reserve1 = _reserve1.add(_token1In);

        if (changed) {
            reserveToken0 = _reserve1;
            reserveToken1 = _reserve0;
        } else {
            reserveToken0 = _reserve0;
            reserveToken1 = _reserve1;
        }

        _increaseLiquidity(lp, _addrToken0, _token0In, _token1In);
        _updateSharesAfterAddingLiq();

        return true;
    }

    function swap(
        address _addrToken0,
        address _addrToken1,
        uint256 token0In,
        address to,
        address swapper
    ) external CoreCalling returns (uint256[2] memory) {
        require(
            to != address(0),
            "PairLogic: Error => Receiver of tokens address cannot be zero"
        );
        // checks
        // calculate the optimal amount of token0 tokens that should be swapped with 0.3% trade fee
        // calculate the optimal amount of token1 tokens that will be released with 0.3% trade fee
        // distribute the 0.3% trade fee among the lp by updating their respective supply
        // mint LogicCoins according to the proportion of each lp in the pool with the value of LogicCoin relative to LogicCoin/ETH pool

        uint _token0In = _calculateOptimalToken0ToSwap(token0In);

        require(
            IERC20(_addrToken0).balanceOf(swapper) >= _token0In,
            "PairLogic: Error => Balance insufficient for Token 0"
        );

        uint _token1Out = _calculateOptimalToken1ToSwap(_token0In);
        require(
            reserveToken1 > _token1Out,
            "PairLogic: Error => Reserves too small for this amount"
        );

        bool success = IERC20(_addrToken0).transferFrom(
            swapper,
            address(this),
            token0In
        );
        require(success, "PairLogic: Error => Swap failed for Token 0");

        success = IERC20(_addrToken1).transfer(to, _token1Out);
        require(success, "PairLogic: Error => Swap failed for Token 1");

        if (_addrToken0 == addrToken0) {
            reserveToken0 = reserveToken0.add(token0In); // all token0 tokens are added to the reserve because of 0.3% token0 trade fee
            reserveToken1 = reserveToken1.sub(_token1Out); // token1Out is from 0.997 token0 tokens, the rest 0.003 token0 tokens goes to lp
        } else {
            reserveToken1 = reserveToken1.add(token0In); // all token0 tokens are added to the reserve because of 0.3% token0 trade fee
            reserveToken0 = reserveToken0.sub(_token1Out); // token1Out is from 0.997 token0 tokens, the rest 0.003 token0 tokens goes to lp
        }

        _updateAmountsAfterSwapping();

        return [_token0In, _token1Out];
    }

    function burnTokens(address owner) external CoreCalling returns (bool) {
        uint256 _amount0 = lpShares[owner][2].mul(reserveToken0).div(10 ** 18);
        uint256 _amount1 = lpShares[owner][3].mul(reserveToken1).div(10 ** 18);

        bool success = IERC20(addrToken0).transfer(owner, _amount0);
        require(success, "PairLogic: Error => Burning Failed for Token 0");
        reserveToken0 = reserveToken0.sub(_amount0);
        lpShares[owner][0] = 0;
        lpShares[owner][2] = 0;

        success = IERC20(addrToken1).transfer(owner, _amount1);
        require(success, "PairLogic: Error => Burning Failed for Token 1");
        reserveToken1 = reserveToken1.sub(_amount1);
        lpShares[owner][1] = 0;
        lpShares[owner][3] = 0;
        if (reserveToken0 != 0) {
            _updateAfterBurning();
        }
        return true;
    }

    // utility functions

    function _increaseLiquidity(
        address lp,
        address _addrToken0,
        uint256 _token0In,
        uint256 _token1In
    ) private {
        if (_addrToken0 == addrToken0) {
            lpShares[lp][0] = lpShares[lp][0].add(_token0In);
            lpShares[lp][1] = lpShares[lp][1].add(_token1In);
        } else {
            lpShares[lp][1] = lpShares[lp][1].add(_token0In);
            lpShares[lp][0] = lpShares[lp][0].add(_token1In);
        }
    }

    function _updateSharesAfterAddingLiq() private {
        // when someone adds liquidity to the pool
        // share of lp decreases as reserves increases
        // amount associated with the shares remains constant
        for (uint256 i = 0; i < liquidityProviders.length; i++) {
            address lp_i = liquidityProviders[i];
            lpShares[lp_i][2] = lpShares[lp_i][0].mul(10 ** 18).div(
                reserveToken0
            );
            lpShares[lp_i][3] = lpShares[lp_i][1].mul(10 ** 18).div(
                reserveToken1
            );
        }
    }

    function _updateAmountsAfterSwapping() private {
        // when someone swaps tokens
        // share of the lp remain constant
        // amount corresponding to their share changes as reserves changes
        // one reserve goes up and other goes down
        for (uint256 i = 0; i < liquidityProviders.length; i++) {
            address lp_i = liquidityProviders[i];
            lpShares[lp_i][0] = lpShares[lp_i][2].mul(reserveToken0).div(
                10 ** 18
            );
            lpShares[lp_i][1] = lpShares[lp_i][3].mul(reserveToken1).div(
                10 ** 18
            );
        }
    }

    function _updateAfterBurning() private {
        // when someone burns their liquidity
        // share of other lp increases as reserve decreases
        // corresponding amount of their share decreases as reserves decreases
        for (uint256 i = 0; i < liquidityProviders.length; i++) {
            address lp_i = liquidityProviders[i];
            // if (reserveToken0 != 0 && reserveToken1 != 0) {
            lpShares[lp_i][2] = lpShares[lp_i][0].mul(10 ** 18).div(
                reserveToken0
            );
            lpShares[lp_i][3] = lpShares[lp_i][1].mul(10 ** 18).div(
                reserveToken1
            );
            // }
            lpShares[lp_i][0] = lpShares[lp_i][2].mul(reserveToken0).div(
                10 ** 18
            );
            lpShares[lp_i][1] = lpShares[lp_i][3].mul(reserveToken1).div(
                10 ** 18
            );
        }
    }

    function _calculateOptimalToken0ToSwap(
        uint256 token0In
    ) public view returns (uint256) {
        uint256 _reserve0 = reserveToken0;
        uint256 _token0In = SafeMath
            .sqrt(
                (_reserve0 ** 2).mul(3988009).add(
                    _reserve0.mul(token0In).mul(3988000)
                )
            )
            .sub(_reserve0.mul(1997))
            .div(1994);
        return _token0In;
    }

    function _calculateOptimalToken1ToSwap(
        uint256 token0In
    ) public view returns (uint256) {
        uint256 _reserve1 = reserveToken1;
        uint256 _reserve0 = reserveToken0;
        uint256 numerator = _reserve1.mul(token0In).div(10 ** 18).mul(997).div(
            1000
        );
        uint256 denominator = token0In.mul(997).div(1000).add(_reserve0);
        uint256 _token1Out = numerator.mul(10 ** 18).div(denominator);
        return _token1Out;
    }

    // all modifiers

    modifier CoreCalling() {
        require(msg.sender == core, "PairLogic: Error => Not allowed to call");
        _;
    }

    modifier TokensNotZero(uint256 token0In, uint256 token1In) {
        require(
            token0In > 0 && token1In > 0,
            "PairLogic: Error => Zero liquidity cannot be added"
        );
        _;
    }

    modifier TokensInRange(uint256 token0In, uint256 token1In) {
        if (token0In >= token1In) {
            require(
                token1In >= 1000,
                "PairLogic: Error => Liquidity added too less"
            );
            require(
                (token0In - token1In) <= 1 ether,
                "PairLogic: Error => Liquidity difference too much"
            );
        } else {
            require(
                token0In >= 1000,
                "PairLogic: Error => Liquidity added too less"
            );
            require(
                (token1In - token0In) <= 1 ether,
                "PairLogic: Error => Liquidity difference too much"
            );
        }
        _;
    }

    // all getters

    function getReserve0() public view returns (uint256) {
        return reserveToken0;
    }

    function getReserve1() public view returns (uint256) {
        return reserveToken1;
    }

    function getliquidityProviders() public view returns (address[] memory) {
        return liquidityProviders;
    }

    function getLPShare0(address _lp) public view returns (uint256) {
        return lpShares[_lp][2];
    }

    function getLPShare1(address _lp) public view returns (uint256) {
        return lpShares[_lp][3];
    }
}
