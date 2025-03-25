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
import {
  createVerifiableCredentialJwt,
  createVerifiablePresentationJwt,
  Issuer,
  JwtCredentialPayload,
  JwtPresentationPayload,
  verifyCredential,
  verifyPresentation,
} from "did-jwt-vc";

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
  const [validationState, setValidationState] = useState("");
  const [vpJwt, setVpJwt] = useState("");
  const [validationStateVp, setValidationStateVp] = useState("");
  const [decodedVp, setDecodedVp] = useState("");

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

    const issuer = {
      did: "did:ethr:sepolia:" + selectedAccount,
      alg: "EIP712",
      signer: classSigner,
    } as Issuer;

    const vcPayload: JwtCredentialPayload = {
      sub: "did:ethr:0x435df3eda57154cf8cf7926079881f2912f54db4",
      nbf: 1562950282,
      vc: {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiableCredential"],
        credentialSubject: {
          degree: {
            type: "BachelorDegree",
            name: "Baccalauréat en musiques numériques",
          },
        },
      },
      domain: domain,
    };

    const vcJwt = await createVerifiableCredentialJwt(vcPayload, issuer);
    setVcJwt(vcJwt);
    // const jwt = await createJWT(
    //   {
    //     aud: "did:ethr:sepolia:" + selectedAccount,
    //     name: "uPort Developer",
    //     domain: domain,
    //   },
    //   { issuer: "did:ethr:sepolia:" + selectedAccount, signer: classSigner },
    //   { typ: "JWT", alg: "EIP712" }
    // );
    // setVcJwt(jwt);
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

  async function createVP() {
    if (!signer) {
      console.error("Not connected to MetaMask");
      return;
    }
    const classSigner = new Eip712Signer(signer);

    const issuer = {
      did: "did:ethr:sepolia:" + selectedAccount,
      alg: "EIP712",
      signer: classSigner,
    } as Issuer;

    const vpPayload: JwtPresentationPayload = {
      vp: {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiablePresentation"],
        verifiableCredential: [vcJwt],
      },
      domain,
    };
    const vpJwt = await createVerifiablePresentationJwt(vpPayload, issuer);
    setVpJwt(vpJwt);
  }

  async function verifyVP() {
    if (!resolver) {
      console.error("Resolver not set");
      return;
    }
    const classVerifier = new Eip712Verifier();
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
          <div style={{ marginBottom: "20px" }}></div>
          <text>{decodedJwt}</text>
          <div style={{ marginBottom: "20px" }}></div>
          <button onClick={createVP}>Create VP</button>
          <div style={{ marginBottom: "20px" }}></div>
          <text>{vpJwt}</text>
          <div style={{ marginBottom: "20px" }}></div>
          <button onClick={verifyVP}>Validate VP</button>
          <div style={{ marginBottom: "20px" }}></div>
          <text>{validationStateVp}</text>
          <div style={{ marginBottom: "20px" }}></div>
          <text>{decodedVp}</text>
        </>
      )}
    </>
  );
}

export default App;
