import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wallet, Check, Loader2, ChevronDown, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { mockWalletData } from "@/mocks/transactions";

const WalletConnect = () => {
  const { user, isDemo } = useAuth();
  const [connecting, setConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(isDemo ? mockWalletData.stxAddress : null);
  const [showDropdown, setShowDropdown] = useState(false);

  const wallet = mockWalletData;

  const connectWallet = async () => {
    if (!user) { toast.error("Please sign in first"); return; }

    if (isDemo) {
      setWalletAddress(wallet.stxAddress);
      toast.success("Stacks wallet connected!", {
        description: `Address: ${wallet.stxAddress.slice(0, 8)}...${wallet.stxAddress.slice(-6)}`,
      });
      return;
    }

    setConnecting(true);
    try {
      const session = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stacks-api?action=mock-wallet`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({}),
        }
      );
      const result = await res.json();
      if (result.connected) {
        setWalletAddress(result.stacksAddress);
        toast.success("Stacks wallet connected!");
      }
    } catch {
      toast.error("Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  };

  if (walletAddress) {
    return (
      <div className="relative">
        <Button
          variant="outline"
          className="border-primary/30 text-foreground gap-2 text-xs font-mono"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="hidden sm:inline tabular-nums">
            {wallet.sbtcBalance.toFixed(4)} sBTC
          </span>
          <span className="hidden md:inline text-muted-foreground">·</span>
          <span className="hidden md:inline tabular-nums text-secondary">
            {wallet.usdcxBalance.toFixed(2)} USDCx
          </span>
          <ChevronDown className={`w-3 h-3 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
        </Button>

        {showDropdown && (
          <div className="absolute top-full right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-lg p-4 z-50">
            <p className="text-[10px] text-muted-foreground mb-1">Address</p>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs font-mono text-foreground truncate">
                {walletAddress}
              </p>
              <button
                onClick={() => { navigator.clipboard.writeText(walletAddress); toast.success("Copied!"); }}
                className="text-muted-foreground hover:text-foreground"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">sBTC</span>
                <span className="font-mono text-foreground tabular-nums">{wallet.sbtcBalance.toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">USDCx</span>
                <span className="font-mono text-secondary tabular-nums">{wallet.usdcxBalance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs border-t border-border/30 pt-2">
                <span className="text-muted-foreground">Fiat Value</span>
                <span className="font-mono text-foreground tabular-nums">${wallet.fiatEquivalent.toFixed(2)}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground hover:text-foreground"
              onClick={() => { setWalletAddress(null); setShowDropdown(false); }}
            >
              Disconnect
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Button
      onClick={connectWallet}
      disabled={connecting}
      className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan gap-2 text-sm"
    >
      {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
      {connecting ? "Connecting..." : "Connect Wallet"}
    </Button>
  );
};

export default WalletConnect;
