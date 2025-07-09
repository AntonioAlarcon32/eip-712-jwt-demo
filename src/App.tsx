// src/App.tsx

import { useState, useEffect } from "react";
import { BrowserProvider, type Signer, type TypedDataDomain } from "ethers";
import { decodeJWT } from "did-jwt";
import { Resolver } from "did-resolver";
import { getResolver } from "ethr-did-resolver";
import { Eip712Signer, Eip712Verifier } from "did-jwt-eip712-signer";
import {
  createVerifiableCredentialJwt,
  createVerifiablePresentationJwt,
  type Issuer,
  type JwtCredentialPayload,
  type JwtPresentationPayload,
  verifyCredential,
  verifyPresentation,
} from "did-jwt-vc";

import { WalletConnectButton } from "./WalletConnectButton"; // Import the new component
import "./App.css";
import { REGISTRIES, DOMAIN, type AccountInfo } from "./types"; // Import the types and constants
import { createVerifiableCredential, createVerifiablePresentation } from "./services/credentialService"; // Import the credential service


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
          registry: REGISTRIES.sepolia, // Use the constant from types
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
      "did:ethr:sepolia:" + (await signer.address)
    );
    console.log("Verification Response:", verificationResponseVar);
    setVerificationResponse(JSON.stringify(verificationResponseVar, null, 4));
  }

  async function verifyVC() {
    if (!resolver) {
      console.error("Resolver not set");
      return;
    }
    const classVerifier = new Eip712Verifier();
    const verifiedVC = await verifyCredential(
      vcJwt,
      resolver,
      undefined,
      classVerifier
    );
    setValidationState(JSON.stringify(verifiedVC, null, 4));
    setDecodedJwt(JSON.stringify(decodeJWT(vcJwt), null, 4));
    // const verifiedVC = await verifyJWT(vcJwt, { resolver, audience: "did:ethr:sepolia:" + selectedAccount }, classVerifier);
    // console.log(verifiedVC);
    // setValidationState(JSON.stringify(verifiedVC, null, 4));
  }

  async function verifyVP() {
    if (!resolver) {
      console.error("Resolver not set");

      return;
    }

    const classVerifier = new Eip712Verifier();
    console.log("VP JWT:", vpJwt);

    const verifiedVP = await verifyPresentation(
      vpJwt,
      resolver,
      undefined,
      classVerifier
    );

    console.log(verifiedVP);

    setValidationStateVp(JSON.stringify(verifiedVP, null, 4));

    setDecodedVp(JSON.stringify(decodeJWT(vpJwt), null, 4));
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
            <div key={accountInfo.address}>
              {" "}
              {/* The key is now synchronous and safe */}
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

      <div style={{ marginBottom: "20px" }}></div>
      <button
        onClick={() => {
          if (!signer) {
            console.error("Not connected");
            return;
          }
          createVerifiableCredential(signer)
            .then((result) => {
              if (!result) {
                console.error("Failed to create VC");
                return;
              }
              const { vcJwt, issuer } = result;
              setVcJwt(vcJwt);
              setDecodedVcJwt(JSON.stringify(decodeJWT(vcJwt), null, 4));
              console.log("VC JWT:", vcJwt);
              console.log("Issuer:", issuer);
            })
            .catch(console.error);
        }}
      >
        VC Creation
      </button>
      <div style={{ marginBottom: "20px" }}></div>
      <text>{vcJwt}</text>
      <div style={{ marginBottom: "20px" }}></div>
      <button onClick={verifyVC}>Validate VC</button>

      <div style={{ marginBottom: "20px" }}></div>
      <text>{validationState}</text>
      <div style={{ marginBottom: "20px" }}></div>
      <text>{decodedJwt}</text>
      <div style={{ marginBottom: "20px" }}></div>
      <button
        onClick={() => {
          if (!signer) {
            console.error("Not connected");
            return;
          }
          createVerifiablePresentation(signer, vcJwt)
            .then((result) => {
              if (!result) {
                console.error("Failed to create VP");
                return;
              }
              setVpJwt(result);
              console.log("VP JWT:", vpJwt);
            })
            .catch(console.error);
        }}
      >
        VP Creation
      </button>
      <div style={{ marginBottom: "20px" }}></div>
      <text>{vpJwt}</text>
      <div style={{ marginBottom: "20px" }}></div>

      <div style={{ marginBottom: "20px" }}></div>

      <button onClick={verifyVP}>Validate VP</button>

      <div style={{ marginBottom: "20px" }}></div>

      <text>{validationStateVp}</text>

      <div style={{ marginBottom: "20px" }}></div>

      <text>{decodedVp}</text>
    </>
  );
}

export default App;
