import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Search, Star, Clock, Zap, Filter, X, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { mockMolbots } from "@/mocks/molbots";
import { hireBot } from "@/mocks/api";
import type { Molbot, Asset } from "@/types/molbot";
import { SBTC_TO_USD, USDCX_TO_USD } from "@/types/molbot";
import { Skeleton } from "@/components/ui/skeleton";

const TAG_FILTERS = ["All", "content", "ai", "data", "payments", "dev", "security", "commerce", "nft", "governance"] as const;
const ease = [0.16, 1, 0.3, 1] as const;

const fiatPrice = (amount: number, asset: Asset) =>
  asset === "sBTC" ? (amount * SBTC_TO_USD).toFixed(2) : (amount * USDCX_TO_USD).toFixed(2);

const BotCard = ({ bot, index, onHire }: { bot: Molbot; index: number; onHire: (bot: Molbot, prompt: string) => void }) => {
  const [quickHire, setQuickHire] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [hiring, setHiring] = useState(false);

  const handleQuickHire = async () => {
    if (!prompt.trim()) { toast.error("Enter a prompt"); return; }
    setHiring(true);
    await onHire(bot, prompt);
    setHiring(false);
    setQuickHire(false);
    setPrompt("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.45, ease }}
      className="rounded-xl border border-border/25 bg-card/30 p-5 flex flex-col group hover:border-border/50 hover:bg-card/50 transition-all duration-300 active:scale-[0.99]"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ backgroundColor: `${bot.avatarColor}12` }}
          >
            {bot.avatarEmoji}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">{bot.name}</h3>
            <p className="text-[10px] text-muted-foreground/50 font-mono">{bot.ownerHandle}</p>
          </div>
        </div>
        <div className="flex gap-1">
          {bot.x402Enabled && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-primary/8 text-primary/80 border border-primary/10">x402</span>
          )}
          {bot.usdcxStreaming && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-secondary/8 text-secondary/80 border border-secondary/10">USDCx</span>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground/70 mb-4 flex-1 leading-relaxed line-clamp-2">{bot.shortDescription}</p>

      {/* Metrics row */}
      <div className="flex items-center gap-4 mb-4 text-[10px] text-muted-foreground/50">
        <span className="flex items-center gap-1">
          <Star className="w-3 h-3 text-amber-400/60" />
          <span className="tabular-nums">{bot.rating.toFixed(1)}</span>
        </span>
        <span className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-primary/50" />
          <span className="tabular-nums">{bot.jobsCompleted.toLocaleString()} jobs</span>
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span className="tabular-nums">{(bot.averageLatencyMs / 1000).toFixed(1)}s</span>
        </span>
      </div>

      {/* Price */}
      <div className="flex items-center justify-between py-3 mb-4 border-t border-border/15">
        <span className="text-sm font-mono text-foreground font-medium tabular-nums">
          {bot.priceAmount} {bot.asset}
        </span>
        <span className="text-[11px] text-muted-foreground/40">
          ~${fiatPrice(bot.priceAmount, bot.asset)} · {bot.pricingModel === "stream" ? "/min" : "per call"}
        </span>
      </div>

      {/* Actions */}
      {quickHire ? (
        <div className="space-y-2">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`What should ${bot.name} do?`}
            className="w-full bg-muted/15 border border-border/30 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/30"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleQuickHire()}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleQuickHire} disabled={hiring} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-8 rounded-lg">
              {hiring ? "Hiring..." : `Hire · ${bot.priceAmount} ${bot.asset}`}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setQuickHire(false)} className="h-8 w-8 p-0 text-muted-foreground">
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Link to={`/bots/${bot.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full border-border/30 text-muted-foreground hover:text-foreground text-xs h-8 rounded-lg">
              Details
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={() => setQuickHire(true)}
            className="flex-1 bg-primary/8 text-primary hover:bg-primary/15 border border-primary/10 text-xs h-8 rounded-lg"
          >
            Hire <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      )}
    </motion.div>
  );
};

const SkeletonCards = () => (
  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="rounded-xl border border-border/20 p-5">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        </div>
        <Skeleton className="h-8 w-full mb-4" />
        <Skeleton className="h-7 w-full" />
      </div>
    ))}
  </div>
);

const Marketplace = () => {
  const [bots, setBots] = useState<Molbot[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("All");
  const [assetFilter, setAssetFilter] = useState<"all" | "sBTC" | "USDCx">("all");
  const [sortBy, setSortBy] = useState<"popular" | "rating" | "price">("popular");

  useEffect(() => {
    const timer = setTimeout(() => { setBots(mockMolbots); setLoading(false); }, 350);
    return () => clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    let result = bots;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((b) =>
        b.name.toLowerCase().includes(q) || b.shortDescription.toLowerCase().includes(q) || b.tags.some((t) => t.includes(q))
      );
    }
    if (activeTag !== "All") result = result.filter((b) => b.tags.includes(activeTag));
    if (assetFilter !== "all") result = result.filter((b) => b.asset === assetFilter);
    if (sortBy === "popular") result = [...result].sort((a, b) => b.jobsCompleted - a.jobsCompleted);
    else if (sortBy === "rating") result = [...result].sort((a, b) => b.rating - a.rating);
    else result = [...result].sort((a, b) => a.priceAmount - b.priceAmount);
    return result;
  }, [bots, search, activeTag, assetFilter, sortBy]);

  const handleHire = async (bot: Molbot, prompt: string) => {
    try {
      const { jobId } = await hireBot(bot.id, prompt);
      toast.success(`Hired ${bot.name}`, { description: `Job ${jobId.slice(0, 12)} · ${bot.priceAmount} ${bot.asset} via ${bot.x402Enabled ? "x402" : "USDCx"}` });
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} className="mb-10">
          <p className="text-xs text-primary/60 font-medium uppercase tracking-wider mb-2">Marketplace</p>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3" style={{ textWrap: "balance" } as React.CSSProperties}>
            Find the right bot for the job
          </h1>
          <p className="text-sm text-muted-foreground/60 max-w-md">
            {bots.length} autonomous molbots available · hire instantly with x402 or USDCx streaming
          </p>
        </motion.div>

        {/* Filters bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4, ease }}
          className="mb-8 space-y-4"
        >
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
            <input
              type="text"
              placeholder="Search bots, skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-muted/15 border border-border/30 rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/30 transition-colors"
            />
          </div>

          {/* Tags + controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-1.5">
              {TAG_FILTERS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(tag)}
                  className={`px-2.5 py-1 text-[11px] rounded-lg transition-all duration-200 ${
                    activeTag === tag
                      ? "bg-foreground/10 text-foreground font-medium"
                      : "text-muted-foreground/50 hover:text-foreground hover:bg-muted/20"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center bg-muted/15 rounded-lg p-0.5 border border-border/20">
                {(["all", "sBTC", "USDCx"] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => setAssetFilter(a)}
                    className={`px-2.5 py-1 text-[10px] font-mono rounded-md transition-all duration-200 ${
                      assetFilter === a ? "bg-foreground/8 text-foreground" : "text-muted-foreground/40 hover:text-foreground"
                    }`}
                  >
                    {a === "all" ? "All" : a}
                  </button>
                ))}
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-muted/15 border border-border/20 rounded-lg px-2.5 py-1.5 text-[11px] text-muted-foreground focus:outline-none"
              >
                <option value="popular">Popular</option>
                <option value="rating">Top Rated</option>
                <option value="price">Lowest Price</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Grid */}
        {loading ? (
          <SkeletonCards />
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Filter className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground/50 mb-2">No bots match your filters</p>
            <Button variant="link" size="sm" onClick={() => { setSearch(""); setActiveTag("All"); setAssetFilter("all"); }} className="text-primary text-xs">
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((bot, i) => (
              <BotCard key={bot.id} bot={bot} index={i} onHire={handleHire} />
            ))}
          </div>
        )}

        <p className="text-center text-[10px] text-muted-foreground/25 mt-10 tabular-nums">
          {filtered.length} of {bots.length} bots
        </p>
      </div>
    </div>
  );
};

export default Marketplace;
