// src/components/WalletConnectButton.tsx

import { useEffect, useState } from "react";
import {
  useAppKit,
  useAppKitAccount,
  useDisconnect,
  useWalletInfo,
  useAppKitProvider,
  type Provider as AppKitProvider, // Renaming to avoid conflict with Ethers' Provider
} from "@reown/appkit/react";
import { BrowserProvider, type Eip1193Provider, formatEther } from "ethers";

// Define the types for the props our component will accept
interface WalletConnectButtonProps {
  // This is the function the parent will pass down
  // to receive the provider instance.
  onProviderChange: (provider: BrowserProvider | null) => void;
}

export function WalletConnectButton({ onProviderChange }: WalletConnectButtonProps) {
  // All the hooks from AppKit live inside this component now
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();
  const { address, isConnected } = useAppKitAccount();
  const { walletInfo } = useWalletInfo();
  const { walletProvider } = useAppKitProvider<AppKitProvider>("eip155");

  const [balance, setBalance] = useState("");

  // This useEffect is the key to passing the provider up
  useEffect(() => {
    if (walletProvider && address) {
      // Create a new Ethers provider instance using the raw provider from the hook
      const ethersProvider = new BrowserProvider(walletProvider as Eip1193Provider);
      
      // Call the function from props to pass the provider to the parent
      onProviderChange(ethersProvider);

      // --- Internal logic to fetch balance (stays within this component) ---
      const getBalance = async () => {
        try {
          const balanceBigInt = await ethersProvider.getBalance(address);
          setBalance(formatEther(balanceBigInt));
        } catch (error) {
          console.error("Failed to get balance:", error);
        }
      };
      getBalance();
      
    } else {
      // When disconnected, clear the balance and notify the parent
      setBalance("");
      onProviderChange(null);
    }
    // Dependency array ensures this runs when connection state changes
  }, [walletProvider, address, onProviderChange]);

  const handleWalletAction = async () => {
    if (isConnected) {
      await disconnect();
    } else {
      await open();
    }
  };

  return (
    <div className="wallet-container">
      <button onClick={handleWalletAction}>
        {isConnected ? "Disconnect" : "Connect Wallet"}
      </button>
    </div>
  );
}