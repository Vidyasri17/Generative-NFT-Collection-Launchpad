import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { hardhat, sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
    appName: 'NFT Launchpad',
    projectId: 'YOUR_PROJECT_ID', // Replaced with a placeholder or Env but keeping it simple for now
    chains: [hardhat, sepolia],
    ssr: true, // If your dApp uses server side rendering (SSR)
});
