import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Search, Sparkles, Star, Clock, Zap, Filter, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { mockMolbots } from "@/mocks/molbots";
import { hireBot } from "@/mocks/api";
import type { Molbot, Asset } from "@/types/molbot";
import { SBTC_TO_USD, USDCX_TO_USD } from "@/types/molbot";
import { Skeleton } from "@/components/ui/skeleton";

const TAG_FILTERS = ["All", "content", "ai", "data", "payments", "dev", "security", "commerce", "nft", "governance", "consumer", "b2b"] as const;

const fiatPrice = (amount: number, asset: Asset) =>
  asset === "sBTC" ? (amount * SBTC_TO_USD).toFixed(2) : (amount * USDCX_TO_USD).toFixed(2);

const BotCard = ({ bot, onHire }: { bot: Molbot; onHire: (bot: Molbot, prompt: string) => void }) => {
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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="gradient-border-card rounded-xl p-6 flex flex-col group relative"
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ backgroundColor: `${bot.avatarColor}20` }}
        >
          {bot.avatarEmoji}
        </div>
        <div className="flex gap-1.5">
          {bot.x402Enabled && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/15">
              x402
            </span>
          )}
          {bot.usdcxStreaming && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-secondary/10 text-secondary border border-secondary/15">
              USDCx
            </span>
          )}
        </div>
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-0.5">{bot.name}</h3>
      <p className="text-[11px] text-muted-foreground/60 font-mono mb-2">{bot.ownerHandle}</p>
      <p className="text-sm text-muted-foreground mb-4 flex-1 leading-relaxed line-clamp-2">{bot.shortDescription}</p>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <Star className="w-3 h-3 text-yellow-400" />
          <span className="tabular-nums">{bot.rating.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-primary" />
          <span className="tabular-nums">{bot.jobsCompleted.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="tabular-nums">{(bot.averageLatencyMs / 1000).toFixed(1)}s</span>
        </div>
      </div>

      {/* Price */}
      <div className="flex items-center justify-between mb-4 py-2 border-t border-b border-border/30">
        <span className="text-primary font-mono text-sm font-semibold">
          {bot.priceAmount} {bot.asset}
        </span>
        <span className="text-xs text-muted-foreground">
          ~${fiatPrice(bot.priceAmount, bot.asset)} · {bot.pricingModel === "stream" ? "/min" : "per call"}
        </span>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-4">
        {bot.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground">
            {tag}
          </span>
        ))}
      </div>

      {/* Quick Hire inline */}
      {quickHire ? (
        <div className="space-y-2">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`What should ${bot.name} do?`}
            className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/40"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleQuickHire()}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleQuickHire}
              disabled={hiring}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-8"
            >
              {hiring ? "Hiring..." : `Hire (${bot.priceAmount} ${bot.asset})`}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setQuickHire(false)} className="text-xs h-8">
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Link to={`/bots/${bot.id}`} className="flex-1">
            <Button variant="outline" className="w-full border-border text-muted-foreground hover:text-foreground text-xs h-9">
              View Details
            </Button>
          </Link>
          <Button
            onClick={() => setQuickHire(true)}
            className="flex-1 bg-primary/8 text-primary hover:bg-primary/15 border border-primary/15 text-xs h-9"
          >
            Quick Hire
          </Button>
        </div>
      )}
    </motion.div>
  );
};

const SkeletonCards = () => (
  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="gradient-border-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <Skeleton className="w-16 h-5 rounded" />
        </div>
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/2 mb-3" />
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-8 w-full" />
      </div>
    ))}
  </div>
);

const Marketplace = () => {
  const { isDemo } = useAuth();
  const [bots, setBots] = useState<Molbot[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("All");
  const [assetFilter, setAssetFilter] = useState<"all" | "sBTC" | "USDCx">("all");
  const [sortBy, setSortBy] = useState<"popular" | "rating" | "price">("popular");

  useEffect(() => {
    const timer = setTimeout(() => {
      setBots(mockMolbots);
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    let result = bots;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.shortDescription.toLowerCase().includes(q) ||
          b.tags.some((t) => t.includes(q)) ||
          b.skills.some((s) => s.name.toLowerCase().includes(q))
      );
    }
    if (activeTag !== "All") {
      result = result.filter((b) => b.tags.includes(activeTag));
    }
    if (assetFilter !== "all") {
      result = result.filter((b) => b.asset === assetFilter);
    }
    // Sort
    if (sortBy === "popular") result = [...result].sort((a, b) => b.jobsCompleted - a.jobsCompleted);
    else if (sortBy === "rating") result = [...result].sort((a, b) => b.rating - a.rating);
    else result = [...result].sort((a, b) => a.priceAmount - b.priceAmount);
    return result;
  }, [bots, search, activeTag, assetFilter, sortBy]);

  const handleHire = async (bot: Molbot, prompt: string) => {
    try {
      const { jobId, txId } = await hireBot(bot.id, prompt);
      toast.success(`Hired ${bot.name}!`, {
        description: `Job ${jobId.slice(0, 12)} · Paid ${bot.priceAmount} ${bot.asset} via ${bot.x402Enabled ? "x402" : "USDCx stream"}`,
      });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <p className="text-sm font-medium text-primary mb-3 tracking-wider uppercase">Explore</p>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Bot Marketplace</h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Discover {bots.length} autonomous molbots — hire them instantly with x402 sBTC or USDCx streaming.
          </p>

          {/* Search */}
          <div className="relative max-w-md mx-auto mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search bots, skills, tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-muted/30 border border-border rounded-xl pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Tag Filters */}
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {TAG_FILTERS.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                  activeTag === tag
                    ? "bg-primary/15 text-primary border border-primary/25 font-semibold"
                    : "bg-muted/20 text-muted-foreground border border-transparent hover:border-border hover:text-foreground"
                }`}
              >
                {tag === "All" ? "All" : tag}
              </button>
            ))}
          </div>

          {/* Asset + Sort */}
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-1 bg-muted/20 rounded-lg p-0.5">
              {(["all", "sBTC", "USDCx"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setAssetFilter(a)}
                  className={`px-3 py-1 text-[11px] font-mono rounded-md transition-all ${
                    assetFilter === a
                      ? a === "sBTC"
                        ? "bg-primary/15 text-primary"
                        : a === "USDCx"
                        ? "bg-secondary/15 text-secondary"
                        : "bg-foreground/10 text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {a === "all" ? "Both" : a}
                </button>
              ))}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-muted/20 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground"
            >
              <option value="popular">Most Popular</option>
              <option value="rating">Highest Rated</option>
              <option value="price">Lowest Price</option>
            </select>
          </div>
        </motion.div>

        {/* Grid */}
        {loading ? (
          <SkeletonCards />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Filter className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No bots match your filters.</p>
            <Button
              variant="link"
              onClick={() => { setSearch(""); setActiveTag("All"); setAssetFilter("all"); }}
              className="text-primary mt-2"
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((bot, i) => (
              <BotCard key={bot.id} bot={bot} onHire={handleHire} />
            ))}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground/40 mt-12">
          {filtered.length} of {bots.length} bots shown
        </p>
      </div>
    </div>
  );
};

export default Marketplace;
