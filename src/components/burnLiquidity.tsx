import React, { useState } from "react";
import { useEffect } from "react";
import { ethers } from "ethers";
import {
  burnTokens,
  getCoreInstance,
  getProvider,
  getTokenInstanceFromName,
} from "../api/web3";

const Burn: React.FC = () => {
  const [selectedToken1, setSelectedToken1] = useState<string>("");
  const [selectedToken2, setSelectedToken2] = useState<string>("");
  const [core, setCore] = useState<ethers.Contract | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>("");
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [burn, setBurn] = useState<string>("");

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
    if (errorMessage) {
      const shouldReload = window.confirm(errorMessage);
      if (shouldReload) {
        window.location.reload();
      }
    }
  }, [errorMessage]);

  useEffect(() => {
    if (burn) {
      window.confirm(burn);
    }
  }, [burn]);

  const handleBurn = async () => {
    try {
      if (core && provider) {
        const token0Instance = await getTokenInstanceFromName(
          provider,
          selectedToken1
        );
        const token1Instance = await getTokenInstanceFromName(
          provider,
          selectedToken2
        );
        if (
          token0Instance &&
          token1Instance &&
          (await burnTokens(
            provider,
            token0Instance.target.toString(),
            token1Instance.target.toString()
          ))
        ) {
          setBurn("Successfully Burned");
        }
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Burning Tokens failed");
    }
  };

  return (
    <div className="swap-box">
      <div className="input-container">
        <span className="label">Token 1:</span>
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
        <span className="label">Token 2:</span>
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

      <div className="swap-button-container">
        <button className="swap-button" onClick={handleBurn}>
          Burn
        </button>
      </div>
    </div>
  );
};

export default Burn;
