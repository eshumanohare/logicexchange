// SPDX-License-Identifier: MIT
pragma solidity >0.8.0;

import "./PairLogic.sol";
import "./interfaces/ICoreLogic.sol";

contract CoreLogic is ICoreLogic {
    using SafeMath for uint256;

    mapping(address => mapping(address => address)) public pairMap;

    event LiquidityAdded(
        address lp,
        address indexed addrToken0,
        address indexed addrToken1,
        address indexed addrPair,
        uint256 token0,
        uint256 token1
    );
    event Deployed(
        address indexed pair,
        address indexed addrToken0,
        address indexed addrToken1
    );
    event Swap(
        address indexed to,
        address indexed addrToken0,
        address indexed addrToken1,
        uint256 token0In,
        uint256 token1Out
    );
    event Burned(
        address indexed owner,
        address indexed addrToken0,
        address indexed addrToken1
    );

    function createPair(
        address _addrToken0,
        address _addrToken1
    )
        external
        AreTokensAddrInvalid(_addrToken0, _addrToken1)
        returns (address pair)
    {
        if (pairMap[_addrToken0][_addrToken1] == address(0)) {
            // Pair created for the first time
            bytes32 salt = keccak256(
                abi.encodePacked(_addrToken0, _addrToken1)
            ); // order of tokens matters
            pair = address(
                new PairLogic{salt: salt}(
                    _addrToken0,
                    _addrToken1,
                    address(this)
                )
            );
            require(
                pair != address(0),
                "CoreLogic: Error => Failed creating pair contract"
            );

            pairMap[_addrToken0][_addrToken1] = pair;
            pairMap[_addrToken1][_addrToken0] = pair;

            address ADDR_LOGICCOIN = PairLogic(pair).ADDR_LOGICCOIN();
            address ADDR_ETH = PairLogic(pair).ADDR_ETH();
            bool success = PairLogic(pair).setLogicEthPool(
                pairMap[ADDR_LOGICCOIN][ADDR_ETH]
            );
            require(
                success,
                "CoreLogic: Error => Failed while setting LOGIC/ETH pool"
            );

            emit Deployed(pair, _addrToken0, _addrToken1);
        }
        return pair;
    }

    function addLiquidity(
        address addrToken0,
        address addrToken1,
        uint256 token0In,
        uint256 token1In
    ) external AreTokensAddrInvalid(addrToken0, addrToken1) returns (bool) {
        address _addrToken0 = addrToken0; // saving gas
        address _addrToken1 = addrToken1; // saving gas
        uint256 _bal0 = IERC20(_addrToken0).balanceOf(msg.sender); // saving gas
        uint256 _bal1 = IERC20(_addrToken1).balanceOf(msg.sender); // saving gas

        require(_bal0 >= token0In, "CoreLogic: Error => Insufficient Tokens");
        require(_bal1 >= token1In, "CoreLogic: Error => Insufficient Tokens");
        require(
            pairMap[_addrToken0][_addrToken1] != address(0),
            "CoreLogic: Error => Pair contract not created"
        );

        bool success = PairLogic(pairMap[_addrToken0][_addrToken1])
            .addLiquidity(
                msg.sender,
                _addrToken0,
                _addrToken1,
                token0In,
                token1In
            );

        require(success, "CoreLogic: Error => Adding Liquidity Failed");
        return success;
    }

    function swapTokens(
        address addrToken0,
        address addrToken1,
        uint256 token0In,
        address to
    ) external AreTokensAddrInvalid(addrToken0, addrToken1) returns (bool) {
        require(
            to != address(0),
            "CoreLogic: Error => Receiver address is invalid"
        );
        uint256[2] memory tokens = PairLogic(pairMap[addrToken0][addrToken1])
            .swap(addrToken0, addrToken1, token0In, to, msg.sender);

        require(tokens[1] != 0, "CoreLogic: Error => Swapping Tokens Failed");
        // minting Logic Coins for the lp
        bool success = _mintLPTokens(addrToken0, addrToken1);
        require(success, "CoreLogic: Error => Minting Failed");

        emit Swap(to, addrToken0, addrToken1, tokens[0], tokens[1]);
        return success;
    }

    function burn(
        address addrToken0,
        address addrToken1
    ) external AreTokensAddrInvalid(addrToken0, addrToken1) returns (bool) {
        bool success = PairLogic(pairMap[addrToken0][addrToken1]).burnTokens(
            msg.sender
        );
        require(success, "CoreLogic: Error => Burn Failed");
        emit Burned(msg.sender, addrToken0, addrToken1);
        return true;
    }

    // all utility functions

    function _mintLPTokens(
        address addrToken0,
        address addrToken1
    ) private returns (bool) {
        address pair = pairMap[addrToken0][addrToken1];
        address[] memory liquidityProviders = PairLogic(pair)
            .getliquidityProviders();

        uint256 logicCoinsAllowed = _calculateLogicCoinProp(pair);

        for (uint256 i = 0; i < liquidityProviders.length; i++) {
            // mint logic coins
            uint256 lpShareToken0 = PairLogic(pair).lpShares(
                liquidityProviders[i],
                2
            );
            uint256 lpShareToken1 = PairLogic(pair).lpShares(
                liquidityProviders[i],
                3
            );
            uint256 maxShare = lpShareToken0 >= lpShareToken1
                ? lpShareToken0
                : lpShareToken1;
            uint256 amount = logicCoinsAllowed.mul(maxShare).div(10 ** 18);
            bool success = IERC20(PairLogic(pair).ADDR_LOGICCOIN())
                .transferFrom(
                    IERC20(PairLogic(pair).ADDR_LOGICCOIN()).getCreator(),
                    address(this),
                    amount
                );
            require(
                success,
                "PairLogic: Error => Transfer Failed from logic contract to core contract"
            );

            success = IERC20(PairLogic(pair).ADDR_LOGICCOIN()).transfer(
                liquidityProviders[i],
                amount
            );
            require(success, "PairLogic: Error => Minting failed");
        }
        return true;
    }

    function _calculateLogicCoinProp(
        address pair
    ) private view returns (uint256) {
        address ADDR_LOGIC_ETH_POOL = pairMap[PairLogic(pair).ADDR_LOGICCOIN()][
            PairLogic(pair).ADDR_ETH()
        ];
        uint256 reservesLogic = PairLogic(ADDR_LOGIC_ETH_POOL).reserveToken0();
        uint256 reserveETH = PairLogic(ADDR_LOGIC_ETH_POOL).reserveToken1();
        uint256 prop = reserveETH.mul(10 ** 18).div(reservesLogic);
        return prop;
    }

    // all modifiers

    modifier AreTokensAddrInvalid(address addrToken0, address addrToken1) {
        require(
            addrToken0 != address(0) && addrToken1 != address(0),
            "CoreLogic: Error => Address value cannot be 0"
        );
        require(
            addrToken0 != addrToken1,
            "CoreLogic: Error => Tokens must be different"
        );
        _;
    }

    // all getters

    function getPairMap(
        address addrToken0,
        address addrToken1
    ) external view returns (address) {
        return pairMap[addrToken0][addrToken1];
    }
}
