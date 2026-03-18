import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sparkles, Flame, ExternalLink, Image, Hash, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface NftToken {
  id: number;
  token_id: number;
  bot_id: number;
  owner_id: string;
  name: string;
  metadata_uri: string | null;
  mint_tx_id: string | null;
  mint_fee: number;
  mint_fee_asset: string;
  minted_at: string;
  burned: boolean;
}

interface BotData {
  id: number;
  name: string;
  skills: any;
  price_model: string;
  price_amount: number;
  price_asset: string;
}

const NFTGallery = () => {
  const { user } = useAuth();
  const [nfts, setNfts] = useState<NftToken[]>([]);
  const [myBots, setMyBots] = useState<BotData[]>([]);
  const [myNfts, setMyNfts] = useState<NftToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState<number | null>(null);
  const [stats, setStats] = useState({ totalMinted: 0, totalBurned: 0, circulating: 0 });
  const [tab, setTab] = useState<"gallery" | "my-nfts">("gallery");

  const apiCall = async (action: string, method = "GET", body?: any) => {
    const session = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    };
    if (session.data.session?.access_token) {
      headers.Authorization = `Bearer ${session.data.session.access_token}`;
    }
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nft-api?action=${action}`,
      { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [allNfts, statsData] = await Promise.all([
          apiCall("list"),
          apiCall("stats"),
        ]);
        setNfts(allNfts || []);
        setStats(statsData);

        if (user) {
          const [myNftsData, botsRes] = await Promise.all([
            apiCall("my-nfts"),
            supabase.from("bots").select("*").eq("owner_id", user.id),
          ]);
          setMyNfts(myNftsData || []);
          setMyBots((botsRes.data as BotData[]) || []);
        }
      } catch (err) {
        console.error("Failed to load NFT data:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const mintNft = async (botId: number) => {
    setMinting(botId);
    try {
      const result = await apiCall("mint", "POST", { botId });
      toast.success(result.message, {
        description: `Paid ${result.transaction.fee} ${result.transaction.asset} via ${result.transaction.protocol}`,
      });
      // Refresh
      const [allNfts, myNftsData, statsData] = await Promise.all([
        apiCall("list"),
        apiCall("my-nfts"),
        apiCall("stats"),
      ]);
      setNfts(allNfts || []);
      setMyNfts(myNftsData || []);
      setStats(statsData);
    } catch (err: any) {
      toast.error(err.message || "Minting failed");
    } finally {
      setMinting(null);
    }
  };

  const burnNft = async (tokenId: number) => {
    try {
      const result = await apiCall("burn", "POST", { tokenId });
      toast.success(result.message);
      const [allNfts, myNftsData, statsData] = await Promise.all([
        apiCall("list"),
        apiCall("my-nfts"),
        apiCall("stats"),
      ]);
      setNfts(allNfts || []);
      setMyNfts(myNftsData || []);
      setStats(statsData);
    } catch (err: any) {
      toast.error(err.message || "Burn failed");
    }
  };

  const mintedBotIds = new Set([...nfts, ...myNfts].map((n) => n.bot_id));
  const unmintedBots = myBots.filter((b) => !mintedBotIds.has(b.id));

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <p className="text-sm font-medium text-secondary mb-3 tracking-wider uppercase">SIP-009 Compliant</p>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Molbot NFTs</h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-6">
            Every molbot is a unique NFT — own, trade, and prove provenance on Stacks.
          </p>

          {/* Stats */}
          <div className="flex justify-center gap-6 mb-8">
            {[
              { label: "Minted", value: stats.totalMinted, icon: Sparkles },
              { label: "Circulating", value: stats.circulating, icon: Shield },
              { label: "Burned", value: stats.totalBurned, icon: Flame },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/30 border border-border/50">
                <s.icon className="w-4 h-4 text-primary" />
                <span className="font-mono text-lg font-bold text-foreground">{s.value}</span>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Tabs */}
          {user && (
            <div className="flex justify-center gap-2">
              {(["gallery", "my-nfts"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    tab === t
                      ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                >
                  {t === "gallery" ? "All NFTs" : "My NFTs"}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {loading ? (
          <div className="text-center text-muted-foreground py-20">Loading NFTs...</div>
        ) : (
          <>
            {/* Mint Section */}
            {tab === "my-nfts" && user && unmintedBots.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-secondary" />
                  Mint Your Bots as NFTs
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unmintedBots.map((bot) => (
                    <div
                      key={bot.id}
                      className="gradient-border-card rounded-xl p-5 flex items-center justify-between"
                    >
                      <div>
                        <h3 className="font-semibold text-foreground">{bot.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {bot.price_amount} {bot.price_asset} · {bot.price_model}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        disabled={minting === bot.id}
                        onClick={() => mintNft(bot.id)}
                        className="bg-secondary/10 text-secondary hover:bg-secondary/20 border border-secondary/20 font-semibold"
                      >
                        {minting === bot.id ? "Minting..." : "Mint NFT"}
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Minting costs 0.001 sBTC via x402 protocol
                </p>
              </motion.div>
            )}

            {/* NFT Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {(tab === "gallery" ? nfts : myNfts).map((nft, i) => (
                  <motion.div
                    key={nft.token_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                    className="gradient-border-card rounded-xl overflow-hidden"
                  >
                    {/* NFT Visual */}
                    <div className="h-40 bg-gradient-to-br from-primary/10 via-secondary/10 to-muted/30 flex items-center justify-center relative">
                      <div className="w-20 h-20 rounded-2xl bg-background/80 backdrop-blur flex items-center justify-center border border-border/50">
                        <Image className="w-10 h-10 text-primary/60" />
                      </div>
                      <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-md bg-background/70 backdrop-blur border border-border/30">
                        <Hash className="w-3 h-3 text-primary" />
                        <span className="text-xs font-mono font-bold text-foreground">{nft.token_id}</span>
                      </div>
                      <span className="absolute top-3 right-3 text-[10px] font-mono px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/15">
                        SIP-009
                      </span>
                    </div>

                    {/* Info */}
                    <div className="p-5">
                      <h3 className="text-lg font-semibold text-foreground mb-1">{nft.name}</h3>
                      <p className="text-xs text-muted-foreground mb-3">
                        Bot #{nft.bot_id} · Minted {new Date(nft.minted_at).toLocaleDateString()}
                      </p>

                      <div className="flex items-center justify-between py-2 border-t border-b border-border/30 mb-3">
                        <span className="text-xs text-muted-foreground">Mint Fee</span>
                        <span className="font-mono text-sm font-semibold text-primary">
                          {nft.mint_fee} {nft.mint_fee_asset}
                        </span>
                      </div>

                      {nft.mint_tx_id && (
                        <p className="text-[10px] font-mono text-muted-foreground/50 truncate mb-3" title={nft.mint_tx_id}>
                          TX: {nft.mint_tx_id}
                        </p>
                      )}

                      <div className="flex gap-2">
                        {nft.metadata_uri && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs border-border text-muted-foreground hover:text-foreground"
                            onClick={() => window.open(nft.metadata_uri!, "_blank")}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Metadata
                          </Button>
                        )}
                        {tab === "my-nfts" && nft.owner_id === user?.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                            onClick={() => burnNft(nft.token_id)}
                          >
                            <Flame className="w-3 h-3 mr-1" />
                            Burn
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {(tab === "gallery" ? nfts : myNfts).length === 0 && (
              <div className="text-center py-20">
                <Image className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {tab === "gallery"
                    ? "No NFTs minted yet. Be the first!"
                    : "You haven't minted any NFTs yet. Create a bot first, then mint it."}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NFTGallery;
