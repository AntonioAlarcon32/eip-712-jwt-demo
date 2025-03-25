import { useState, useEffect } from "react";
import "./App.css";

import { BrowserProvider, Signer, type TypedDataDomain } from "ethers";
import { MetaMaskInpageProvider } from "@metamask/providers";
import { createJWT, decodeJWT, verifyJWT } from "did-jwt";
import { Resolver } from "did-resolver";
import { getResolver } from "ethr-did-resolver";
import { EthrDID } from "ethr-did";
import { mainnet, sepolia } from "@reown/appkit/networks";
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
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [resolver, setResolver] = useState(null);
  const [decodedJwt, setDecodedJwt] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [signer, setSigner] = useState(null);
  const [vcJwt, setVcJwt] = useState("");
  const [verificationResponse, setVerificationResponse] = useState("");
  const [validationState, setValidationState] = useState("");
  const [vpJwt, setVpJwt] = useState("");
  const [validationStateVp, setValidationStateVp] = useState("");
  const [decodedVp, setDecodedVp] = useState("");
  const [activeTab, setActiveTab] = useState("connect");
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({ message: "", type: "" });

  const domain = {
    name: "Verifiable Credential",
    version: "1",
    chainId: sepolia.id, // Sepolia testnet
  };

  const registries = {
    mainnet: "0xdca7ef03e98e0dc2b855be647c39abe984fcf21b",
    sepolia: "0x03d5003bf0e79c5f5223588f347eba39afbc3818",
  };

  // Show notification for 3 seconds
  useEffect(() => {
    if (notification.message) {
      const timer = setTimeout(() => {
        setNotification({ message: "", type: "" });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  async function connectToMetaMask() {
    if (typeof window.ethereum !== "undefined") {
      try {
        setIsLoading(true);
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setAccounts(accounts);
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        setSigner(signer);
        const address = await signer.getAddress();
        setWalletAddress(address);
        setNotification({ message: "Connected to MetaMask", type: "success" });
        setActiveTab("account");
      } catch (error) {
        console.error("Failed to connect to MetaMask:", error);
        setNotification({ message: "Failed to connect to MetaMask", type: "error" });
      } finally {
        setIsLoading(false);
      }
    } else {
      setNotification({ message: "MetaMask is not installed", type: "error" });
    }
  }

  async function handleAccountSelection(account) {
    try {
      setIsLoading(true);
      setSelectedAccount(account);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner(account);
      setSigner(signer);

      const ethrDidResolver = getResolver({
        networks: [
          {
            name: "sepolia",
            type: "testnet",
            provider: provider,
            registry: registries.sepolia,
          },
        ],
      });
      const resolver = new Resolver(ethrDidResolver);
      setResolver(resolver);
      setNotification({ message: "Account selected", type: "success" });
    } catch (error) {
      console.error("Error selecting account:", error);
      setNotification({ message: "Error selecting account", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }

  async function resolveDID() {
    if (!signer) {
      setNotification({ message: "Not connected to MetaMask", type: "error" });
      return;
    }
    if (!resolver) {
      setNotification({ message: "Resolver not set", type: "error" });
      return;
    }
    
    try {
      setIsLoading(true);
      const verificationResponseVar = await resolver.resolve(
        "did:ethr:sepolia:" + selectedAccount
      );
      console.log("Verification Response:", verificationResponseVar);
      setVerificationResponse(JSON.stringify(verificationResponseVar, null, 4));
      setNotification({ message: "DID resolved successfully", type: "success" });
    } catch (error) {
      console.error("Error resolving DID:", error);
      setNotification({ message: "Error resolving DID", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }

  async function prepareVCCreation() {
    if (!signer) {
      setNotification({ message: "Not connected to MetaMask", type: "error" });
      return;
    }
    
    try {
      setIsLoading(true);
      const classSigner = new Eip712Signer(signer);

      const issuer = {
        did: "did:ethr:sepolia:" + selectedAccount,
        alg: "EIP712",
        signer: classSigner,
      };

      const vcPayload = {
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
      setNotification({ message: "VC created successfully", type: "success" });
    } catch (error) {
      console.error("Error creating VC:", error);
      setNotification({ message: "Error creating VC", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }

  async function verifyVC() {
    if (!resolver) {
      setNotification({ message: "Resolver not set", type: "error" });
      return;
    }
    
    try {
      setIsLoading(true);
      const classVerifier = new Eip712Verifier();
      const verifiedVC = await verifyCredential(
        vcJwt,
        resolver,
        undefined,
        classVerifier
      );
      setValidationState(JSON.stringify(verifiedVC, null, 4));
      setDecodedJwt(JSON.stringify(decodeJWT(vcJwt), null, 4));
      setNotification({ message: "VC verified successfully", type: "success" });
    } catch (error) {
      console.error("Error verifying VC:", error);
      setNotification({ message: "Error verifying VC", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }

  async function createVP() {
    if (!signer) {
      setNotification({ message: "Not connected to MetaMask", type: "error" });
      return;
    }
    
    try {
      setIsLoading(true);
      const classSigner = new Eip712Signer(signer);

      const issuer = {
        did: "did:ethr:sepolia:" + selectedAccount,
        alg: "EIP712",
        signer: classSigner,
      };

      const vpPayload = {
        vp: {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiablePresentation"],
          verifiableCredential: [vcJwt],
        },
        domain,
      };
      const vpJwt = await createVerifiablePresentationJwt(vpPayload, issuer);
      setVpJwt(vpJwt);
      setNotification({ message: "VP created successfully", type: "success" });
    } catch (error) {
      console.error("Error creating VP:", error);
      setNotification({ message: "Error creating VP", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }

  async function verifyVP() {
    if (!resolver) {
      setNotification({ message: "Resolver not set", type: "error" });
      return;
    }
    
    try {
      setIsLoading(true);
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
      setNotification({ message: "VP verified successfully", type: "success" });
    } catch (error) {
      console.error("Error verifying VP:", error);
      setNotification({ message: "Error verifying VP", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case "connect":
        return (
          <div className="card">
            <h2>Connect Wallet</h2>
            <p>Connect your MetaMask wallet to get started with DIDs, VCs, and VPs.</p>
            <button 
              className="primary-button" 
              onClick={connectToMetaMask}
              disabled={isLoading}
            >
              {isLoading ? "Connecting..." : "Connect to MetaMask"}
            </button>
          </div>
        );
      case "account":
        return (
          <div className="card">
            <h2>Select Account</h2>
            {accounts.length > 0 && (
              <div className="account-list">
                {accounts.map((account) => (
                  <div key={account} className="account-item">
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
            {selectedAccount && (
              <div className="account-info">
                <p><strong>Selected Account:</strong> {selectedAccount}</p>
                <button 
                  className="primary-button" 
                  onClick={() => setActiveTab("did")}
                  disabled={isLoading}
                >
                  Continue to DID Operations
                </button>
              </div>
            )}
          </div>
        );
      case "did":
        return (
          <div className="card">
            <h2>DID Resolution</h2>
            <p>Resolve your DID on the Sepolia network.</p>
            <button 
              className="primary-button" 
              onClick={resolveDID}
              disabled={isLoading}
            >
              {isLoading ? "Resolving..." : "Resolve DID"}
            </button>
            {verificationResponse && (
              <div className="response-container">
                <h3>DID Document</h3>
                <pre>{verificationResponse}</pre>
                <button 
                  className="primary-button" 
                  onClick={() => setActiveTab("vc")}
                  disabled={isLoading}
                >
                  Continue to VC Operations
                </button>
              </div>
            )}
          </div>
        );
      case "vc":
        return (
          <div className="card">
            <h2>Verifiable Credential (VC)</h2>
            <p>Create and verify a Verifiable Credential.</p>
            <div className="button-group">
              <button 
                className="primary-button" 
                onClick={prepareVCCreation}
                disabled={isLoading}
              >
                {isLoading ? "Creating..." : "Create VC"}
              </button>
              <button 
                className="secondary-button" 
                onClick={verifyVC}
                disabled={!vcJwt || isLoading}
              >
                {isLoading ? "Verifying..." : "Verify VC"}
              </button>
            </div>
            {vcJwt && (
              <div className="response-container">
                <h3>Verifiable Credential JWT</h3>
                <div className="jwt-container">
                  <p className="jwt">{vcJwt}</p>
                </div>
              </div>
            )}
            {validationState && (
              <div className="response-container">
                <h3>Validation Result</h3>
                <pre>{validationState}</pre>
              </div>
            )}
            {decodedJwt && (
              <div className="response-container">
                <h3>Decoded JWT</h3>
                <pre>{decodedJwt}</pre>
                <button 
                  className="primary-button" 
                  onClick={() => setActiveTab("vp")}
                  disabled={isLoading}
                >
                  Continue to VP Operations
                </button>
              </div>
            )}
          </div>
        );
      case "vp":
        return (
          <div className="card">
            <h2>Verifiable Presentation (VP)</h2>
            <p>Create and verify a Verifiable Presentation using your VC.</p>
            <div className="button-group">
              <button 
                className="primary-button" 
                onClick={createVP}
                disabled={!vcJwt || isLoading}
              >
                {isLoading ? "Creating..." : "Create VP"}
              </button>
              <button 
                className="secondary-button" 
                onClick={verifyVP}
                disabled={!vpJwt || isLoading}
              >
                {isLoading ? "Verifying..." : "Verify VP"}
              </button>
            </div>
            {vpJwt && (
              <div className="response-container">
                <h3>Verifiable Presentation JWT</h3>
                <div className="jwt-container">
                  <p className="jwt">{vpJwt}</p>
                </div>
              </div>
            )}
            {validationStateVp && (
              <div className="response-container">
                <h3>VP Validation Result</h3>
                <pre>{validationStateVp}</pre>
              </div>
            )}
            {decodedVp && (
              <div className="response-container">
                <h3>Decoded VP</h3>
                <pre>{decodedVp}</pre>
              </div>
            )}
          </div>
        );
      default:
        return <div>Unknown tab</div>;
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>DID & Verifiable Credentials Demo</h1>
        {walletAddress && <p className="wallet-address">Connected: {walletAddress}</p>}
      </header>
      
      {notification.message && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
      
      <nav className="tab-navigation">
        <button 
          className={activeTab === "connect" ? "tab-button active" : "tab-button"} 
          onClick={() => setActiveTab("connect")}
        >
          Connect
        </button>
        <button 
          className={activeTab === "account" ? "tab-button active" : "tab-button"} 
          onClick={() => setActiveTab("account")}
          disabled={!accounts.length}
        >
          Accounts
        </button>
        <button 
          className={activeTab === "did" ? "tab-button active" : "tab-button"} 
          onClick={() => setActiveTab("did")}
          disabled={!selectedAccount}
        >
          DID
        </button>
        <button 
          className={activeTab === "vc" ? "tab-button active" : "tab-button"} 
          onClick={() => setActiveTab("vc")}
          disabled={!resolver}
        >
          VC
        </button>
        <button 
          className={activeTab === "vp" ? "tab-button active" : "tab-button"} 
          onClick={() => setActiveTab("vp")}
          disabled={!vcJwt}
        >
          VP
        </button>
      </nav>
      
      <main className="main-content">
        {renderContent()}
      </main>
      
      <footer className="app-footer">
        <p>DID/VC/VP Demo using Ethereum and Sepolia testnet</p>
      </footer>
    </div>
  );
}

export default App;