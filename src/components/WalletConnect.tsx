import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wallet, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const WalletConnect = () => {
  const { user } = useAuth();
  const [connecting, setConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const connectWallet = async () => {
    if (!user) {
      toast.error("Please sign in first to connect a wallet");
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
        toast.success("Stacks wallet connected!", {
          description: `Address: ${result.stacksAddress.slice(0, 8)}...${result.stacksAddress.slice(-6)}`,
        });
      }
    } catch (err: any) {
      toast.error("Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  };

  if (walletAddress) {
    return (
      <Button variant="outline" className="border-primary/30 text-primary gap-2 text-sm cursor-default">
        <Check className="w-4 h-4" />
        <span className="font-mono text-xs">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
      </Button>
    );
  }

  return (
    <Button
      onClick={connectWallet}
      disabled={connecting}
      className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan gap-2 text-sm"
    >
      {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
      {connecting ? "Connecting..." : "Connect Stacks Wallet"}
    </Button>
  );
};

export default WalletConnect;
