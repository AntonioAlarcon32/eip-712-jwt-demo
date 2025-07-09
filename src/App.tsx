// src/App.tsx

import { useState, useEffect } from "react";
import {
  createAppKit,
  useAppKitAccount,
} from "@reown/appkit/react";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { mainnet, sepolia } from "@reown/appkit/networks";
import { BrowserProvider, type Signer, type TypedDataDomain, } from "ethers";
import { createJWT, decodeJWT, verifyJWT } from "did-jwt";
import { Resolver } from "did-resolver";
import { getResolver } from "ethr-did-resolver";
import { EthrDID } from "ethr-did";
import { Eip712Signer, Eip712Verifier } from "did-jwt-eip712-signer";

import { WalletConnectButton } from "./WalletConnectButton"; // Import the new component
import "./App.css";

const projectId = import.meta.env.VITE_PROJECT_ID; // Ensure you have this in your .env.local file

// 2. Set the networks
const networks = [sepolia, mainnet];

// 3. Create a metadata object - optional
const metadata = {
  name: "My Website",
  description: "My Website description",
  url: "https://mywebsite.com", // origin must match your domain & subdomain
  icons: ["https://avatars.mywebsite.com/"],
};

createAppKit({
  adapters: [new EthersAdapter()],
  networks,
  metadata,
  projectId,
  features: {
    analytics: true, // Optional - defaults to your Cloud configuration
  },
});

interface AccountInfo {
  signer: Signer;
  address: string;
}

function App() {
  // State to hold the provider instance, controlled by the child component
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<AccountInfo | null>(null);
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [resolver, setResolver] = useState<Resolver | null>(null);
  const [decodedJwt, setDecodedJwt] = useState("");
  const [vcJwt, setVcJwt] = useState("");
  const [verificationResponse, setVerificationResponse] = useState("");
  const [decodedVcJwt, setDecodedVcJwt] = useState("");
  const [validationState, setValidationState] = useState("");
  const [vpJwt, setVpJwt] = useState("");
  const [validationStateVp, setValidationStateVp] = useState("");
  const [decodedVp, setDecodedVp] = useState("");

  // Effect to log the provider whenever it changes
    // Effect to handle provider changes and fetch accounts
  useEffect(() => {
    // Define an async function inside the effect
    const fetchAndSetAccounts = async () => {
      if (provider) {
        console.log("Ethers Provider set:", provider);

        // 1. Get the list of Signer objects
        const signers = await provider.listAccounts();
        console.log("Fetched signers:", signers);

        // 2. Use Promise.all to asynchronously get the address for EACH signer
        const processedAccounts = await Promise.all(
          signers.map(async (signer) => ({
            signer,
            address: await signer.getAddress(),
          }))
        );

        // 3. Now, store the complete AccountInfo array in state
        setAccounts(processedAccounts);

        // Setup the resolver once the provider is available
        const ethrDidResolver = getResolver({
            networks: [
              {
                name: "sepolia",
                // @ts-expect-error - Ethers provider type mismatch with did-resolver is a common issue
                provider: provider, 
              },
            ],
          });
        const didResolver = new Resolver(ethrDidResolver);
        setResolver(didResolver);

      } else {
        console.log("Ethers Provider is null");
        // Reset all related state on disconnect
        setSigner(null);
        setAccounts([]);
        setResolver(null);
      }
    };

    fetchAndSetAccounts().catch(console.error); // Execute the async function
  }, [provider]); // This effect runs only when the provider changes

  const domain: TypedDataDomain = {
    name: "Verifiable Credential",
    version: "1",
    chainId: sepolia.id, // Sepolia testnet
  };

  const registries = {
    mainnet: "0xdca7ef03e98e0dc2b855be647c39abe984fcf21b",
    sepolia: "0x03d5003bf0e79c5f5223588f347eba39afbc3818",
  };

  async function handleAccountSelection(account: AccountInfo) {
    if (!provider) {
      console.error("Provider is not set");
      return;
    }
    setSigner(account);

    const ethrDidResolver = getResolver({
      networks: [
        {
          name: "sepolia",
          type: "testnet",
          //@ts-expect-error types
          provider: provider,
          registry: registries.sepolia,
        },
      ],
    });
    const resolver = new Resolver(ethrDidResolver);
    setResolver(resolver);
  }

  async function resolveDID() {
    if (!signer) {
      console.error("Not connected to MetaMask");
      return;
    }
    if (!resolver) {
      console.error("Resolver not set");
      return;
    }
    const verificationResponseVar = await resolver.resolve(
      "did:ethr:sepolia:" + await signer.address
    );
    console.log("Verification Response:", verificationResponseVar);
    setVerificationResponse(JSON.stringify(verificationResponseVar, null, 4));
  }

  return (
    <>
      <div className="App">
        <h1>Reown DID JWT Demo</h1>
        <WalletConnectButton onProviderChange={setProvider} />
      </div>
      <div style={{ marginBottom: "20px" }}></div>

      {accounts.length > 0 && (
        <div>
          <h3>Select an account:</h3>
          {/* Now we map over our 'accounts' state which has the address readily available */}
          {accounts.map((accountInfo) => (
            <div key={accountInfo.address}> {/* The key is now synchronous and safe */}
              <label htmlFor={accountInfo.address}>
                <input
                  type="radio"
                  id={accountInfo.address}
                  name="account"
                  value={accountInfo.address}
                  // We check against the `walletAddress` state for simplicity and correctness
                  checked={signer === accountInfo}
                  onChange={() => handleAccountSelection(accountInfo)}
                />
                {accountInfo.address}
              </label>
            </div>
          ))}
        </div>
      )}

      {signer && (
        <div>
          <button onClick={resolveDID}>Resolve my DID</button>
          {verificationResponse && <pre>{verificationResponse}</pre>}
        </div>
      )}
    </>
  );
}

export default App;