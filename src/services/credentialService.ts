import { Eip712Signer } from "did-jwt-eip712-signer";
import {
  createVerifiableCredentialJwt,
  createVerifiablePresentationJwt,
  type Issuer,
  type JwtCredentialPayload,
  type JwtPresentationPayload,
} from "did-jwt-vc";
import { type AccountInfo, DOMAIN } from "../types";

export const createVerifiableCredential = async (account: AccountInfo) => {
  const classSigner = new Eip712Signer(account.signer);

  const issuer: Issuer = {
    did: `did:ethr:sepolia:${account.address}`,
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
    domain: DOMAIN,
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

  const vpPayload: JwtPresentationPayload = {
    vp: {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiablePresentation"],
      verifiableCredential: [vcJwt],
    },
    domain: DOMAIN,
  };

  return await createVerifiablePresentationJwt(vpPayload, issuer);
};