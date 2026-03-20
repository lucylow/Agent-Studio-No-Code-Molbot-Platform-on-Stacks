import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Plus, Bot, Activity, LogOut, AlertCircle, Sparkles, Users, Image, ArrowRight,
  TrendingUp, Zap, DollarSign, Radio, Wallet,
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

type DashboardProps = { initialView?: "studio" | "agents" };

const DEMO_BOTS: BotData[] = [
  { id: 1, name: "ImageGen Pro", skills: ["image-gen"], price_model: "fixed", price_amount: 0.002, price_asset: "sBTC", active: true, on_chain_id: 1001, created_at: "2026-03-15T10:00:00Z" },
  { id: 2, name: "CodeAudit Bot", skills: ["code-review"], price_model: "fixed", price_amount: 0.005, price_asset: "sBTC", active: true, on_chain_id: 1002, created_at: "2026-03-16T14:30:00Z" },
  { id: 3, name: "DataCrunch v2", skills: ["data-analysis"], price_model: "stream", price_amount: 0.001, price_asset: "USDCx", active: false, on_chain_id: 1003, created_at: "2026-03-17T09:15:00Z" },
  { id: 4, name: "TranslatorX", skills: ["translation"], price_model: "fixed", price_amount: 0.003, price_asset: "sBTC", active: true, on_chain_id: 1004, created_at: "2026-03-18T16:45:00Z" },
];

const ease = [0.16, 1, 0.3, 1] as const;

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
  const visibleBots = botsFilter === "active" ? bots.filter((b) => b.active) : botsFilter === "paused" ? bots.filter((b) => !b.active) : bots;
  const wallet = mockWalletData;
  const recentActivity = mockTransactions.slice(0, 5);
  const botNameMap = Object.fromEntries(mockMolbots.map((b) => [b.id, b.name]));

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    if (isDemo) { setBots(DEMO_BOTS); setLoading(false); }
    else loadBots();
  }, [user, isDemo]);

  useSupabasePostgresChanges({
    channelKey: user ? `bots:owner:${user.id}` : "bots:owner:unknown",
    table: "bots", events: ["INSERT", "UPDATE", "DELETE"], enabled: !!user && !isDemo,
    filter: user ? `owner_id=eq.${user.id}` : undefined, throttleMs: 250,
    onPayload: (payload) => {
      setBots((prev) => {
        switch (payload.eventType) {
          case "DELETE": { const id = payload.old?.id as number | undefined; return id !== undefined ? prev.filter((b) => b.id !== id) : prev; }
          case "INSERT": case "UPDATE": { const row = payload.new as BotData | undefined; if (!row) return prev; const next = prev.some((b) => b.id === row.id) ? prev.map((b) => (b.id === row.id ? row : b)) : [row, ...prev]; return next.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)); }
          default: return prev;
        }
      });
    },
  });

  const loadBots = async () => {
    try {
      const { data, error } = await supabase.from("bots").select("id, name, skills, price_model, price_amount, price_asset, active, on_chain_id, created_at").eq("owner_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      setBots((data as BotData[]) || []);
    } catch { toast.error("Failed to load bots"); }
    finally { setLoading(false); }
  };

  const createBot = async () => {
    setErrors({});
    const result = createBotSchema.safeParse(newBot);
    if (!result.success) {
      const fe: Record<string, string> = {};
      result.error.errors.forEach((e) => { fe[e.path[0] as string] = e.message; });
      setErrors(fe);
      return;
    }
    if (isDemo) {
      const id = bots.length + 5;
      setBots((prev) => [{ id, name: result.data.name, skills: result.data.skills, price_model: result.data.priceModel, price_amount: result.data.priceAmount, price_asset: result.data.priceAsset, active: true, on_chain_id: 2000 + id, created_at: new Date().toISOString() }, ...prev]);
      toast.success(`Bot "${result.data.name}" created!`);
      setShowCreate(false);
      setNewBot({ name: "", skills: "", priceModel: "fixed", priceAmount: "0.001", priceAsset: "sBTC" });
      return;
    }
    setCreating(true);
    try {
      const session = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bot-api?action=create-bot`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.data.session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ name: result.data.name, skills: result.data.skills, priceModel: result.data.priceModel, priceAmount: result.data.priceAmount, priceAsset: result.data.priceAsset }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Bot "${result.data.name}" created!`);
      setShowCreate(false);
      setNewBot({ name: "", skills: "", priceModel: "fixed", priceAmount: "0.001", priceAsset: "sBTC" });
      loadBots();
    } catch (err: any) { toast.error(err.message || "Failed to create bot"); }
    finally { setCreating(false); }
  };

  if (!user) return null;

  const FieldError = ({ field }: { field: string }) =>
    errors[field] ? <p className="text-destructive text-[11px] mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors[field]}</p> : null;

  const totalFiat = (wallet.sbtcBalance * SBTC_TO_USD) + wallet.usdcxBalance;

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }} className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isDemo && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/10">DEMO</span>}
              <p className="text-xs text-muted-foreground/50">{user.email}</p>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          </div>
          <div className="flex gap-2">
            {initialView === "studio" && (
              <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 h-8 text-xs rounded-lg">
                <Plus className="w-3.5 h-3.5" /> New Bot
              </Button>
            )}
          </div>
        </motion.div>

        {/* Summary band */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06, duration: 0.4, ease }}
          className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-border/15 rounded-xl overflow-hidden border border-border/15 mb-8"
        >
          {[
            { icon: Wallet, label: "Total Value", value: `$${totalFiat.toFixed(0)}`, sub: `${wallet.sbtcBalance.toFixed(4)} sBTC + ${wallet.usdcxBalance.toFixed(0)} USDCx` },
            { icon: DollarSign, label: "sBTC", value: wallet.sbtcBalance.toFixed(4), sub: `$${(wallet.sbtcBalance * SBTC_TO_USD).toFixed(2)}` },
            { icon: TrendingUp, label: "USDCx", value: wallet.usdcxBalance.toFixed(2), sub: `$${wallet.usdcxBalance.toFixed(2)}` },
            { icon: Radio, label: "Streams", value: String(wallet.activeStreams), sub: "active" },
            { icon: Bot, label: "Bots", value: String(bots.length), sub: `${bots.filter(b => b.active).length} active` },
          ].map((m) => (
            <div key={m.label} className="bg-background p-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <m.icon className="w-3 h-3 text-muted-foreground/40" />
                <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">{m.label}</span>
              </div>
              <p className="text-lg font-semibold text-foreground font-mono tabular-nums">{m.value}</p>
              <p className="text-[10px] text-muted-foreground/30 tabular-nums">{m.sub}</p>
            </div>
          ))}
        </motion.div>

        {/* Create Bot Form */}
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="rounded-xl border border-border/20 bg-card/30 p-5 mb-8">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary/60" /> New Bot
            </h2>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground/50 mb-1 block">Name</label>
                <input value={newBot.name} onChange={e => { setNewBot({ ...newBot, name: e.target.value }); setErrors(prev => ({ ...prev, name: '' })); }} placeholder="ImageGen Pro" maxLength={64} className={`w-full bg-muted/10 border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/30 ${errors.name ? 'border-destructive/50' : 'border-border/20'}`} />
                <FieldError field="name" />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground/50 mb-1 block">Skills</label>
                <input value={newBot.skills} onChange={e => { setNewBot({ ...newBot, skills: e.target.value }); setErrors(prev => ({ ...prev, skills: '' })); }} placeholder="image-gen, text-to-image" className={`w-full bg-muted/10 border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/30 ${errors.skills ? 'border-destructive/50' : 'border-border/20'}`} />
                <FieldError field="skills" />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground/50 mb-1 block">Model</label>
                <select value={newBot.priceModel} onChange={e => setNewBot({ ...newBot, priceModel: e.target.value })} className="w-full bg-muted/10 border border-border/20 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/30">
                  <option value="fixed">Fixed (x402)</option>
                  <option value="stream">Stream (USDCx)</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground/50 mb-1 block">Price</label>
                <div className="flex gap-2">
                  <input type="number" step="0.0001" min="0.000001" value={newBot.priceAmount} onChange={e => { setNewBot({ ...newBot, priceAmount: e.target.value }); setErrors(prev => ({ ...prev, priceAmount: '' })); }} className={`flex-1 bg-muted/10 border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/30 ${errors.priceAmount ? 'border-destructive/50' : 'border-border/20'}`} />
                  <select value={newBot.priceAsset} onChange={e => setNewBot({ ...newBot, priceAsset: e.target.value })} className="bg-muted/10 border border-border/20 rounded-lg px-3 py-2 text-sm text-foreground">
                    <option value="sBTC">sBTC</option>
                    <option value="USDCx">USDCx</option>
                  </select>
                </div>
                <FieldError field="priceAmount" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button size="sm" onClick={createBot} disabled={creating} className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-xs rounded-lg">{creating ? "Creating..." : "Create Bot"}</Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowCreate(false); setErrors({}); }} className="h-8 text-xs text-muted-foreground">Cancel</Button>
            </div>
          </motion.div>
        )}

        {/* Content grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Earnings */}
          <div className="lg:col-span-2 rounded-xl border border-border/15 bg-card/20 p-5">
            <h2 className="text-xs font-medium text-muted-foreground/50 uppercase tracking-wider mb-4">Earnings · 7 days</h2>
            <div className="flex items-end gap-1.5 h-28">
              {mockEarningsTimeSeries.map((d, i) => {
                const total = d.sbtcUsd + d.usdcx;
                const maxVal = Math.max(...mockEarningsTimeSeries.map(x => x.sbtcUsd + x.usdcx));
                const pct = (total / maxVal) * 100;
                const sbtcPct = total > 0 ? (d.sbtcUsd / total) * 100 : 0;
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-md overflow-hidden relative" style={{ height: `${pct}%` }}>
                      <div className="absolute bottom-0 w-full bg-primary/25 rounded-b-md" style={{ height: `${sbtcPct}%` }} />
                      <div className="absolute top-0 w-full bg-secondary/20 rounded-t-md" style={{ height: `${100 - sbtcPct}%` }} />
                    </div>
                    <span className="text-[8px] text-muted-foreground/30 tabular-nums">{d.date}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-[9px] text-muted-foreground/30">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-sm bg-primary/30" /> sBTC</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-sm bg-secondary/25" /> USDCx</span>
            </div>
          </div>

          {/* Activity */}
          <div className="rounded-xl border border-border/15 bg-card/20 p-5">
            <h2 className="text-xs font-medium text-muted-foreground/50 uppercase tracking-wider mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {recentActivity.map((tx) => (
                <div key={tx.id} className="flex items-start gap-2.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 shrink-0 ${tx.protocol === "x402" ? "bg-primary/8" : "bg-secondary/8"}`}>
                    <Zap className={`w-2.5 h-2.5 ${tx.protocol === "x402" ? "text-primary/60" : "text-secondary/60"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-foreground/80 truncate">{botNameMap[tx.fromBotId] || tx.fromBotId} → {botNameMap[tx.toBotId] || tx.toBotId}</p>
                    <p className="text-[9px] text-muted-foreground/40 font-mono tabular-nums">{tx.amount} {tx.asset}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mb-8">
          <h2 className="text-xs font-medium text-muted-foreground/40 uppercase tracking-wider mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { icon: Sparkles, label: "Mint NFT", desc: "Turn bots into NFTs", to: "/nfts" },
              { icon: Users, label: "Swarms", desc: "Team collaboration", to: "/swarms" },
              { icon: Image, label: "Marketplace", desc: "Hire molbots", to: "/marketplace" },
              { icon: Activity, label: "Governance", desc: "Vote on proposals", to: "/governance" },
            ].map((a) => (
              <Link key={a.label} to={a.to} className="rounded-xl border border-border/15 bg-card/10 p-3.5 hover:bg-card/30 hover:border-border/30 transition-all duration-200 group active:scale-[0.98]">
                <a.icon className="w-4 h-4 text-muted-foreground/40 mb-2 group-hover:text-primary/60 transition-colors" />
                <p className="text-xs font-medium text-foreground/80">{a.label}</p>
                <p className="text-[10px] text-muted-foreground/30">{a.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Bot list */}
        {loading ? (
          <p className="text-center text-sm text-muted-foreground/30 py-12">Loading...</p>
        ) : visibleBots.length === 0 ? (
          <div className="text-center py-16">
            <Bot className="w-10 h-10 text-muted-foreground/15 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground/40">No bots yet</p>
            <p className="text-xs text-muted-foreground/25 mt-1">Create your first one to get started</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleBots.map((bot) => (
              <motion.div key={bot.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-border/15 bg-card/20 p-4 hover:border-border/30 transition-all duration-200 active:scale-[0.99]">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xl">🤖</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${bot.active ? "bg-primary/8 text-primary/70" : "bg-muted/30 text-muted-foreground/40"}`}>
                    {bot.active ? "live" : "paused"}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-foreground mb-1">{bot.name}</h3>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground/40 mb-1">
                  <span className="font-mono tabular-nums">{bot.price_amount} {bot.price_asset}</span>
                  <span>{bot.price_model === "stream" ? "stream" : "per call"}</span>
                </div>
                {bot.on_chain_id && <p className="text-[9px] text-muted-foreground/25 font-mono tabular-nums">ID: {bot.on_chain_id}</p>}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
