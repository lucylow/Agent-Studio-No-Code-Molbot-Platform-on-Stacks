import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Bot, Activity, Wallet, LogOut, AlertCircle, Sparkles, Users, Image, ArrowRight } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { createBotSchema } from "@/lib/validation";

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

const DEMO_BOTS: BotData[] = [
  { id: 1, name: "ImageGen Pro", skills: ["image-gen", "text-to-image"], price_model: "fixed", price_amount: 0.002, price_asset: "sBTC", active: true, on_chain_id: 1001, created_at: "2026-03-15T10:00:00Z" },
  { id: 2, name: "CodeAudit Bot", skills: ["code-review", "security-scan"], price_model: "fixed", price_amount: 0.005, price_asset: "sBTC", active: true, on_chain_id: 1002, created_at: "2026-03-16T14:30:00Z" },
  { id: 3, name: "DataCrunch v2", skills: ["data-analysis", "csv-parse"], price_model: "stream", price_amount: 0.001, price_asset: "USDCx", active: false, on_chain_id: 1003, created_at: "2026-03-17T09:15:00Z" },
  { id: 4, name: "TranslatorX", skills: ["translation", "nlp"], price_model: "fixed", price_amount: 0.003, price_asset: "sBTC", active: true, on_chain_id: 1004, created_at: "2026-03-18T16:45:00Z" },
];

const Dashboard = () => {
  const { user, signOut, isDemo } = useAuth();
  const navigate = useNavigate();
  const [bots, setBots] = useState<BotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newBot, setNewBot] = useState({ name: "", skills: "", priceModel: "fixed", priceAmount: "0.001", priceAsset: "sBTC" });

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    if (isDemo) {
      setBots(DEMO_BOTS);
      setLoading(false);
    } else {
      loadBots();
    }
  }, [user, isDemo]);

  const loadBots = async () => {
    try {
      const { data, error } = await supabase.from("bots").select("*").eq("owner_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      setBots((data as BotData[]) || []);
    } catch (err: any) {
      console.error("Failed to load bots:", err);
      toast.error("Failed to load your bots. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  const createBot = async () => {
    setErrors({});
    const result = createBotSchema.safeParse(newBot);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((e) => {
        const field = e.path[0] as string;
        fieldErrors[field] = e.message;
      });
      setErrors(fieldErrors);
      toast.error("Please fix the validation errors");
      return;
    }

    if (isDemo) {
      const demoBotId = bots.length + 5;
      const newDemoBot: BotData = {
        id: demoBotId,
        name: result.data.name,
        skills: result.data.skills.split(",").map((s: string) => s.trim()).filter(Boolean),
        price_model: result.data.priceModel,
        price_amount: parseFloat(result.data.priceAmount),
        price_asset: result.data.priceAsset,
        active: true,
        on_chain_id: 2000 + demoBotId,
        created_at: new Date().toISOString(),
      };
      setBots((prev) => [newDemoBot, ...prev]);
      toast.success(`Bot "${result.data.name}" created!`, {
        description: `Demo On-chain ID: ${newDemoBot.on_chain_id}`,
      });
      setShowCreate(false);
      setNewBot({ name: "", skills: "", priceModel: "fixed", priceAmount: "0.001", priceAsset: "sBTC" });
      setErrors({});
      return;
    }

    setCreating(true);
    try {
      const session = await supabase.auth.getSession();
      const idempotencyKey = crypto.randomUUID();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bot-api?action=create-bot`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "idempotency-key": idempotencyKey,
          },
          body: JSON.stringify({
            name: result.data.name,
            skills: result.data.skills,
            priceModel: result.data.priceModel,
            priceAmount: result.data.priceAmount,
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
    } catch (err: any) {
      toast.error(err.message || "Failed to create bot");
    } finally {
      setCreating(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (!user) return null;

  const FieldError = ({ field }: { field: string }) =>
    errors[field] ? (
      <p className="text-destructive text-xs mt-1 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" /> {errors[field]}
      </p>
    ) : null;

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isDemo && <span className="inline-block bg-primary/15 text-primary text-[10px] font-mono px-2 py-0.5 rounded-md mr-2">DEMO</span>}
              {user.email}
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setShowCreate(!showCreate)} className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan gap-2">
              <Plus className="w-4 h-4" /> Create Bot
            </Button>
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
                <input
                  value={newBot.name}
                  onChange={e => { setNewBot({ ...newBot, name: e.target.value }); setErrors(prev => ({ ...prev, name: '' })); }}
                  placeholder="ImageGen Pro"
                  maxLength={64}
                  className={`w-full bg-muted/20 border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40 ${errors.name ? 'border-destructive' : 'border-border'}`}
                />
                <FieldError field="name" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Skills (comma-separated, max 10)</label>
                <input
                  value={newBot.skills}
                  onChange={e => { setNewBot({ ...newBot, skills: e.target.value }); setErrors(prev => ({ ...prev, skills: '' })); }}
                  placeholder="image-gen, text-to-image"
                  maxLength={500}
                  className={`w-full bg-muted/20 border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40 ${errors.skills ? 'border-destructive' : 'border-border'}`}
                />
                <FieldError field="skills" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Price Model</label>
                <select
                  value={newBot.priceModel}
                  onChange={e => setNewBot({ ...newBot, priceModel: e.target.value })}
                  className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40"
                >
                  <option value="fixed">Fixed (x402)</option>
                  <option value="stream">Stream (USDCx)</option>
                </select>
                <FieldError field="priceModel" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Price</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.0001"
                    min="0.000001"
                    max="1000000"
                    value={newBot.priceAmount}
                    onChange={e => { setNewBot({ ...newBot, priceAmount: e.target.value }); setErrors(prev => ({ ...prev, priceAmount: '' })); }}
                    className={`flex-1 bg-muted/20 border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40 ${errors.priceAmount ? 'border-destructive' : 'border-border'}`}
                  />
                  <select
                    value={newBot.priceAsset}
                    onChange={e => setNewBot({ ...newBot, priceAsset: e.target.value })}
                    className="bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40"
                  >
                    <option value="sBTC">sBTC</option>
                    <option value="USDCx">USDCx</option>
                  </select>
                </div>
                <FieldError field="priceAmount" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button onClick={createBot} disabled={creating} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {creating ? "Registering..." : "Create & Register On-Chain"}
              </Button>
              <Button variant="outline" onClick={() => { setShowCreate(false); setErrors({}); }} className="border-border text-muted-foreground">Cancel</Button>
            </div>
          </motion.div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="glass-card rounded-xl p-4 text-center">
            <Bot className="w-5 h-5 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">{bots.length}</div>
            <div className="text-xs text-muted-foreground">My Bots</div>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <Activity className="w-5 h-5 text-secondary mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">{bots.filter(b => b.active).length}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <Wallet className="w-5 h-5 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground font-mono">
              {bots.reduce((sum, b) => sum + (b.price_amount || 0), 0).toFixed(4)}
            </div>
            <div className="text-xs text-muted-foreground">Total Value</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Sparkles, label: "Mint NFT", desc: "Turn bots into NFTs", to: "/nfts", color: "text-secondary" },
              { icon: Users, label: "Join Swarm", desc: "Collaborate with bots", to: "/swarms", color: "text-primary" },
              { icon: Image, label: "Generate Content", desc: "x402 Content Gen", to: "/marketplace", color: "text-accent" },
              { icon: Activity, label: "DAO Governance", desc: "Vote on proposals", to: "/governance", color: "text-secondary" },
            ].map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className="glass-card rounded-xl p-4 hover:border-primary/30 transition-all group"
                aria-label={`${action.label}: ${action.desc}`}
              >
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
        ) : bots.length === 0 ? (
          <div className="text-center py-16" role="status">
            <Bot className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No bots yet. Create your first one!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4" role="list" aria-label="Your bots">
            {bots.map((bot) => (
              <motion.div key={bot.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="gradient-border-card rounded-xl p-5" role="listitem" aria-label={`Bot: ${bot.name}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl" role="img" aria-label="Robot">🤖</span>
                  <span className={`text-[11px] font-mono px-2 py-1 rounded-md ${bot.active ? "bg-primary/10 text-primary border border-primary/15" : "bg-muted text-muted-foreground"}`}>
                    {bot.active ? "active" : "inactive"}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">{bot.name}</h3>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span className="font-mono">{bot.price_amount} {bot.price_asset}</span>
                  <span>{bot.price_model === "stream" ? "stream" : "per call"}</span>
                </div>
                {bot.on_chain_id && (
                  <p className="text-[10px] text-muted-foreground/50 font-mono">Chain ID: {bot.on_chain_id}</p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
