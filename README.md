# EIP 712 In Verifiable Credentials Demo

A React application for demonstrating Decentralized Identifiers (DIDs), Verifiable Credentials (VCs), and Verifiable Presentations (VPs) using EIP-712 signatures.

## Features

- Connect to Metamask with an account.
- Resolve DID of account to DID Document
- Create and verify Verifiable Credentials with EIP-712
- Create and verify Verifiable Presentations with EIP-712

## Tech Stack
- React & Typescript.
- Modified [did-jwt library](https://github.com/AntonioAlarcon32/did-jwt)
- Modified [did-jwt-vc library](https://github.com/AntonioAlarcon32/did-jwt-vc)
- Custom [EIP-712 Signer](https://github.com/AntonioAlarcon32/did-jwt-eip712-signer)

## Installation
1. Clone the repository
  ```bash
  git clone https://github.com/AntonioAlarcon32/eip-712-jwt-demo
  ```
2. Install dependencies using pnpm
  ```bash
  pnpm install
  ```
3. Start the development server
  ```bash
  pnpm run dev
  ```