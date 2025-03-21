import { useState } from "react";
import "./App.css";

import { BrowserProvider, Signer, type TypedDataDomain } from "ethers";
import { MetaMaskInpageProvider } from "@metamask/providers";
import { createJWT, decodeJWT, verifyJWT } from "did-jwt";
import { Resolver } from "did-resolver";
import { getResolver } from "ethr-did-resolver";
import { EthrDID } from "ethr-did";
import { mainnet, sepolia } from "@reown/appkit/networks";
import { Provider } from "ethers";
import { Eip712Signer, Eip712Verifier } from "did-jwt-eip712-signer";

declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider;
  }
}

function App() {
  const [accounts, setAccounts] = useState<string[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [resolver, setResolver] = useState<Resolver | null>(null);
  const [decodedJwt, setDecodedJwt] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [signer, setSigner] = useState<Signer | null>(null);
  const [vcJwt, setVcJwt] = useState("");
  const [verificationResponse, setVerificationResponse] = useState("");
  const [decodedVcJwt, setDecodedVcJwt] = useState("");
  const [validationState, setValidationState] = useState("");

  const domain: TypedDataDomain = {
    name: "Verifiable Credential",
    version: "1",
    chainId: sepolia.id, // Sepolia testnet
  };

  const networks = [sepolia, mainnet];

  const registries = {
    mainnet: "0xdca7ef03e98e0dc2b855be647c39abe984fcf21b",
    sepolia: "0x03d5003bf0e79c5f5223588f347eba39afbc3818",
  };

  async function connectToMetaMask() {
    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setAccounts(accounts as string[]);
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        setSigner(signer);
        const address = await signer.getAddress();
        setWalletAddress("Wallet: " + address);
        console.log("Connected to MetaMask");
      } catch (error) {
        console.error("Failed to connect to MetaMask:", error);
      }
    } else {
      console.log("MetaMask is not installed");
    }
  }

  async function handleAccountSelection(account: string) {
    setSelectedAccount(account);
    const provider = new BrowserProvider(window.ethereum!);
    const signer = await provider.getSigner(account);
    setSigner(signer);

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
      "did:ethr:sepolia:" + selectedAccount
    );
    console.log("Verification Response:", verificationResponseVar);
    setVerificationResponse(JSON.stringify(verificationResponseVar, null, 4));
  }

  async function prepareVCCreation() {
    if (!signer) {
      console.error("Not connected to MetaMask");
      return;
    }
    const classSigner = new Eip712Signer(signer);

    const jwt = await createJWT(
      {
        aud: "did:ethr:sepolia:" + selectedAccount,
        name: "uPort Developer",
        domain: domain,
      },
      { issuer: "did:ethr:sepolia:" + selectedAccount, signer: classSigner },
      { typ: "JWT", alg: "EIP712" }
    );
    setVcJwt(jwt);
  }

  async function verifyVC() {
    if (!resolver) {
      console.error("Resolver not set");
      return;
    }
    const classVerifier = new Eip712Verifier();
    try {
    const verifiedVC = await verifyJWT(vcJwt, { resolver, audience: "did:ethr:sepolia:" + selectedAccount }, classVerifier);
    console.log(verifiedVC);
    setValidationState(JSON.stringify(verifiedVC, null, 4));
    } catch (error) {
      if (error.message === "JWT audience does not match your DID") {
        console.log("JWT audience does not match your DID");
      }
      else if (error.message === "Error: Signature verification failed") {
        console.log("Signature verification failed");
      }
    }
    
  }

  return (
    <>
      <button onClick={connectToMetaMask}>Connect to MetaMask</button>
      <div style={{ marginBottom: "20px" }}></div>
      {accounts.length > 0 && (
        <div>
          <h3>Select an account:</h3>
          {accounts.map((account) => (
            <div key={account}>
              <input
                type="radio"
                id={account}
                name="account"
                value={account}
                checked={selectedAccount === account}
                onChange={() => handleAccountSelection(account)}
              />
              <label htmlFor={account}>{account}</label>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginBottom: "20px" }}></div>
      {selectedAccount && (
        <>
          <p>Selected Account: {selectedAccount}</p>
          <div style={{ marginBottom: "20px" }}></div>
          <button onClick={resolveDID}>Resolve DID</button>
          <div style={{ marginBottom: "20px" }}></div>
          <text>{verificationResponse}</text>
          <div style={{ marginBottom: "20px" }}></div>
          <button onClick={prepareVCCreation}>VC Creation</button>
          <div style={{ marginBottom: "20px" }}></div>
          <text>{vcJwt}</text>
          <div style={{ marginBottom: "20px" }}></div>
          <button onClick={verifyVC}>Validate VC</button>
          <div style={{ marginBottom: "20px" }}></div>
          <text>{validationState}</text>
        </>
      )}
    </>
  );
}

export default App;
