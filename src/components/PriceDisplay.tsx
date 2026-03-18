import { useState, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PriceDisplayProps {
  amount: number;
  asset: string;
  showUsd?: boolean;
  compact?: boolean;
}

// Mock BTC price — in production, fetch from CoinGecko/similar
const useBtcPrice = () => {
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    // Simulated price for demo — avoids CORS/rate-limit issues
    setPrice(97500);
  }, []);

  return price;
};

const PriceDisplay = ({ amount, asset, showUsd = true, compact = false }: PriceDisplayProps) => {
  const btcPrice = useBtcPrice();

  const getUsdValue = (): string | null => {
    if (!btcPrice) return null;
    if (asset === "sBTC") {
      return (amount * btcPrice).toFixed(2);
    }
    if (asset === "USDCx") {
      return amount.toFixed(2);
    }
    return null;
  };

  const usd = getUsdValue();

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="font-mono text-sm font-semibold text-primary cursor-help" aria-label={`${amount} ${asset}${usd ? `, approximately $${usd} USD` : ""}`}>
            {amount} {asset}
          </span>
        </TooltipTrigger>
        {usd && (
          <TooltipContent>
            <p className="text-xs">≈ ${usd} USD</p>
          </TooltipContent>
        )}
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center gap-2" aria-label={`Price: ${amount} ${asset}${usd ? `, approximately $${usd} USD` : ""}`}>
      <span className="font-mono text-sm font-semibold text-primary">
        {amount} {asset}
      </span>
      {showUsd && usd && (
        <span className="text-xs text-muted-foreground">
          ≈ ${usd}
        </span>
      )}
    </div>
  );
};

export default PriceDisplay;
