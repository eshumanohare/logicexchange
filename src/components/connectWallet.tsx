import React, { useState, useEffect } from "react";
import {
  connectToMetamask,
  getCoreInstance,
  getTokenInstance,
} from "../api/web3";
import { ethers } from "ethers";
import "./connectWallet.css";
import SwapBox from "./swap";
import AddLiquidity from "./addLiquidity";
import Burn from "./burnLiquidity";
import Reserves from "./reserves";

const ConnectWallet: React.FC = () => {
  const [accounts, setAccounts] = useState<string[]>([]);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [networkName, setnetworkName] = useState<string | null>(null);
  const [isAddLiquidityOpen, setisLiquidityOpen] = useState<boolean>(false);
  const [isSwapBoxOpen, setIsSwapBoxOpen] = useState<boolean>(true);
  const [isBurnLiquidityOpen, setisBurnLiquidityOpen] =
    useState<boolean>(false);
  const [isReservesOpen, setIsReservesOpen] = useState<boolean>(false);

  // @ts-ignore
  const ethereum = window.ethereum;

  useEffect(() => {
    const connect = async () => {
      const result = await connectToMetamask();
      if (typeof result === "string") {
        setErrorMessage(result);
      } else {
        setAccounts(result.accounts);
        setProvider(result.provider);
        const network = await result.provider?.getNetwork();
        setnetworkName(
          network?.name
            ? network?.name.charAt(0).toUpperCase() + network?.name.slice(1)
            : "Unknown Network"
        );
        if (ethereum?.on) {
          ethereum.on("chainChanged", () => {
            window.location.reload();
          });
          ethereum.on("accountsChanged", (newAccounts: string[]) => {
            setAccounts(newAccounts);
          });
        }
      }
    };
    connect();
  }, [provider]);

  useEffect(() => {
    if (errorMessage) {
      const shouldReload = window.confirm(errorMessage);
      if (shouldReload) {
        window.location.reload();
      }
    }
  }, [errorMessage]);

  const handleAddLiquidityClick = () => {
    setisLiquidityOpen(true);
    setIsSwapBoxOpen(false);
    setisBurnLiquidityOpen(false);
    setIsReservesOpen(false);
  };

  const handleSwapClick = () => {
    setIsSwapBoxOpen(true);
    setisLiquidityOpen(false);
    setisBurnLiquidityOpen(false);
    setIsReservesOpen(false);
  };

  const handleBurnLiquidityClick = () => {
    setisBurnLiquidityOpen(true);
    setIsSwapBoxOpen(false);
    setisLiquidityOpen(false);
    setIsReservesOpen(false);
  };

  const handleReservesClick = () => {
    setIsReservesOpen(true);
    setisBurnLiquidityOpen(false);
    setIsSwapBoxOpen(false);
    setisLiquidityOpen(false);
  };

  const handleWhitepaperClick = () => {
    const ipfsUrl = `https://hackmd.io/@eshumanohare/Sk9qnJrh3`;
    window.open(ipfsUrl, "_blank");
  };

  return (
    <div>
      <div className="connect-wallet-container">
        <div className="title-and-button">
          <span className="exchange-title">🐻‍❄️ LE</span>
          {accounts.length > 0 && (
            <button
              className="add-liquidity-button"
              onClick={handleAddLiquidityClick}
            >
              Add Liquidity
            </button>
          )}

          {accounts.length > 0 && (
            <button
              className="add-liquidity-button"
              onClick={handleBurnLiquidityClick}
            >
              Burn Liquidity
            </button>
          )}

          {accounts.length > 0 && (
            <button className="add-liquidity-button" onClick={handleSwapClick}>
              Swap
            </button>
          )}

          {accounts.length > 0 && (
            <button
              className="add-liquidity-button"
              onClick={handleReservesClick}
            >
              Reserves
            </button>
          )}
        </div>
        <div>
          <button
            className="whitepaper-button"
            style={{ marginRight: "25px" }}
            onClick={handleWhitepaperClick}
          >
            Whitepaper
          </button>

          {accounts.length > 0 && (
            <span className="network-button">Network: {networkName} </span>
          )}
          {accounts.length > 0 && (
            <span className="account-button">
              {accounts[0].slice(0, 5)}...{accounts[0].slice(-3)}
            </span>
          )}
        </div>
      </div>
      {isSwapBoxOpen && <SwapBox />}
      {isAddLiquidityOpen && <AddLiquidity />}
      {isBurnLiquidityOpen && <Burn />}
      {isReservesOpen && <Reserves />}
    </div>
  );
};

export default ConnectWallet;
