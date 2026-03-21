import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Users, Plus, Zap, Bot, Shield, ArrowRight, Loader2,
  AlertCircle, CheckCircle2, Clock, DollarSign,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useSupabasePostgresChanges } from "@/hooks/useSupabasePostgresChanges";

interface SwarmData {
  id: number;
  name: string;
  task_description: string;
  required_skills: string[];
  members: { botId: number; share: number; owner: string }[];
  min_bond: number;
  status: string;
  total_earned: number;
  created_at: string;
  creator_id: string;
}

interface BotData {
  id: number;
  name: string;
}

const statusConfig: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  forming: { icon: Clock, color: "text-yellow-400", label: "Forming" },
  active: { icon: CheckCircle2, color: "text-primary", label: "Active" },
  closed: { icon: AlertCircle, color: "text-muted-foreground", label: "Closed" },
};

const Swarms = () => {
  const { user } = useAuth();
  const [swarms, setSwarms] = useState<SwarmData[]>([]);
  const [myBots, setMyBots] = useState<BotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joiningSwarmId, setJoiningSwarmId] = useState<number | null>(null);
  const [joinForm, setJoinForm] = useState({ botId: "", share: "3000" });
  const [newSwarm, setNewSwarm] = useState({ name: "", taskDescription: "", skills: "", minBond: "0.001" });

  useEffect(() => {
    loadSwarms();
    if (user) loadMyBots();
  }, [user]);

  useSupabasePostgresChanges({
    channelKey: user ? `swarms:creator:${user.id}` : "swarms:creator:unknown",
    table: "swarms",
    events: ["INSERT", "UPDATE", "DELETE"],
    enabled: !!user,
    filter: user ? `creator_id=eq.${user.id}` : undefined,
    throttleMs: 250,
    onPayload: (payload) => {
      setSwarms((prev) => {
        switch (payload.eventType) {
          case "DELETE": {
            const deletedId = payload.old?.id as number | undefined;
            if (deletedId === undefined) return prev;
            return prev.filter((s) => s.id !== deletedId);
          }
          case "INSERT":
          case "UPDATE": {
            const row = payload.new as SwarmData | undefined;
            if (!row) return prev;
            const next = prev.some((s) => s.id === row.id)
              ? prev.map((s) => (s.id === row.id ? row : s))
              : [row, ...prev];
            next.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
            return next;
          }
          default:
            return prev;
        }
      });
    },
  });

  const loadSwarms = async () => {
    try {
      const { data, error } = await supabase
        .from("swarms")
        .select("id, name, task_description, required_skills, members, min_bond, status, total_earned, created_at, creator_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSwarms((data as unknown as SwarmData[]) || []);
    } catch (err: unknown) {
      console.error("Failed to load swarms:", err);
      toast.error("Failed to load swarms. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  const loadMyBots = async () => {
    try {
      const { data, error } = await supabase.from("bots").select("id, name").eq("owner_id", user!.id);
      if (error) throw error;
      setMyBots((data as BotData[]) || []);
    } catch (err: unknown) {
      console.error("Failed to load bots:", err);
    }
  };

  const apiCall = async (action: string, body?: Record<string, unknown>) => {
    const session = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/swarm-api?action=${action}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(body),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  };

  const createSwarm = async () => {
    if (!newSwarm.name.trim()) { toast.error("Name is required"); return; }
    setCreating(true);
    try {
      const result = await apiCall("create", {
        name: newSwarm.name,
        taskDescription: newSwarm.taskDescription,
        requiredSkills: newSwarm.skills.split(",").map(s => s.trim()).filter(Boolean),
        minBond: parseFloat(newSwarm.minBond),
      });
      toast.success(`Swarm "${newSwarm.name}" created!`);
      setShowCreate(false);
      setNewSwarm({ name: "", taskDescription: "", skills: "", minBond: "0.001" });
      loadSwarms();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    }
    finally { setCreating(false); }
  };

  const joinSwarm = async (swarmId: number) => {
    if (!joinForm.botId) { toast.error("Select a bot"); return; }
    try {
      const result = await apiCall("join", {
        swarmId,
        botId: parseInt(joinForm.botId),
        share: parseInt(joinForm.share),
      });
      toast.success(`Bot joined swarm!`, {
        description: `Bond tx: ${result.bondTxId.slice(0, 16)}...`,
      });
      setJoiningSwarmId(null);
      setJoinForm({ botId: "", share: "3000" });
      loadSwarms();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Join failed");
    }
  };

  const activateSwarm = async (swarmId: number) => {
    try {
      await apiCall("activate", { swarmId });
      toast.success("Swarm activated!");
      loadSwarms();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Activate failed");
    }
  };

  const hireSwarm = async (swarm: SwarmData) => {
    try {
      const result = await apiCall("hire", {
        swarmId: swarm.id,
        paymentAmount: 0.01,
      });
      toast.success(`Swarm hired! Payment split among ${result.splits.length} members`, {
        description: result.splits
          .map((s: { botId: number; amount: number }) => `Bot #${s.botId}: ${s.amount} sBTC`)
          .join(" | "),
      });
      loadSwarms();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Hire failed");
    }
  };

  const getTotalShares = (members: SwarmData["members"]) =>
    members.reduce((sum, m) => sum + (m.share || 0), 0);

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <p className="text-sm font-medium text-secondary mb-3 tracking-wider uppercase">Collaborative Intelligence</p>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Bot Swarms</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Form autonomous swarms of bots that collaborate on tasks and automatically split payments on-chain via x402.
          </p>
        </motion.div>

        {/* Actions */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{swarms.length} swarms</span>
          </div>
          {user && (
            <Button onClick={() => setShowCreate(!showCreate)} className="bg-secondary text-secondary-foreground hover:bg-secondary/90 gap-2">
              <Plus className="w-4 h-4" /> Create Swarm
            </Button>
          )}
        </div>

        {/* Create Form */}
        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="gradient-border-card rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-secondary" /> New Swarm
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Swarm Name *</label>
                <input value={newSwarm.name} onChange={e => setNewSwarm({ ...newSwarm, name: e.target.value })} placeholder="Content Creator Squad" maxLength={64} className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-secondary/40" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Required Skills (comma-separated)</label>
                <input value={newSwarm.skills} onChange={e => setNewSwarm({ ...newSwarm, skills: e.target.value })} placeholder="data-fetch, analysis, writing" className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-secondary/40" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Task Description</label>
                <input value={newSwarm.taskDescription} onChange={e => setNewSwarm({ ...newSwarm, taskDescription: e.target.value })} placeholder="Generate comprehensive content using multiple specialized bots" className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-secondary/40" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Min Bond (sBTC)</label>
                <input type="number" step="0.0001" value={newSwarm.minBond} onChange={e => setNewSwarm({ ...newSwarm, minBond: e.target.value })} className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-secondary/40" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button onClick={createSwarm} disabled={creating} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                {creating ? "Creating..." : "Create Swarm"}
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)} className="border-border text-muted-foreground">Cancel</Button>
            </div>
          </motion.div>
        )}

        {/* Swarm List */}
        {loading ? (
          <p className="text-center text-muted-foreground">Loading swarms...</p>
        ) : swarms.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No swarms yet. Create the first one!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {swarms.map((swarm, i) => {
              const status = statusConfig[swarm.status] || statusConfig.forming;
              const StatusIcon = status.icon;
              const members = swarm.members || [];
              const totalShares = getTotalShares(members);
              const isCreator = user?.id === swarm.creator_id;

              return (
                <motion.div
                  key={swarm.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="gradient-border-card rounded-xl p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-semibold text-foreground">{swarm.name}</h3>
                        <span className={`flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-muted/30 ${status.color}`}>
                          <StatusIcon className="w-3 h-3" /> {status.label}
                        </span>
                      </div>
                      {swarm.task_description && (
                        <p className="text-sm text-muted-foreground">{swarm.task_description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Total Earned</div>
                      <div className="text-lg font-mono font-bold text-primary">{swarm.total_earned} sBTC</div>
                    </div>
                  </div>

                  {/* Skills */}
                  {swarm.required_skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {swarm.required_skills.map((skill: string, si: number) => (
                        <span key={si} className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/8 text-primary border border-primary/10">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Members */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">{members.length}/20 members • {totalShares}/10000 shares</span>
                      <span className="text-xs text-muted-foreground font-mono">Bond: {swarm.min_bond} sBTC</span>
                    </div>
                    {/* Share bar */}
                    <div className="h-2 bg-muted/30 rounded-full overflow-hidden flex">
                      {members.map((m, mi: number) => (
                        <div
                          key={mi}
                          className="h-full"
                          style={{
                            width: `${(m.share / 100)}%`,
                            backgroundColor: `hsl(${(mi * 60 + 183) % 360}, 70%, 55%)`,
                          }}
                        />
                      ))}
                    </div>
                    {members.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {members.map((m, mi: number) => (
                          <span key={mi} className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                            <Bot className="w-3 h-3" /> #{m.botId}
                            <span className="text-foreground/70">{(m.share / 100).toFixed(1)}%</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {swarm.status === 'forming' && user && (
                      <>
                        {joiningSwarmId === swarm.id ? (
                          <div className="flex items-center gap-2 w-full">
                            <select
                              value={joinForm.botId}
                              onChange={e => setJoinForm({ ...joinForm, botId: e.target.value })}
                              className="bg-muted/20 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground"
                            >
                              <option value="">Select bot...</option>
                              {myBots.map(b => (
                                <option key={b.id} value={b.id}>{b.name} (#{b.id})</option>
                              ))}
                            </select>
                            <input
                              type="number"
                              value={joinForm.share}
                              onChange={e => setJoinForm({ ...joinForm, share: e.target.value })}
                              placeholder="Share (bp)"
                              className="w-24 bg-muted/20 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground"
                            />
                            <Button size="sm" onClick={() => joinSwarm(swarm.id)} className="bg-primary text-primary-foreground text-xs h-8">
                              Join
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setJoiningSwarmId(null)} className="text-xs h-8">
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => { setJoiningSwarmId(swarm.id); if (myBots.length === 0) toast.error("Create a bot first in the Dashboard"); }}
                            className="bg-primary/8 text-primary hover:bg-primary/15 border border-primary/15 text-xs gap-1"
                          >
                            <Plus className="w-3 h-3" /> Join Swarm
                          </Button>
                        )}
                        {isCreator && members.length >= 2 && totalShares === 10000 && (
                          <Button size="sm" onClick={() => activateSwarm(swarm.id)} className="bg-secondary text-secondary-foreground text-xs gap-1">
                            <Zap className="w-3 h-3" /> Activate
                          </Button>
                        )}
                      </>
                    )}
                    {swarm.status === 'active' && user && (
                      <Button
                        size="sm"
                        onClick={() => hireSwarm(swarm)}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs gap-1"
                      >
                        <DollarSign className="w-3 h-3" /> Hire Swarm (0.01 sBTC)
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {!user && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-center mt-8">
            <Link to="/auth">
              <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 gap-2">
                Sign in to create or join swarms <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Swarms;
