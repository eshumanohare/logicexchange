import { BigNumberish, ethers } from "ethers";
import { Contract } from "ethers";
import addresses from "../addresses.json";
import TokenArtifact from "../artifacts/contracts/Token.sol/Token.json";
import CoreArtifact from "../artifacts/contracts/CoreLogic.sol/CoreLogic.json";
import PairArtifact from "../artifacts/contracts/PairLogic.sol/PairLogic.json";

export async function connectToMetamask(): Promise<
  | {
      accounts: string[];
      provider: ethers.BrowserProvider;
    }
  | string
> {
  // @ts-ignore
  const ethereum = window.ethereum;
  if (typeof ethereum != undefined) {
    try {
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });
      const provider = new ethers.BrowserProvider(ethereum);

      return { accounts, provider };
    } catch (error) {
      return "Error connecting to Metamask. Please try again.";
    }
  } else {
    return "Metamask not found. Please install Metamask.";
  }
}
const tokenABI = TokenArtifact.abi;

export async function getProvider(): Promise<
  | {
      provider: ethers.BrowserProvider;
    }
  | string
> {
  // @ts-ignore
  const ethereum = window.ethereum;
  if (typeof ethereum != undefined) {
    try {
      const provider = new ethers.BrowserProvider(ethereum);
      return provider;
    } catch (error) {
      return "Error cannot get provider";
    }
  } else {
    return "Metamask not found. Please install Metamask";
  }
}

export async function getTokenInstance(
  provider: ethers.BrowserProvider,
  tokenAddr: string
): Promise<ethers.Contract> {
  try {
    const signer = await provider.getSigner();
    const tokenInstance = new Contract(tokenAddr, tokenABI, signer);
    return tokenInstance;
  } catch (error) {
    throw new Error(
      "Error creating Token instance. Please check the ABI and address."
    );
  }
}

const coreABI = CoreArtifact.abi;
const core = addresses.coreAddr;

export async function getCoreInstance(
  provider: ethers.BrowserProvider
): Promise<ethers.Contract> {
  try {
    const signer = await provider.getSigner();
    const coreInstance = new Contract(core, coreABI, signer);
    return coreInstance;
  } catch (error) {
    throw new Error("Error creating Core instance");
  }
}

const pairABI = PairArtifact.abi;

export async function getPairInstance(
  provider: ethers.BrowserProvider,
  pair: string
): Promise<ethers.Contract> {
  try {
    const signer = await provider.getSigner();
    const pairInstance = new Contract(pair, pairABI, signer);
    return pairInstance;
  } catch (error) {
    throw new Error("Error creating Pair instance");
  }
}

export async function approveFromToken(
  provider: ethers.BrowserProvider,
  tokenInstance: ethers.Contract,
  spenderAddr: string,
  value: BigNumberish
): Promise<boolean> {
  try {
    const signer = await provider.getSigner();
    const tx = await tokenInstance.approve(spenderAddr, value, {
      from: signer,
    });
    await tx.wait();
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function addLiquidity(
  provider: ethers.BrowserProvider,
  token0Addr: string,
  token1Addr: string,
  token0Value: string,
  token1Value: string
): Promise<boolean> {
  try {
    const core = await getCoreInstance(provider);
    const tx = await core.addLiquidity(
      token0Addr,
      token1Addr,
      token0Value,
      token1Value
    );
    await tx.wait();
    return true;
  } catch (error) {
    window.confirm("Add Liquidity Failed");
    window.location.reload();
    console.error(error);
    return false;
  }
}

export async function getTokenInstanceFromName(
  provider: ethers.BrowserProvider,
  name: string
): Promise<ethers.Contract | null> {
  if (provider) {
    if (name === "LOG") {
      const tokenInstance = await getTokenInstance(
        provider,
        addresses.logicAddr
      );
      return tokenInstance;
    } else if (name === "ETH") {
      const tokenInstance = await getTokenInstance(provider, addresses.ethAddr);
      return tokenInstance;
    } else if (name === "DAI") {
      const tokenInstance = await getTokenInstance(provider, addresses.daiAddr);
      return tokenInstance;
    } else if (name === "USDT") {
      const tokenInstance = await getTokenInstance(
        provider,
        addresses.usdtAddr
      );
      return tokenInstance;
    }
  }
  return null;
}

export async function swapTokens(
  provider: ethers.BrowserProvider,
  token0Addr: string,
  token1Addr: string,
  token0In: string,
  to: string
): Promise<boolean> {
  try {
    const signer = await provider.getSigner();
    const logicInstance = await getTokenInstance(provider, addresses.logicAddr);
    let bal = await logicInstance.balanceOf(signer);
    // console.log(`${bal}`);

    const core = await getCoreInstance(provider);
    const pair = await core.pairMap(token0Addr, token1Addr);
    const pairInstance = await getPairInstance(provider, pair);
    let share0 = await pairInstance.lpShares(signer, 2);
    let share1 = await pairInstance.lpShares(signer, 3);
    console.log(`${share0} ${share1}`);
    const tx = await core.swapTokens(token0Addr, token1Addr, token0In, to);
    await tx.wait();
    share0 = await pairInstance.lpShares(signer, 2);
    share1 = await pairInstance.lpShares(signer, 3);
    console.log(`${share0} ${share1}`);

    bal = await logicInstance.balanceOf(signer);
    // console.log(`${bal}`);

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function tokensYouGetAfterSwap(
  provider: ethers.BrowserProvider,
  token0Addr: string,
  token1Addr: string,
  token0In: string
): Promise<string | null> {
  const core = await getCoreInstance(provider);
  const pair = await core.pairMap(token0Addr, token1Addr);
  const pairInstance = await getPairInstance(provider, pair);
  const token0Balanced = await pairInstance._calculateOptimalToken0ToSwap(
    token0In
  );
  const token1Balanced = await pairInstance._calculateOptimalToken1ToSwap(
    token0Balanced
  );
  return token1Balanced;
}

export async function burnTokens(
  provider: ethers.BrowserProvider,
  token0Addr: string,
  token1Addr: string
): Promise<boolean> {
  try {
    const core = await getCoreInstance(provider);
    const tx = await core.burn(token0Addr, token1Addr);
    const receipt = await tx.wait();
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}
