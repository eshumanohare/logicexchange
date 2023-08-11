import React, { useEffect } from "react";
import { useState } from "react";
import addresses from "../addresses.json";
import Big from "big.js";

import {
  getCoreInstance,
  getProvider,
  getTokenInstance,
  getPairInstance,
} from "../api/web3";
import { ethers } from "ethers";

type Pair = {
  pairAddress: string;
  token1: string;
  token2: string;
  amount1: Big;
  amount2: Big;
};

const Reserves: React.FC = () => {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [core, setCore] = useState<ethers.Contract | null>(null);
  const [allPairs, setAllPairs] = useState<Map<string, Pair>>(new Map());

  useEffect(() => {
    if (errorMessage) {
      const shouldReload = window.confirm(errorMessage);
      if (shouldReload) {
        window.location.reload();
      }
    }
  }, [errorMessage]);

  useEffect(() => {
    const fetchProvider = async () => {
      try {
        const result = await getProvider();
        if (typeof result !== "string") {
          setProvider(result.provider);
        } else {
          setErrorMessage(result);
        }
      } catch (error) {
        setErrorMessage("Error fetching Provider");
      }
    };
    fetchProvider();
  }, []);

  useEffect(() => {
    const fetchCore = async () => {
      try {
        if (provider) {
          const core = await getCoreInstance(provider);
          setCore(core);
        }
      } catch (error) {
        setErrorMessage("Error fetching Core contract");
      }
    };
    fetchCore();
  }, [provider]);

  useEffect(() => {
    const addPairs = async () => {
      try {
        let allTokensAddr: string[] = [];
        allTokensAddr.push(addresses.logicAddr);
        allTokensAddr.push(addresses.ethAddr);
        allTokensAddr.push(addresses.daiAddr);
        allTokensAddr.push(addresses.usdtAddr);

        const map_pair_reserves = new Map<string, Pair>();

        if (core && provider) {
          for (let i = 0; i < allTokensAddr.length - 1; i++) {
            for (let j = i + 1; j < allTokensAddr.length; j++) {
              const pair = await core.pairMap(
                allTokensAddr[i],
                allTokensAddr[j]
              );
              const pairInstance = await getPairInstance(provider, pair);

              const token1AddrInPair = await pairInstance.addrToken0();
              const token2AddrInPair = await pairInstance.addrToken1();

              const token1Instance = await getTokenInstance(
                provider,
                token1AddrInPair
              );
              const token2Instance = await getTokenInstance(
                provider,
                token2AddrInPair
              );

              const r1 = await pairInstance.reserveToken0();
              const r2 = await pairInstance.reserveToken1();
              const reserve1 = new Big(r1).div(new Big(10).pow(18));
              const reserve2 = new Big(r2).div(new Big(10).pow(18));

              const pair_ij: Pair = {
                pairAddress: pair,
                token1: await token1Instance.symbol(),
                token2: await token2Instance.symbol(),
                amount1: reserve1,
                amount2: reserve2,
              };

              map_pair_reserves.set(pair, pair_ij);
            }
          }
        }
        setAllPairs(map_pair_reserves);
      } catch (error) {
        console.error(error);
        setErrorMessage("Error fetching all pairs");
      }
    };
    addPairs();
  }, [core, provider]);

  const renderTableRows = () => {
    return Array.from(allPairs.values()).map((pair) => (
      <tr key={pair.pairAddress}>
        <td>{pair.pairAddress}</td>
        <td>{pair.token1}</td>
        <td>{pair.token2}</td>
        <td>{pair.amount1.toString()}</td>
        <td>{pair.amount2.toString()}</td>
      </tr>
    ));
  };

  return (
    <div>
      <div className="swap-box-reserves">
        <table>
          <thead>
            <tr>
              <th>Pair Address</th>
              <th>Token 1</th>
              <th>Token 2</th>
              <th>Reserve 1</th>
              <th>Reserve 2</th>
            </tr>
          </thead>
          <tbody>{renderTableRows()}</tbody>
        </table>
      </div>
    </div>
  );
};

export default Reserves;
