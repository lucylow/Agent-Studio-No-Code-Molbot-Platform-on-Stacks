import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Search, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SkillBotCard from "@/components/SkillBotCard";
import PriceDisplay from "@/components/PriceDisplay";
import { getUserFriendlyError } from "@/lib/errorHandler";

interface BotData {
  id: number;
  name: string;
  skills: any;
  price_model: string;
  price_amount: number;
  price_asset: string;
  active: boolean;
  on_chain_id: number | null;
}

const defaultBots = [
  { name: "ImageGen Pro", desc: "Generates high-quality images from prompts.", price: "0.002 sBTC", unit: "per image", badge: "verified", badgeColor: "primary" as const },
  { name: "DataFetch", desc: "Pulls real-time data from any API.", price: "0.001 sBTC", unit: "per call", badge: "x402 ready", badgeColor: "primary" as const },
  { name: "StreamPlayer", desc: "Streams audio/video, paid per second via USDCx.", price: "0.01 USDCx", unit: "/min", badge: "USDCx", badgeColor: "secondary" as const },
  { name: "Summarizer", desc: "Condenses long texts into concise summaries.", price: "0.0005 sBTC", unit: "per request", badge: "verified", badgeColor: "primary" as const },
  { name: "Translator", desc: "Real-time multi-language translation bot.", price: "0.001 sBTC", unit: "per 1k chars", badge: "x402 ready", badgeColor: "primary" as const },
  { name: "WeatherOracle", desc: "Provides hyper-local weather forecasts.", price: "0.005 USDCx", unit: "per query", badge: "USDCx", badgeColor: "secondary" as const },
];

const Marketplace = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [liveBots, setLiveBots] = useState<BotData[]>([]);

  useEffect(() => {
    supabase
      .from("bots")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to load marketplace bots:", error);
          toast.error("Failed to load bots. Please refresh.");
          return;
        }
        setLiveBots((data as BotData[]) || []);
      });
  }, []);

  const filteredDefault = defaultBots.filter(
    (b) => b.name.toLowerCase().includes(search.toLowerCase()) || b.desc.toLowerCase().includes(search.toLowerCase())
  );
  const filteredLive = liveBots.filter(
    (b) => b.name.toLowerCase().includes(search.toLowerCase())
  );

  const hireLiveBot = async (bot: BotData) => {
    if (!user) {
      toast.error("Please sign in to hire bots");
      return;
    }

    // Find user's first bot as requester
    const { data: userBots } = await supabase
      .from("bots")
      .select("id")
      .eq("owner_id", user.id)
      .limit(1);

    if (!userBots || userBots.length === 0) {
      toast.error("You need to create a bot first to hire other bots", {
        description: "Go to Dashboard → Create Bot",
      });
      return;
    }

    try {
      const session = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bot-api?action=hire-bot`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "idempotency-key": crypto.randomUUID(),
          },
          body: JSON.stringify({
            requesterBotId: userBots[0].id,
            providerBotId: bot.id,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`Hired ${bot.name}!`, {
        description: `Paid ${data.transaction.amount} ${data.transaction.asset} via ${data.transaction.protocol}`,
      });
    } catch (err: any) {
      toast.error(getUserFriendlyError(err));
    }
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <p className="text-sm font-medium text-primary mb-3 tracking-wider uppercase">Explore</p>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Bot Marketplace</h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Discover bots built by the community – hire them or generate content with x402.
          </p>
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search bots..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-muted/30 border border-border rounded-xl pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>
        </motion.div>

        {/* x402 Content Generator — Featured */}
        {(!search || "content generator".includes(search.toLowerCase())) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-10"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-secondary" />
              <h2 className="text-lg font-semibold text-foreground">x402 Content Generator</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-secondary/10 text-secondary border border-secondary/15">
                FEATURED
              </span>
            </div>
            <div className="max-w-xl">
              <SkillBotCard />
            </div>
          </motion.div>
        )}

        {/* Live Bots from Database */}
        {filteredLive.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Live Bots
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLive.map((bot, i) => (
                <motion.div
                  key={bot.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="gradient-border-card rounded-xl p-6 flex flex-col"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-muted/30 flex items-center justify-center text-2xl">🤖</div>
                    <span className={`text-[11px] font-mono px-2 py-1 rounded-md ${
                      bot.price_asset === "USDCx"
                        ? "bg-secondary/10 text-secondary border border-secondary/15"
                        : "bg-primary/10 text-primary border border-primary/15"
                    }`}>
                      {bot.price_model === "stream" ? "USDCx stream" : "x402"}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">{bot.name}</h3>
                  <p className="text-sm text-muted-foreground mb-5 flex-1">
                    {Array.isArray(bot.skills) && bot.skills.length > 0
                      ? `Skills: ${(bot.skills as string[]).join(", ")}`
                      : "General purpose bot"}
                  </p>
                  <div className="flex items-center justify-between mb-4 py-2 border-t border-b border-border/30">
                    <PriceDisplay amount={bot.price_amount} asset={bot.price_asset} />
                    <span className="text-xs text-muted-foreground">
                      {bot.price_model === "stream" ? "/min" : "per call"}
                    </span>
                  </div>
                  {bot.on_chain_id && (
                    <p className="text-[10px] text-muted-foreground/50 font-mono mb-3">
                      Chain ID: {bot.on_chain_id}
                    </p>
                  )}
                  <Button
                    className="w-full bg-primary/8 text-primary hover:bg-primary/15 border border-primary/15 font-semibold transition-all duration-200"
                    onClick={() => hireLiveBot(bot)}
                  >
                    Hire Bot
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Default showcase bots */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Showcase Bots</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDefault.map((bot, i) => (
              <motion.div
                key={bot.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                className="gradient-border-card rounded-xl p-6 flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-muted/30 flex items-center justify-center text-2xl">🤖</div>
                  <span className={`text-[11px] font-mono px-2 py-1 rounded-md ${
                    bot.badgeColor === "primary"
                      ? "bg-primary/10 text-primary border border-primary/15"
                      : "bg-secondary/10 text-secondary border border-secondary/15"
                  }`}>
                    {bot.badge}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">{bot.name}</h3>
                <p className="text-sm text-muted-foreground mb-5 flex-1 leading-relaxed">{bot.desc}</p>
                <div className="flex items-center justify-between mb-4 py-2 border-t border-b border-border/30">
                  <span className="text-primary font-mono text-sm font-semibold">{bot.price}</span>
                  <span className="text-xs text-muted-foreground">{bot.unit}</span>
                </div>
                <Button
                  className="w-full bg-primary/8 text-primary hover:bg-primary/15 border border-primary/15 font-semibold transition-all duration-200"
                  onClick={() => toast.info(`Hiring ${bot.name}...`, { description: "Mock: x402 payment would be initiated." })}
                >
                  Hire Bot
                </Button>
              </motion.div>
            ))}
          </div>
        </div>

        {filteredDefault.length === 0 && filteredLive.length === 0 && (
          <p className="text-center text-muted-foreground mt-12">No bots found matching "{search}"</p>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
