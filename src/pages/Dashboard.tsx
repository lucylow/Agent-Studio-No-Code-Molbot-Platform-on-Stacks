import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Plus, Bot, Activity, Wallet, LogOut, AlertCircle, Sparkles, Users, Image, ArrowRight,
  TrendingUp, Zap, DollarSign, Radio,
} from "lucide-react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { createBotSchema } from "@/lib/validation";
import { useSupabasePostgresChanges } from "@/hooks/useSupabasePostgresChanges";
import { mockWalletData, mockEarningsTimeSeries, mockTransactions } from "@/mocks/transactions";
import { mockMolbots } from "@/mocks/molbots";
import { SBTC_TO_USD } from "@/types/molbot";

interface BotData {
  id: number;
  name: string;
  skills: any;
  price_model: string;
  price_amount: number;
  price_asset: string;
  active: boolean;
  on_chain_id: number | null;
  created_at: string;
}

type DashboardProps = {
  initialView?: "studio" | "agents";
};

const DEMO_BOTS: BotData[] = [
  { id: 1, name: "ImageGen Pro", skills: ["image-gen", "text-to-image"], price_model: "fixed", price_amount: 0.002, price_asset: "sBTC", active: true, on_chain_id: 1001, created_at: "2026-03-15T10:00:00Z" },
  { id: 2, name: "CodeAudit Bot", skills: ["code-review", "security-scan"], price_model: "fixed", price_amount: 0.005, price_asset: "sBTC", active: true, on_chain_id: 1002, created_at: "2026-03-16T14:30:00Z" },
  { id: 3, name: "DataCrunch v2", skills: ["data-analysis", "csv-parse"], price_model: "stream", price_amount: 0.001, price_asset: "USDCx", active: false, on_chain_id: 1003, created_at: "2026-03-17T09:15:00Z" },
  { id: 4, name: "TranslatorX", skills: ["translation", "nlp"], price_model: "fixed", price_amount: 0.003, price_asset: "sBTC", active: true, on_chain_id: 1004, created_at: "2026-03-18T16:45:00Z" },
];

const Dashboard = ({ initialView = "agents" }: DashboardProps) => {
  const { user, signOut, isDemo } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [bots, setBots] = useState<BotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(initialView === "studio");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newBot, setNewBot] = useState({ name: "", skills: "", priceModel: "fixed", priceAmount: "0.001", priceAsset: "sBTC" });

  const botsFilter = searchParams.get("filter");
  const visibleBots =
    botsFilter === "active" ? bots.filter((b) => b.active)
    : botsFilter === "paused" ? bots.filter((b) => !b.active)
    : bots;

  const pageTitle = initialView === "studio" ? "Studio" : "Agents";
  const wallet = mockWalletData;

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    if (isDemo) { setBots(DEMO_BOTS); setLoading(false); }
    else { loadBots(); }
  }, [user, isDemo]);

  useSupabasePostgresChanges({
    channelKey: user ? `bots:owner:${user.id}` : "bots:owner:unknown",
    table: "bots",
    events: ["INSERT", "UPDATE", "DELETE"],
    enabled: !!user && !isDemo,
    filter: user ? `owner_id=eq.${user.id}` : undefined,
    throttleMs: 250,
    onPayload: (payload) => {
      setBots((prev) => {
        switch (payload.eventType) {
          case "DELETE": {
            const deletedId = payload.old?.id as number | undefined;
            if (deletedId === undefined) return prev;
            return prev.filter((b) => b.id !== deletedId);
          }
          case "INSERT":
          case "UPDATE": {
            const row = payload.new as BotData | undefined;
            if (!row) return prev;
            const next = prev.some((b) => b.id === row.id)
              ? prev.map((b) => (b.id === row.id ? row : b))
              : [row, ...prev];
            next.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
            return next;
          }
          default: return prev;
        }
      });
    },
  });

  const loadBots = async () => {
    try {
      const { data, error } = await supabase
        .from("bots")
        .select("id, name, skills, price_model, price_amount, price_asset, active, on_chain_id, created_at")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setBots((data as BotData[]) || []);
    } catch (err: any) {
      console.error("Failed to load bots:", err);
      toast.error("Failed to load your bots. Please refresh the page.");
    } finally { setLoading(false); }
  };

  const createBot = async () => {
    setErrors({});
    const result = createBotSchema.safeParse(newBot);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((e) => { fieldErrors[e.path[0] as string] = e.message; });
      setErrors(fieldErrors);
      toast.error("Please fix the validation errors");
      return;
    }

    if (isDemo) {
      const demoBotId = bots.length + 5;
      const newDemoBot: BotData = {
        id: demoBotId, name: result.data.name, skills: result.data.skills,
        price_model: result.data.priceModel, price_amount: result.data.priceAmount,
        price_asset: result.data.priceAsset, active: true, on_chain_id: 2000 + demoBotId,
        created_at: new Date().toISOString(),
      };
      setBots((prev) => [newDemoBot, ...prev]);
      toast.success(`Bot "${result.data.name}" created!`, { description: `Demo On-chain ID: ${newDemoBot.on_chain_id}` });
      setShowCreate(false);
      setNewBot({ name: "", skills: "", priceModel: "fixed", priceAmount: "0.001", priceAsset: "sBTC" });
      setErrors({});
      return;
    }

    setCreating(true);
    try {
      const session = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bot-api?action=create-bot`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "idempotency-key": crypto.randomUUID(),
          },
          body: JSON.stringify({
            name: result.data.name, skills: result.data.skills,
            priceModel: result.data.priceModel, priceAmount: result.data.priceAmount,
            priceAsset: result.data.priceAsset,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Bot "${result.data.name}" created!`, {
        description: `On-chain ID: ${data.onChainId} | Tx: ${data.txId.slice(0, 12)}...`,
      });
      setShowCreate(false);
      setNewBot({ name: "", skills: "", priceModel: "fixed", priceAmount: "0.001", priceAsset: "sBTC" });
      setErrors({});
      loadBots();
    } catch (err: any) { toast.error(err.message || "Failed to create bot"); }
    finally { setCreating(false); }
  };

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  if (!user) return null;

  const FieldError = ({ field }: { field: string }) =>
    errors[field] ? (
      <p className="text-destructive text-xs mt-1 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" /> {errors[field]}
      </p>
    ) : null;

  // Recent activity from mock
  const recentActivity = mockTransactions.slice(0, 5);
  const botNameMap = Object.fromEntries(mockMolbots.map((b) => [b.id, b.name]));

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{pageTitle}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isDemo && <span className="inline-block bg-primary/15 text-primary text-[10px] font-mono px-2 py-0.5 rounded-md mr-2">DEMO</span>}
              {user.email}
            </p>
          </div>
          <div className="flex gap-3">
            {initialView === "studio" && (
              <Button onClick={() => setShowCreate(!showCreate)} className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan gap-2">
                <Plus className="w-4 h-4" /> Create Bot
              </Button>
            )}
            <Button variant="outline" onClick={handleSignOut} className="border-border text-muted-foreground hover:text-foreground gap-2">
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </div>
        </div>

        {/* Create Bot Form */}
        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="gradient-border-card rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" /> New Bot
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Name <span className="text-destructive">*</span></label>
                <input value={newBot.name} onChange={e => { setNewBot({ ...newBot, name: e.target.value }); setErrors(prev => ({ ...prev, name: '' })); }} placeholder="ImageGen Pro" maxLength={64} className={`w-full bg-muted/20 border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40 ${errors.name ? 'border-destructive' : 'border-border'}`} />
                <FieldError field="name" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Skills (comma-separated)</label>
                <input value={newBot.skills} onChange={e => { setNewBot({ ...newBot, skills: e.target.value }); setErrors(prev => ({ ...prev, skills: '' })); }} placeholder="image-gen, text-to-image" maxLength={500} className={`w-full bg-muted/20 border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40 ${errors.skills ? 'border-destructive' : 'border-border'}`} />
                <FieldError field="skills" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Price Model</label>
                <select value={newBot.priceModel} onChange={e => setNewBot({ ...newBot, priceModel: e.target.value })} className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40">
                  <option value="fixed">Fixed (x402)</option>
                  <option value="stream">Stream (USDCx)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Price</label>
                <div className="flex gap-2">
                  <input type="number" step="0.0001" min="0.000001" max="1000000" value={newBot.priceAmount} onChange={e => { setNewBot({ ...newBot, priceAmount: e.target.value }); setErrors(prev => ({ ...prev, priceAmount: '' })); }} className={`flex-1 bg-muted/20 border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40 ${errors.priceAmount ? 'border-destructive' : 'border-border'}`} />
                  <select value={newBot.priceAsset} onChange={e => setNewBot({ ...newBot, priceAsset: e.target.value })} className="bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40">
                    <option value="sBTC">sBTC</option>
                    <option value="USDCx">USDCx</option>
                  </select>
                </div>
                <FieldError field="priceAmount" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button onClick={createBot} disabled={creating} className="bg-primary text-primary-foreground hover:bg-primary/90">{creating ? "Registering..." : "Create & Register On-Chain"}</Button>
              <Button variant="outline" onClick={() => { setShowCreate(false); setErrors({}); }} className="border-border text-muted-foreground">Cancel</Button>
            </div>
          </motion.div>
        )}

        {/* Wallet Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">sBTC Balance</span>
            </div>
            <p className="text-xl font-bold text-foreground font-mono tabular-nums">{wallet.sbtcBalance.toFixed(4)}</p>
            <p className="text-[10px] text-muted-foreground">${(wallet.sbtcBalance * SBTC_TO_USD).toFixed(2)}</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-secondary" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">USDCx Balance</span>
            </div>
            <p className="text-xl font-bold text-foreground font-mono tabular-nums">{wallet.usdcxBalance.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">${wallet.usdcxBalance.toFixed(2)}</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Radio className="w-4 h-4 text-green-400" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Active Streams</span>
            </div>
            <p className="text-xl font-bold text-foreground tabular-nums">{wallet.activeStreams}</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-4 h-4 text-primary" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">My Bots</span>
            </div>
            <p className="text-xl font-bold text-foreground tabular-nums">{bots.length}</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Active</span>
            </div>
            <p className="text-xl font-bold text-foreground tabular-nums">{bots.filter(b => b.active).length}</p>
          </div>
        </div>

        {/* Earnings + Activity side by side */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Earnings chart (simple bars) */}
          <div className="lg:col-span-2 gradient-border-card rounded-xl p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">Earnings (7 days)</h2>
            <div className="flex items-end gap-2 h-32">
              {mockEarningsTimeSeries.map((d, i) => {
                const total = d.sbtcUsd + d.usdcx;
                const maxVal = Math.max(...mockEarningsTimeSeries.map(x => x.sbtcUsd + x.usdcx));
                const pct = (total / maxVal) * 100;
                const sbtcPct = (d.sbtcUsd / total) * 100;
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-md overflow-hidden relative"
                      style={{ height: `${pct}%` }}
                    >
                      <div className="absolute bottom-0 w-full bg-primary/40" style={{ height: `${sbtcPct}%` }} />
                      <div className="absolute top-0 w-full bg-secondary/40" style={{ height: `${100 - sbtcPct}%` }} />
                    </div>
                    <span className="text-[9px] text-muted-foreground">{d.date}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary/40" /> sBTC (USD)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-secondary/40" /> USDCx</span>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="gradient-border-card rounded-xl p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {recentActivity.map((tx) => (
                <div key={tx.id} className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${
                    tx.protocol === "x402" ? "bg-primary/10" : "bg-secondary/10"
                  }`}>
                    <Zap className={`w-3 h-3 ${tx.protocol === "x402" ? "text-primary" : "text-secondary"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground truncate">
                      {botNameMap[tx.fromBotId] || tx.fromBotId} → {botNameMap[tx.toBotId] || tx.toBotId}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {tx.amount} {tx.asset} · {tx.memo}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Sparkles, label: "Mint NFT", desc: "Turn bots into NFTs", to: "/nfts", color: "text-secondary" },
              { icon: Users, label: "Join Swarm", desc: "Collaborate with bots", to: "/swarms", color: "text-primary" },
              { icon: Image, label: "Marketplace", desc: "Hire molbots", to: "/marketplace", color: "text-accent" },
              { icon: Activity, label: "Governance", desc: "Vote on proposals", to: "/governance", color: "text-secondary" },
            ].map((action) => (
              <Link key={action.label} to={action.to} className="glass-card rounded-xl p-4 hover:border-primary/30 transition-all group">
                <action.icon className={`w-5 h-5 ${action.color} mb-2`} />
                <p className="text-sm font-semibold text-foreground">{action.label}</p>
                <p className="text-[10px] text-muted-foreground">{action.desc}</p>
                <ArrowRight className="w-3 h-3 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors mt-1" />
              </Link>
            ))}
          </div>
        </div>

        {/* Bot list */}
        {loading ? (
          <p className="text-center text-muted-foreground" role="status">Loading...</p>
        ) : visibleBots.length === 0 ? (
          <div className="text-center py-16" role="status">
            <Bot className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No bots yet. Create your first one!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4" role="list" aria-label="Your bots">
            {visibleBots.map((bot) => (
              <motion.div key={bot.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="gradient-border-card rounded-xl p-5" role="listitem">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">🤖</span>
                  <span className={`text-[11px] font-mono px-2 py-1 rounded-md ${bot.active ? "bg-primary/10 text-primary border border-primary/15" : "bg-muted text-muted-foreground"}`}>
                    {bot.active ? "active" : "inactive"}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">{bot.name}</h3>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span className="font-mono">{bot.price_amount} {bot.price_asset}</span>
                  <span>{bot.price_model === "stream" ? "stream" : "per call"}</span>
                </div>
                {bot.on_chain_id && <p className="text-[10px] text-muted-foreground/50 font-mono">Chain ID: {bot.on_chain_id}</p>}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
