import { motion } from "framer-motion";
import { useWallet, type WalletAsset } from "@/contexts/WalletContext";
import { Bitcoin, DollarSign, Layers } from "lucide-react";

const ASSET_CONFIG: Record<string, { icon: typeof Bitcoin; colorClass: string; bgClass: string }> = {
  sBTC: { icon: Bitcoin, colorClass: "text-orange-400", bgClass: "bg-orange-400/10 border-orange-400/20" },
  USDCx: { icon: DollarSign, colorClass: "text-emerald-400", bgClass: "bg-emerald-400/10 border-emerald-400/20" },
  STX: { icon: Layers, colorClass: "text-violet-400", bgClass: "bg-violet-400/10 border-violet-400/20" },
};

function AssetCard({ asset, index }: { asset: WalletAsset; index: number }) {
  const config = ASSET_CONFIG[asset.symbol] ?? ASSET_CONFIG.STX;
  const Icon = config.icon;
  const fiat = asset.balance * asset.price;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="gradient-border-card rounded-xl p-5"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${config.bgClass}`}>
          <Icon className={`w-5 h-5 ${config.colorClass}`} />
        </div>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {asset.symbol}
        </span>
      </div>

      <p className="text-2xl font-bold text-foreground font-mono tabular-nums">
        {asset.symbol === "sBTC" ? asset.balance.toFixed(6) : asset.balance.toFixed(2)}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
        ${fiat.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>

      {/* Mini sparkline */}
      <div className="flex items-end gap-0.5 h-6 mt-3">
        {[10, 15, 12, 18, 14, 20, 16].map((v, i) => (
          <div
            key={i}
            className={`flex-1 rounded-t-sm ${config.bgClass}`}
            style={{ height: `${(v / 20) * 100}%`, opacity: 0.5 + (i / 14) }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export function AssetBalances() {
  const { assets } = useWallet();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {assets.map((asset, i) => (
        <AssetCard key={asset.symbol} asset={asset} index={i} />
      ))}
    </div>
  );
}
