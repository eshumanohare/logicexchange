import React, { useEffect, useState } from "react";
import {
  getPairInstance,
  getProvider,
  getCoreInstance,
  getTokenInstance,
  approveFromToken,
  addLiquidity,
  getTokenInstanceFromName,
} from "../api/web3";

import { ethers } from "ethers";
import Big from "big.js";

const AddLiquidity: React.FC = () => {
  const [selectedToken1, setSelectedToken1] = useState<string>("");
  const [selectedToken2, setSelectedToken2] = useState<string>("");
  const [amount1, setAmount1] = useState<string>("0");
  const [amount2, setAmount2] = useState<string>("0");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [core, setCore] = useState<ethers.Contract | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [approved, setApproved] = useState<string | null>(null);
  const [approved2, setApproved2] = useState<string | null>(null);
  const [liqAdded, setLiqAdded] = useState<string | null>(null);

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
    if (approved) {
      window.confirm(approved);
    }
  }, [approved]);

  useEffect(() => {
    if (approved2) {
      window.confirm(approved2);
    }
  }, [approved2]);

  useEffect(() => {
    if (liqAdded) {
      window.confirm(liqAdded);
      window.location.reload();
      setLiqAdded(null);
    }
  }, [liqAdded]);

  useEffect(() => {
    if (errorMessage) {
      const shouldReload = window.confirm(errorMessage);
      if (shouldReload) {
        window.location.reload();
      }
    }
  }, [errorMessage]);

  // useEffect(() => {
  //   const fetchEvent = async () => {
  //     if (provider) {
  //       const tokenInstance1 = await getTokenInstanceFromName(
  //         provider,
  //         selectedToken1
  //       );
  //       const tokenInstance2 = await getTokenInstanceFromName(
  //         provider,
  //         selectedToken2
  //       );
  //       if (tokenInstance1 && tokenInstance2) {
  //         await tokenInstance1.on("Transfer", (from, to, value) => {
  //           console.log(`From: ${from} To: ${to} Value: ${value}`);
  //         });
  //         await tokenInstance2.on("Transfer", (from, to, value) => {
  //           console.log(`From: ${from} To: ${to} Value: ${value}`);
  //         });
  //       }
  //     }
  //   };

  //   fetchEvent();
  // }, []);

  const handleAddLiquidity = async () => {
    try {
      if (core && provider) {
        // getting pair instance
        const tokenInstance1 = await getTokenInstanceFromName(
          provider,
          selectedToken1
        );
        const tokenInstance2 = await getTokenInstanceFromName(
          provider,
          selectedToken2
        );

        const pairAddr = await core.pairMap(tokenInstance1, tokenInstance2);

        const bn_amount1 = new Big(amount1).mul(new Big(10).pow(18));

        if (
          tokenInstance1 &&
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
        }

        const bn_amount2 = new Big(amount2).mul(new Big(10).pow(18));

        if (
          tokenInstance2 &&
          bn_amount2 &&
          (await approveFromToken(
            provider,
            tokenInstance2,
            pairAddr,
            bn_amount2.toString()
          ))
        ) {
          const signer = await provider.getSigner();
          setApproved2("Successfully Approved");
        }

        if (
          tokenInstance1 &&
          tokenInstance2 &&
          bn_amount1 &&
          bn_amount2 &&
          (await addLiquidity(
            provider,
            tokenInstance1.target.toString(),
            tokenInstance2.target.toString(),
            bn_amount1.toString(),
            bn_amount2.toString()
          ))
        ) {
          setLiqAdded("Successfully Liquidity Added");
        }
      }
    } catch (error) {
      setErrorMessage("Error while adding liquidity");
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
          {/* Add more options here */}
        </select>
      </div>

      <div className="input-container">
        <span className="label">Amount 1:</span>
        <input
          type="text"
          className="input-field"
          placeholder="0.00"
          value={amount1}
          onChange={(e) => setAmount1(e.target.value)}
        />
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

      <div className="input-container">
        <span className="label">Amount 2:</span>
        <input
          type="text"
          className="input-field"
          placeholder="0.00"
          value={amount2}
          onChange={(e) => setAmount2(e.target.value)}
        />
      </div>

      <div className="swap-button-container">
        <button className="swap-button" onClick={handleAddLiquidity}>
          Add
        </button>
      </div>
    </div>
  );
};

export default AddLiquidity;
