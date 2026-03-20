import { useMemo, useState } from "react";
import { Bot } from "lucide-react";
import type { MockNFT } from "@/data/mock-wallet";

type Rarity = "Common" | "Rare" | "Epic" | "Legendary";

type NFTWithRarity = MockNFT & {
  rarity: Rarity;
};

export const NFTGalleryDemo = () => {
  const [selectedNFT, setSelectedNFT] = useState<NFTWithRarity | null>(
    null,
  );
  const [dragging, setDragging] = useState(false);

  const mockNFTs = useMemo(() => {
    const base = Array.from({ length: 12 }, (_, i) => ({
      id: `nft-${i}`,
      name: `Molbot ${["Alpha", "Beta", "Gamma", "Delta"][i % 4]} #${i + 1}`,
      image: `/mock/molbot-${i % 4}.png`,
      contract: "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7::molbot-nft",
      molbotType: ["support", "trading", "analytics", "creative"][i % 4],
      tokenId: i + 1,
      mintedAt: new Date(Date.now() - (i + 1) * 86400_000).toISOString(),
      rarity: ["Common", "Rare", "Epic", "Legendary"][
        Math.floor(i / 3) % 4
      ] as Rarity,
    })) satisfies NFTWithRarity[];

    return base;
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
          Your Molbot NFTs
        </h2>
        <p className="text-xl text-white/60 max-w-2xl mx-auto">
          Drag to deploy, click to inspect. Each NFT represents a deployed Molbot agent.
        </p>
      </div>

      <div
        className={`transition-all duration-300 ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        onMouseDown={() => setDragging(true)}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {mockNFTs.map((nft) => (
            <NFTCard
              key={nft.id}
              nft={nft}
              onClick={() => setSelectedNFT(nft)}
            />
          ))}
        </div>
      </div>

      {selectedNFT && (
        <NFTModal nft={selectedNFT} onClose={() => setSelectedNFT(null)} />
      )}
    </div>
  );
};

const NFTCard = ({
  nft,
  onClick,
}: {
  nft: NFTWithRarity;
  onClick: () => void;
}) => (
  <div
    className="group relative bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:border-white/40 hover:scale-105 transition-all cursor-pointer overflow-hidden"
    onClick={onClick}
  >
    <div className="relative z-10">
      <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-white/20 to-transparent rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform">
        <Bot className="w-10 h-10 text-white/90" />
      </div>
      <h4 className="font-bold text-white text-center mb-2">{nft.name}</h4>
      <div className="flex items-center justify-center gap-2 text-xs opacity-75 mb-3">
        <span className="px-2 py-0.5 bg-white/20 rounded-full">
          {nft.molbotType}
        </span>
        <span>{nft.rarity}</span>
      </div>
    </div>

    <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
  </div>
);

const NFTModal = ({
  nft,
  onClose,
}: {
  nft: NFTWithRarity;
  onClose: () => void;
}) => (
  <div
    className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-8"
    onClick={onClose}
  >
    <div
      className="bg-gradient-to-br from-slate-900 to-slate-800 border border-white/20 rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-8 text-center">
        <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-3xl flex items-center justify-center">
          <Bot className="w-16 h-16 text-white/95" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">{nft.name}</h2>
        <div className="space-y-4 mb-8">
          <div className="flex justify-between py-3 border-b border-white/10">
            <span className="opacity-75">Type</span>
            <span className="font-mono">{nft.molbotType}</span>
          </div>
          <div className="flex justify-between py-3 border-b border-white/10">
            <span className="opacity-75">Contract</span>
            <span className="font-mono text-sm">
              {nft.contract.slice(0, 20)}...
            </span>
          </div>
          <div className="flex justify-between py-3">
            <span className="opacity-75">Rarity</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                nft.rarity === "Legendary"
                  ? "bg-gradient-to-r from-yellow-400 to-orange-400 text-black"
                  : nft.rarity === "Epic"
                    ? "bg-purple-500/20 text-purple-300"
                    : "bg-green-500/20 text-green-300"
              }`}
            >
              {nft.rarity}
            </span>
          </div>
        </div>
        <button
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-4 px-8 rounded-2xl transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
          onClick={onClose}
        >
          Deploy This Molbot
        </button>
      </div>
    </div>
  </div>
);

