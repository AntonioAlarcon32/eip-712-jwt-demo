import { Eip712Signer } from "did-jwt-eip712-signer";
import {
  createVerifiableCredentialJwt,
  createVerifiablePresentationJwt,
  type Issuer,
  type JwtCredentialPayload,
  type JwtPresentationPayload,
} from "did-jwt-vc";
import { type AccountInfo, DOMAIN_MAINNET, DOMAIN_SEPOLIA } from "../types";
import type { Network } from "ethers";
import type { TypedDataDomain } from "ethers";

export const createVerifiableCredential = async (account: AccountInfo, network: Network) => {
  const classSigner = new Eip712Signer(account.signer);

  //Get did from the account address
    if (!account.address) {
    throw new Error("Account address is required to create a Verifiable Credential");
    }
    if (!account.signer.provider) {
    throw new Error("Account signer provider is required to create a Verifiable Credential");
    }
    if (!network || !network.chainId) {
    throw new Error("Network not available or chainId is missing");
    }
    let did: string;
    let domain: TypedDataDomain;
    //build did according to the network
    if (network.name === "sepolia") { // Sepolia
        did = `did:ethr:sepolia:${account.address}`;
        domain = DOMAIN_SEPOLIA;
        }
    else if (network.name === "mainnet") { // Mainnet
        did = `did:ethr:${account.address}`;
        domain = DOMAIN_MAINNET;
        }
    else {
        throw new Error("Unsupported network for DID creation");
    }

  const issuer: Issuer = {
    did: did,
    alg: "EIP712",
    signer: classSigner,
  };

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
  return { vcJwt, issuer };
};

export const createVerifiablePresentation = async (
  account: AccountInfo,
  vcJwt: string
) => {
  const classSigner = new Eip712Signer(account.signer);

  const issuer: Issuer = {
    did: `did:ethr:sepolia:${account.address}`,
    alg: "EIP712",
    signer: classSigner,
  };

  const chain = account.signer.provider?.network?.name;
  const domain = chain === "mainnet" ? DOMAIN_MAINNET : DOMAIN_SEPOLIA;

  const vpPayload: JwtPresentationPayload = {
    vp: {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiablePresentation"],
      verifiableCredential: [vcJwt],
    },
    domain: domain,
  };

  return await createVerifiablePresentationJwt(vpPayload, issuer);
};
