import React from "react";
import { useState, useEffect } from "react";
import {
  getProvider,
  getCoreInstance,
  approveFromToken,
  getTokenInstanceFromName,
  swapTokens,
  tokensYouGetAfterSwap,
} from "../api/web3";
import { ethers } from "ethers";
import Big from "big.js";

const SwapBox: React.FC = () => {
  const [selectedToken1, setSelectedToken1] = useState<string>("");
  const [selectedToken2, setSelectedToken2] = useState<string>("");
  const [amount1, setAmount1] = useState<string>("0");
  const [amount2, setAmount2] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [core, setCore] = useState<ethers.Contract | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [approved, setApproved] = useState<string | null>(null);
  const [swapped, setSwapped] = useState<string | null>(null);

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
    if (approved) {
      window.confirm(approved);
    }
  }, [approved]);

  useEffect(() => {
    if (swapped) {
      window.confirm(swapped);
      window.location.reload();
    }
  }, [swapped]);

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
    if (errorMessage) {
      const shouldReload = window.confirm(errorMessage);
      if (shouldReload) {
        window.location.reload();
      }
    }
  }, [errorMessage]);

  useEffect(() => {
    const fetchSpecToken1 = async () => {
      try {
        if (Number(amount1) > 0) {
          const bn_amount1 = new Big(amount1).mul(new Big(10).pow(18));
          if (provider) {
            const tokenInstance1 = await getTokenInstanceFromName(
              provider,
              selectedToken1
            );
            const tokenInstance2 = await getTokenInstanceFromName(
              provider,
              selectedToken2
            );
            if (tokenInstance1 && tokenInstance2) {
              const specToken1 = await tokensYouGetAfterSwap(
                provider,
                tokenInstance1.target.toString(),
                tokenInstance2.target.toString(),
                bn_amount1.toString()
              );
              if (specToken1) {
                const notInWei = new Big(specToken1).div(new Big(10).pow(18));
                setAmount2(notInWei.toString());
              }
            }
          }
        }
      } catch (error) {}
    };
    fetchSpecToken1();
  }, [amount1, selectedToken1, selectedToken2]);

  const handleSwap = async () => {
    try {
      if (core && provider && selectedToken1 && selectedToken2 && amount1) {
        const tokenInstance1 = await getTokenInstanceFromName(
          provider,
          selectedToken1
        );
        const tokenInstance2 = await getTokenInstanceFromName(
          provider,
          selectedToken2
        );
        if (tokenInstance1 && tokenInstance2) {
          const pairAddr = await core.pairMap(tokenInstance1, tokenInstance2);

          const bn_amount1 = new Big(amount1).mul(new Big(10).pow(18));

          if (
            bn_amount1 &&
            (await approveFromToken(
              provider,
              tokenInstance1,
              pairAddr,
              bn_amount1.toString()
            ))
          ) {
            const signer = await provider.getSigner();
            const allowance = await tokenInstance1.allowance(signer, pairAddr);
            setApproved("Successfully Approved");

            // swapping

            const to = await provider.getSigner();
            const response = await swapTokens(
              provider,
              tokenInstance1.target.toString(),
              tokenInstance2.target.toString(),
              bn_amount1.toString(),
              to.address
            );
            console.log(response);
            if (response) {
              setSwapped("Successfully Swapped");
            }
          }
        }
      }
    } catch (error) {
      setErrorMessage("Error swapping tokens");
    }
  };

  return (
    <div className="swap-box">
      <div className="input-container">
        <span className="label">From:</span>
        <select
          className="select-field"
          value={selectedToken1}
          onChange={(e) => setSelectedToken1(e.target.value)}
        >
          <option>Choose Token</option>
          <option value="LOG">LOG</option>
          <option value="ETH">ETH</option>
          <option value="DAI">DAI</option>
          <option value="USDT">USDT</option>
        </select>
      </div>

      <div className="input-container">
        <span className="label">{selectedToken1}:</span>
        <input
          type="text"
          className="input-field"
          placeholder="0.00"
          value={amount1}
          onChange={(e) => setAmount1(e.target.value)}
        />
      </div>

      <div className="input-container">
        <span className="label">To:</span>
        <select
          className="select-field"
          value={selectedToken2}
          onChange={(e) => setSelectedToken2(e.target.value)}
        >
          <option>Choose Token</option>
          <option value="LOG">LOG</option>
          <option value="ETH">ETH</option>
          <option value="DAI">DAI</option>
          <option value="USDT">USDT</option>
        </select>
      </div>

      <div className="input-container">
        <span className="label">{selectedToken2}:</span>
        <label className="input-field">{amount2 ? amount2 : 0}</label>
      </div>

      <div className="swap-button-container">
        <button className="swap-button" onClick={handleSwap}>
          Swap
        </button>
      </div>
    </div>
  );
};

export default SwapBox;
