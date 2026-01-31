import { WalletConnect } from '@/components/WalletConnect';
import { Minting } from '@/components/Minting';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900 text-slate-100">
      <WalletConnect />

      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600">
            NFT Launchpad
          </h1>
          <p className="text-slate-400 text-xl max-w-2xl mx-auto">
            A unique collection of generative art living on the Ethereum blockchain.
            Join the community and mint your own piece of history.
          </p>
        </div>

        <Minting />

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="p-6 bg-slate-800 rounded-lg border border-slate-700">
            <div className="text-4xl mb-4">🎨</div>
            <h3 className="text-xl font-bold mb-2">Unique Art</h3>
            <p className="text-slate-400">1000 completely unique generative artworks.</p>
          </div>
          <div className="p-6 bg-slate-800 rounded-lg border border-slate-700">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-bold mb-2">Secure</h3>
            <p className="text-slate-400">Verified Smart Contract (ERC-721) with secure Allowlist.</p>
          </div>
          <div className="p-6 bg-slate-800 rounded-lg border border-slate-700">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="text-xl font-bold mb-2">Fair Launch</h3>
            <p className="text-slate-400">Low gas, optimized contract for a fair distribution.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
