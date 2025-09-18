import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, polygon, optimism, arbitrum, base, sepolia } from 'wagmi/chains';

// Define a default project ID to avoid undefined errors
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'default-project-id';

export const config = getDefaultConfig({
  appName: 'Web3 Dropbox',
  projectId,
  chains: [mainnet, polygon, optimism, arbitrum, base, sepolia],
  ssr: true,
});
