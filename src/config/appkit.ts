import { createAppKit } from "@reown/appkit/react";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { mainnet, sepolia } from "@reown/appkit/networks";

const projectId = import.meta.env.VITE_PROJECT_ID;

const networks = [sepolia, mainnet];

const metadata = {
  name: "My Website",
  description: "My Website description",
  url: "https://mywebsite.com",
  icons: ["https://avatars.mywebsite.com/"],
};

export const appKit = createAppKit({
  adapters: [new EthersAdapter()],
  //@ts-expect-error types
  networks,
  metadata,
  projectId,
  features: {
    analytics: true,
  },
});

export { sepolia, mainnet };