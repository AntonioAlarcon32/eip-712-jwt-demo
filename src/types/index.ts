import { type Signer, type TypedDataDomain } from "ethers";

export interface AccountInfo {
  signer: Signer;
  address: string;
}

export const REGISTRIES = {
  mainnet: "0xdca7ef03e98e0dc2b855be647c39abe984fcf21b",
  sepolia: "0x03d5003bf0e79c5f5223588f347eba39afbc3818",
} as const;

export const DOMAIN: TypedDataDomain = {
  name: "Verifiable Credential",
  version: "1",
  chainId: 11155111, // Sepolia testnet
};