import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/errorHandler";
import {
  Vote, Plus, CheckCircle2, XCircle, Clock, Coins,
  AlertCircle, Shield, TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";

interface Proposal {
  id: number;
  proposal_id: number;
  title: string;
  description: string;
  proposal_type: string;
  proposer_id: string;
  start_block: number;
  end_block: number;
  for_votes: number;
  against_votes: number;
  executed: boolean;
  cancelled: boolean;
  action_amount: number | null;
  action_asset: string | null;
  action_recipient: string | null;
  created_at: string;
}

interface TreasuryAsset {
  id: number;
  asset: string;
  balance: number;
  total_deposited: number;
  total_withdrawn: number;
}

const typeColors: Record<string, string> = {
  general: "bg-primary/10 text-primary border-primary/20",
  treasury: "bg-secondary/10 text-secondary border-secondary/20",
  parameter: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

const Governance = () => {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [treasury, setTreasury] = useState<TreasuryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [votingId, setVotingId] = useState<number | null>(null);
  const [newProposal, setNewProposal] = useState({
    title: "", description: "", type: "general",
    actionAmount: "", actionAsset: "sBTC", actionRecipient: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setError(null);
    try {
      const [proposalRes, treasuryRes] = await Promise.all([
        supabase.from("dao_proposals").select("*").order("created_at", { ascending: false }),
        supabase.from("dao_treasury").select("*"),
      ]);

      if (proposalRes.error) throw proposalRes.error;
      if (treasuryRes.error) throw treasuryRes.error;

      setProposals((proposalRes.data as Proposal[]) || []);
      setTreasury((treasuryRes.data as TreasuryAsset[]) || []);
    } catch (err: unknown) {
      console.error("Failed to load governance data:", err);
      setError("Failed to load governance data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const createProposal = async () => {
    if (!user) { toast.error("Please sign in first"); return; }
    if (!newProposal.title.trim()) { toast.error("Title is required"); return; }
    if (!newProposal.description.trim()) { toast.error("Description is required"); return; }

    setCreating(true);
    try {
      const nextId = proposals.length > 0 ? Math.max(...proposals.map(p => p.proposal_id)) + 1 : 1;

      const { error } = await supabase.from("dao_proposals").insert({
        proposal_id: nextId,
        title: newProposal.title.trim(),
        description: newProposal.description.trim(),
        proposal_type: newProposal.type,
        proposer_id: user.id,
        start_block: 0,
        end_block: 144,
        action_amount: newProposal.actionAmount ? parseFloat(newProposal.actionAmount) : null,
        action_asset: newProposal.type === "treasury" ? newProposal.actionAsset : null,
        action_recipient: newProposal.type === "treasury" ? newProposal.actionRecipient || null : null,
      });

      if (error) throw error;

      toast.success("Proposal created!");
      setShowCreate(false);
      setNewProposal({ title: "", description: "", type: "general", actionAmount: "", actionAsset: "sBTC", actionRecipient: "" });
      loadData();
    } catch (err: unknown) {
      toast.error(getUserFriendlyError(err));
    } finally {
      setCreating(false);
    }
  };

  const castVote = async (proposalId: number, support: boolean) => {
    if (!user) { toast.error("Please sign in to vote"); return; }

    setVotingId(proposalId);
    try {
      // Check if already voted
      const { data: existing } = await supabase
        .from("dao_votes")
        .select("id")
        .eq("proposal_id", proposalId)
        .eq("voter_id", user.id)
        .maybeSingle();

      if (existing) {
        toast.error("You've already voted on this proposal");
        return;
      }

      const { error: voteErr } = await supabase.from("dao_votes").insert({
        proposal_id: proposalId,
        voter_id: user.id,
        support,
        weight: 1,
      });

      if (voteErr) throw voteErr;

      // Update vote count on proposal
      const proposal = proposals.find(p => p.id === proposalId);
      if (proposal) {
        const field = support ? "for_votes" : "against_votes";
        const { error: updateErr } = await supabase
          .from("dao_proposals")
          .update({ [field]: (support ? proposal.for_votes : proposal.against_votes) + 1 })
          .eq("id", proposalId);

        if (updateErr) throw updateErr;
      }

      toast.success(support ? "Voted FOR ✅" : "Voted AGAINST ❌");
      loadData();
    } catch (err: unknown) {
      toast.error(getUserFriendlyError(err));
    } finally {
      setVotingId(null);
    }
  };

  const getStatus = (p: Proposal) => {
    if (p.cancelled) return { label: "Cancelled", icon: XCircle, color: "text-destructive" };
    if (p.executed) return { label: "Executed", icon: CheckCircle2, color: "text-primary" };
    return { label: "Active", icon: Clock, color: "text-yellow-400" };
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <p className="text-sm font-medium text-secondary mb-3 tracking-wider uppercase">$AGENT Token Governance</p>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">DAO Governance</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Propose, vote, and govern the Molbot Studio ecosystem — powered by on-chain Clarity contracts.
          </p>
        </motion.div>

        {/* Treasury Overview */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
            <Coins className="w-4 h-4" /> Treasury
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {treasury.length > 0 ? treasury.map((t) => (
              <Card key={t.id} className="bg-card/40 border-border/50">
                <CardContent className="pt-4 pb-3 text-center">
                  <div className="text-xl font-bold font-mono text-foreground">{t.balance}</div>
                  <div className="text-xs text-muted-foreground">{t.asset}</div>
                </CardContent>
              </Card>
            )) : (
              <Card className="bg-card/40 border-border/50 col-span-full">
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-sm text-muted-foreground">No treasury assets yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>

        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Vote className="w-4 h-4" />
            <span>{proposals.length} proposals</span>
          </div>
          {user && (
            <Button onClick={() => setShowCreate(!showCreate)} className="bg-secondary text-secondary-foreground hover:bg-secondary/90 gap-2">
              <Plus className="w-4 h-4" /> New Proposal
            </Button>
          )}
        </div>

        {/* Create Form */}
        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="gradient-border-card rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Vote className="w-5 h-5 text-secondary" /> Create Proposal
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
                <input
                  value={newProposal.title}
                  onChange={e => setNewProposal({ ...newProposal, title: e.target.value })}
                  placeholder="Increase mint fee to 0.002 sBTC"
                  maxLength={128}
                  className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-secondary/40"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                <select
                  value={newProposal.type}
                  onChange={e => setNewProposal({ ...newProposal, type: e.target.value })}
                  className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-secondary/40"
                >
                  <option value="general">General</option>
                  <option value="treasury">Treasury Spend</option>
                  <option value="parameter">Parameter Change</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Description *</label>
                <textarea
                  value={newProposal.description}
                  onChange={e => setNewProposal({ ...newProposal, description: e.target.value })}
                  placeholder="Describe what this proposal changes and why..."
                  maxLength={1024}
                  rows={3}
                  className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-secondary/40 resize-none"
                />
              </div>
              {newProposal.type === "treasury" && (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Amount</label>
                    <input
                      type="number"
                      step="0.001"
                      value={newProposal.actionAmount}
                      onChange={e => setNewProposal({ ...newProposal, actionAmount: e.target.value })}
                      placeholder="0.5"
                      className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-secondary/40"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Asset</label>
                    <select
                      value={newProposal.actionAsset}
                      onChange={e => setNewProposal({ ...newProposal, actionAsset: e.target.value })}
                      className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-secondary/40"
                    >
                      <option value="sBTC">sBTC</option>
                      <option value="USDCx">USDCx</option>
                      <option value="AGENT">$AGENT</option>
                    </select>
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3 mt-4">
              <Button onClick={createProposal} disabled={creating} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                {creating ? "Submitting..." : "Submit Proposal"}
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)} className="border-border text-muted-foreground">Cancel</Button>
            </div>
          </motion.div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-8">
            <AlertCircle className="w-10 h-10 text-destructive/50 mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={loadData} className="border-border text-muted-foreground hover:text-foreground">
              Try Again
            </Button>
          </div>
        )}

        {/* Proposals */}
        {loading ? (
          <p className="text-center text-muted-foreground py-12">Loading proposals...</p>
        ) : !error && proposals.length === 0 ? (
          <div className="text-center py-16">
            <Vote className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No proposals yet. Create the first one!</p>
          </div>
        ) : !error && (
          <div className="space-y-4">
            {proposals.map((p, i) => {
              const status = getStatus(p);
              const StatusIcon = status.icon;
              const totalVotes = p.for_votes + p.against_votes;
              const forPct = totalVotes > 0 ? (p.for_votes / totalVotes) * 100 : 0;

              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="gradient-border-card rounded-xl p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-lg font-semibold text-foreground">{p.title}</h3>
                        <Badge variant="outline" className={`text-[10px] ${typeColors[p.proposal_type] || typeColors.general}`}>
                          {p.proposal_type}
                        </Badge>
                        <span className={`flex items-center gap-1 text-[11px] ${status.color}`}>
                          <StatusIcon className="w-3 h-3" /> {status.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                    </div>
                  </div>

                  {/* Vote Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>For: {p.for_votes}</span>
                      <span>{totalVotes} total votes</span>
                      <span>Against: {p.against_votes}</span>
                    </div>
                    <div className="h-2 bg-muted/30 rounded-full overflow-hidden flex">
                      {totalVotes > 0 && (
                        <>
                          <div className="bg-primary h-full transition-all" style={{ width: `${forPct}%` }} />
                          <div className="bg-destructive/60 h-full transition-all" style={{ width: `${100 - forPct}%` }} />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Treasury Action Info */}
                  {p.proposal_type === "treasury" && p.action_amount && (
                    <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                      <Coins className="w-3 h-3" />
                      Spend {p.action_amount} {p.action_asset || "sBTC"}
                      {p.action_recipient && ` → ${p.action_recipient.slice(0, 12)}...`}
                    </div>
                  )}

                  {/* Vote Actions */}
                  {user && !p.executed && !p.cancelled && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={votingId === p.id}
                        onClick={() => castVote(p.id, true)}
                        className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 text-xs gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Vote For
                      </Button>
                      <Button
                        size="sm"
                        disabled={votingId === p.id}
                        onClick={() => castVote(p.id, false)}
                        className="bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 text-xs gap-1"
                      >
                        <XCircle className="w-3 h-3" /> Vote Against
                      </Button>
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground/50 mt-3">
                    Created {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </motion.div>
              );
            })}
          </div>
        )}

        {!user && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-center mt-8">
            <Link to="/auth">
              <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 gap-2">
                <Shield className="w-4 h-4" /> Sign in to participate
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Governance;
