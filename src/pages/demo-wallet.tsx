import {
  FireblocksVaultDemo,
  NFTGalleryDemo,
  TransactionStreamDemo,
  WalletBalanceDemo,
} from "@/components/demo";

export default function WalletDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-black p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl font-black bg-gradient-to-r from-white via-purple-400 to-pink-400 bg-clip-text text-transparent mb-6">
            Mock Wallet Playground
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Interactive Stacks + Fireblocks demos for Molbot Studio. Real-time transactions, vault management, and an NFT gallery.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <WalletBalanceDemo />
          <TransactionStreamDemo />
          <FireblocksVaultDemo />
          <div className="lg:col-span-2">
            <NFTGalleryDemo />
          </div>
        </div>
      </div>
    </div>
  );
}

