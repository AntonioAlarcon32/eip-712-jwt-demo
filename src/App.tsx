// src/App.tsx

import { useState, useEffect } from "react";
import { BrowserProvider, type Network } from "ethers";
import { decodeJWT } from "did-jwt";
import { Resolver } from "did-resolver";
import { getResolver } from "ethr-did-resolver";
import { Eip712Verifier } from "did-jwt-eip712-signer";
import { verifyCredential, verifyPresentation } from "did-jwt-vc";

import { WalletConnectButton } from "./WalletConnectButton";
import "./App.css";
import { REGISTRIES, type AccountInfo } from "./types";
import { createVerifiableCredential, createVerifiablePresentation } from "./services/credentialService";

type StepStatus = 'pending' | 'active' | 'completed' | 'disabled';

interface Step {
  id: number;
  title: string;
  description: string;
  status: StepStatus;
}

function App() {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<AccountInfo | null>(null);
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [resolver, setResolver] = useState<Resolver | null>(null);
  const [network, setNetwork] = useState<Network | null>(null);

  // VC States
  const [vcJwt, setVcJwt] = useState("");
  const [decodedVcJwt, setDecodedVcJwt] = useState("");
  const [validationState, setValidationState] = useState("");
  
  // VP States
  const [vpJwt, setVpJwt] = useState("");
  const [validationStateVp, setValidationStateVp] = useState("");
  const [decodedVp, setDecodedVp] = useState("");
  
  // DID States
  const [verificationResponse, setVerificationResponse] = useState("");
  const [decodedJwt, setDecodedJwt] = useState("");
  
  // Loading states
  const [loadingStates, setLoadingStates] = useState({
    creatingVC: false,
    verifyingVC: false,
    creatingVP: false,
    verifyingVP: false,
    resolvingDID: false,
  });

  // Steps configuration
  const [steps, setSteps] = useState<Step[]>([
    { id: 1, title: "Connect Wallet", description: "Connect your wallet to start using DID functionality", status: 'active' },
    { id: 2, title: "Select Account", description: "Choose which account you want to use for DID operations", status: 'disabled' },
    { id: 3, title: "Resolve DID", description: "Resolve your Decentralized Identity on the blockchain", status: 'disabled' },
    { id: 4, title: "Create Verifiable Credential", description: "Generate a new verifiable credential", status: 'disabled' },
    { id: 5, title: "Verify Credential", description: "Validate the created credential", status: 'disabled' },
    { id: 6, title: "Create Verifiable Presentation", description: "Bundle your credential into a presentation", status: 'disabled' },
    { id: 7, title: "Verify Presentation", description: "Validate the presentation", status: 'disabled' },
  ]);

  // Update steps based on current state
  useEffect(() => {
    setSteps(currentSteps => currentSteps.map(step => {
      switch (step.id) {
        case 1:
          return { ...step, status: provider ? 'completed' : 'active' };
        case 2:
          return { ...step, status: provider ? (signer ? 'completed' : 'active') : 'disabled' };
        case 3:
          return { ...step, status: signer ? (verificationResponse ? 'completed' : 'active') : 'disabled' };
        case 4:
          return { ...step, status: verificationResponse ? (vcJwt ? 'completed' : 'active') : 'disabled' };
        case 5:
          return { ...step, status: vcJwt ? (validationState ? 'completed' : 'active') : 'disabled' };
        case 6:
          return { ...step, status: validationState ? (vpJwt ? 'completed' : 'active') : 'disabled' };
        case 7:
          return { ...step, status: vpJwt ? (validationStateVp ? 'completed' : 'active') : 'disabled' };
        default:
          return step;
      }
    }));
  }, [provider, signer, verificationResponse, vcJwt, validationState, vpJwt, validationStateVp]);

  useEffect(() => {
    const fetchAndSetAccounts = async () => {
      if (provider) {
        try {
          const signers = await provider.listAccounts();

          const processedAccounts = await Promise.all(
            signers.map(async (signer) => ({
              signer,
              address: await signer.getAddress(),
            }
          ))
          );
          console.log("Fetched accounts:", processedAccounts);
          setNetwork(await provider.getNetwork());
          setAccounts(processedAccounts);
        } catch (error) {
          console.error("Error fetching accounts:", error);
        }
      } else {
        setSigner(null);
        setAccounts([]);
        setResolver(null);
      }
    };

    fetchAndSetAccounts();
  }, [provider]);

  const handleAccountSelection = async (account: AccountInfo) => {
    if (!provider) return;

    setSigner(account);
    const ethrDidResolver = getResolver({
      networks: [
        {
          name: "sepolia",
          type: "testnet",
          // @ts-expect-error types
          provider: provider,
          registry: REGISTRIES.sepolia,
        },
        {
          name: "mainnet",
          type: "mainnet",
          // @ts-expect-error types
          provider: provider,
          registry: REGISTRIES.mainnet,
        },
      ],
    });
    setResolver(new Resolver(ethrDidResolver));
  };

  const handleResolveDID = async () => {
    if (!signer || !resolver) return;
    console.log(network);
    if (!network || !network.chainId) {
      console.error("Network not available or chainId is missing");
      return;
    }
    setLoadingStates(prev => ({ ...prev, resolvingDID: true }));
    try {
      console.log("Resolving DID for address:", signer.address);
      let didString;
      if (network.name === "sepolia") {
        didString = `did:ethr:sepolia:${signer.address}`;
      }
      else if (network.name === "mainnet") {
        didString = `did:ethr:${signer.address}`;
      } else {
        console.error("Unsupported network chainId:", network.chainId);
        return;
      }
      const response = await resolver.resolve(didString);
      setVerificationResponse(JSON.stringify(response, null, 2));
    } catch (error) {
      console.error("Error resolving DID:", error);
    } finally {
      setLoadingStates(prev => ({ ...prev, resolvingDID: false }));
    }
  };

  const handleCreateVC = async () => {
    if (!signer) return;

    setLoadingStates(prev => ({ ...prev, creatingVC: true }));
    try {
      if (!network || !network.chainId) {
        console.error("Network not available or chainId is missing");
        return;
      }
      const result = await createVerifiableCredential(signer, network);
      setVcJwt(result.vcJwt);
      setDecodedVcJwt(JSON.stringify(decodeJWT(result.vcJwt), null, 2));
    } catch (error) {
      console.error("Error creating VC:", error);
    } finally {
      setLoadingStates(prev => ({ ...prev, creatingVC: false }));
    }
  };

  const handleVerifyVC = async () => {
    if (!resolver || !vcJwt) return;

    setLoadingStates(prev => ({ ...prev, verifyingVC: true }));
    try {
      const verifier = new Eip712Verifier();
      const verifiedVC = await verifyCredential(vcJwt, resolver, undefined, verifier);
      setValidationState(JSON.stringify(verifiedVC, null, 2));
      setDecodedJwt(JSON.stringify(decodeJWT(vcJwt), null, 2));
    } catch (error) {
      console.error("Error verifying VC:", error);
    } finally {
      setLoadingStates(prev => ({ ...prev, verifyingVC: false }));
    }
  };

  const handleCreateVP = async () => {
    if (!signer || !vcJwt) return;

    setLoadingStates(prev => ({ ...prev, creatingVP: true }));
    try {
      const vpJwtResult = await createVerifiablePresentation(signer, vcJwt);
      setVpJwt(vpJwtResult);
    } catch (error) {
      console.error("Error creating VP:", error);
    } finally {
      setLoadingStates(prev => ({ ...prev, creatingVP: false }));
    }
  };

  const handleVerifyVP = async () => {
    if (!resolver || !vpJwt) return;

    setLoadingStates(prev => ({ ...prev, verifyingVP: true }));
    try {
      const verifier = new Eip712Verifier();
      const verifiedVP = await verifyPresentation(vpJwt, resolver, undefined, verifier);
      setValidationStateVp(JSON.stringify(verifiedVP, null, 2));
      setDecodedVp(JSON.stringify(decodeJWT(vpJwt), null, 2));
    } catch (error) {
      console.error("Error verifying VP:", error);
    } finally {
      setLoadingStates(prev => ({ ...prev, verifyingVP: false }));
    }
  };

  const getStatusBadge = (status: StepStatus) => {
    const badges = {
      pending: { text: "Pending", class: "pending" },
      active: { text: "Ready", class: "ready" },
      completed: { text: "Completed", class: "completed" },
      disabled: { text: "Locked", class: "pending" },
    };
    const badge = badges[status];
    return <span className={`status-badge ${badge.class}`}>{badge.text}</span>;
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🔐 DID JWT Demo</h1>
        <p>Complete guide to Decentralized Identity and Verifiable Credentials</p>
        <WalletConnectButton onProviderChange={setProvider} />
      </header>

      <div className="steps-container">
        {/* Step 1: Connect Wallet */}
        <div className={`step-card ${steps[0].status}`}>
          <div className="step-header">
            <div className={`step-number ${steps[0].status}`}>1</div>
            <div>
              <div className="step-title">{steps[0].title}</div>
              {getStatusBadge(steps[0].status)}
            </div>
          </div>
          <div className="step-description">{steps[0].description}</div>
          {provider && (
            <div className="success-message">
              Wallet connected successfully!
            </div>
          )}
        </div>

        {/* Step 2: Select Account */}
        <div className={`step-card ${steps[1].status}`}>
          <div className="step-header">
            <div className={`step-number ${steps[1].status}`}>2</div>
            <div>
              <div className="step-title">{steps[1].title}</div>
              {getStatusBadge(steps[1].status)}
            </div>
          </div>
          <div className="step-description">{steps[1].description}</div>
          
          {accounts.length > 0 && (
            <div className="account-selector">
              {accounts.map((account) => (
                <div 
                  key={account.address} 
                  className={`account-option ${signer?.address === account.address ? 'selected' : ''}`}
                >
                  <label>
                    <input
                      type="radio"
                      name="account"
                      value={account.address}
                      checked={signer?.address === account.address}
                      onChange={() => handleAccountSelection(account)}
                    />
                    <span className="account-address">{account.address}</span>
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Step 3: Resolve DID */}
        <div className={`step-card ${steps[2].status}`}>
          <div className="step-header">
            <div className={`step-number ${steps[2].status}`}>3</div>
            <div>
              <div className="step-title">{steps[2].title}</div>
              {getStatusBadge(steps[2].status)}
            </div>
          </div>
          <div className="step-description">{steps[2].description}</div>
          
          {signer && (
            <button 
              onClick={handleResolveDID} 
              className="action-button"
              disabled={loadingStates.resolvingDID}
            >
              {loadingStates.resolvingDID && <span className="loading-spinner"></span>}
              Resolve DID
            </button>
          )}
          
          {verificationResponse && (
            <>
              <div className="success-message">DID resolved successfully!</div>
              <pre className="response-display">{verificationResponse}</pre>
            </>
          )}
        </div>

        {/* Step 4: Create VC */}
        <div className={`step-card ${steps[3].status}`}>
          <div className="step-header">
            <div className={`step-number ${steps[3].status}`}>4</div>
            <div>
              <div className="step-title">{steps[3].title}</div>
              {getStatusBadge(steps[3].status)}
            </div>
          </div>
          <div className="step-description">{steps[3].description}</div>
          
          {verificationResponse && (
            <button 
              onClick={handleCreateVC} 
              className="action-button"
              disabled={loadingStates.creatingVC}
            >
              {loadingStates.creatingVC && <span className="loading-spinner"></span>}
              Create Verifiable Credential
            </button>
          )}
          
          {vcJwt && (
            <>
              <div className="success-message">Verifiable Credential created!</div>
              <div className="jwt-display">{vcJwt}</div>
            </>
          )}
        </div>

        {/* Step 5: Verify VC */}
        <div className={`step-card ${steps[4].status}`}>
          <div className="step-header">
            <div className={`step-number ${steps[4].status}`}>5</div>
            <div>
              <div className="step-title">{steps[4].title}</div>
              {getStatusBadge(steps[4].status)}
            </div>
          </div>
          <div className="step-description">{steps[4].description}</div>
          
          {vcJwt && (
            <button 
              onClick={handleVerifyVC} 
              className="action-button"
              disabled={loadingStates.verifyingVC}
            >
              {loadingStates.verifyingVC && <span className="loading-spinner"></span>}
              Verify Credential
            </button>
          )}
          
          {validationState && (
            <>
              <div className="success-message">Credential verified successfully!</div>
              <pre className="response-display">{validationState}</pre>
            </>
          )}
        </div>

        {/* Step 6: Create VP */}
        <div className={`step-card ${steps[5].status}`}>
          <div className="step-header">
            <div className={`step-number ${steps[5].status}`}>6</div>
            <div>
              <div className="step-title">{steps[5].title}</div>
              {getStatusBadge(steps[5].status)}
            </div>
          </div>
          <div className="step-description">{steps[5].description}</div>
          
          {validationState && (
            <button 
              onClick={handleCreateVP} 
              className="action-button"
              disabled={loadingStates.creatingVP}
            >
              {loadingStates.creatingVP && <span className="loading-spinner"></span>}
              Create Verifiable Presentation
            </button>
          )}
          
          {vpJwt && (
            <>
              <div className="success-message">Verifiable Presentation created!</div>
              <div className="jwt-display">{vpJwt}</div>
            </>
          )}
        </div>

        {/* Step 7: Verify VP */}
        <div className={`step-card ${steps[6].status}`}>
          <div className="step-header">
            <div className={`step-number ${steps[6].status}`}>7</div>
            <div>
              <div className="step-title">{steps[6].title}</div>
              {getStatusBadge(steps[6].status)}
            </div>
          </div>
          <div className="step-description">{steps[6].description}</div>
          
          {vpJwt && (
            <button 
              onClick={handleVerifyVP} 
              className="action-button"
              disabled={loadingStates.verifyingVP}
            >
              {loadingStates.verifyingVP && <span className="loading-spinner"></span>}
              Verify Presentation
            </button>
          )}
          
          {validationStateVp && (
            <>
              <div className="success-message">Presentation verified successfully! 🎉</div>
              <pre className="response-display">{validationStateVp}</pre>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
