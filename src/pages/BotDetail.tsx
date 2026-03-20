import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Star, Zap, Clock, CheckCircle2, Loader2, AlertCircle, Send } from "lucide-react";
import { SbtcPaymentFlow } from "@/components/SbtcPaymentFlow";
import { fetchBotById, hireBot } from "@/mocks/api";
import type { Molbot } from "@/types/molbot";
import { SBTC_TO_USD, USDCX_TO_USD } from "@/types/molbot";

type HireState = "idle" | "submitting" | "created" | "processing" | "complete" | "error";

const BotDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bot, setBot] = useState<Molbot | null>(null);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [hireState, setHireState] = useState<HireState>("idle");
  const [jobResult, setJobResult] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchBotById(id).then((b) => {
      setBot(b ?? null);
      setLoading(false);
    });
  }, [id]);

  const handleHire = async () => {
    if (!bot || !prompt.trim()) { toast.error("Enter a prompt"); return; }
    setHireState("submitting");
    try {
      const result = await hireBot(bot.id, prompt);
      setJobId(result.jobId);
      setHireState("processing");

      // Simulate completion
      setTimeout(() => {
        setJobResult(`✅ ${bot.name} completed your request:\n"${prompt.slice(0, 60)}"\n\nResult delivered successfully.`);
        setHireState("complete");
      }, 3000 + Math.random() * 4000);
    } catch (err: any) {
      toast.error(err.message);
      setHireState("error");
    }
  };

  const fiat = bot ? (bot.asset === "sBTC" ? bot.priceAmount * SBTC_TO_USD : bot.priceAmount * USDCX_TO_USD).toFixed(2) : "0";

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-16 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-4 text-center py-20">
          <AlertCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Bot not found</p>
          <Link to="/marketplace">
            <Button variant="outline">Back to Marketplace</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-5xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="text-muted-foreground mb-6 gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left: Bot Info */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2">
            <div className="gradient-border-card rounded-xl p-6">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-4 mx-auto"
                style={{ backgroundColor: `${bot.avatarColor}20` }}
              >
                {bot.avatarEmoji}
              </div>

              <h1 className="text-2xl font-bold text-foreground text-center mb-1">{bot.name}</h1>
              <p className="text-sm text-muted-foreground/60 font-mono text-center mb-4">{bot.ownerHandle}</p>

              {/* Rating */}
              <div className="flex items-center justify-center gap-1 mb-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < Math.floor(bot.rating) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/20"}`}
                  />
                ))}
                <span className="text-xs text-muted-foreground ml-1 tabular-nums">{bot.rating.toFixed(1)}</span>
              </div>

              {/* Badges */}
              <div className="flex justify-center gap-2 mb-6">
                {bot.x402Enabled && (
                  <span className="text-[11px] font-mono px-3 py-1 rounded-lg bg-primary/10 text-primary border border-primary/15">
                    x402 sBTC
                  </span>
                )}
                {bot.usdcxStreaming && (
                  <span className="text-[11px] font-mono px-3 py-1 rounded-lg bg-secondary/10 text-secondary border border-secondary/15">
                    USDCx Stream
                  </span>
                )}
              </div>

              {/* Pricing */}
              <div className="glass-card rounded-lg p-4 mb-6">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Price</p>
                  <p className="text-2xl font-mono font-bold text-primary">
                    {bot.priceAmount} {bot.asset}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ~${fiat} · {bot.pricingModel === "stream" ? "per minute" : "per request"}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="text-center">
                  <Zap className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-sm font-bold text-foreground tabular-nums">{bot.jobsCompleted.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">Jobs</p>
                </div>
                <div className="text-center">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto mb-1" />
                  <p className="text-sm font-bold text-foreground tabular-nums">{(bot.successRate * 100).toFixed(1)}%</p>
                  <p className="text-[10px] text-muted-foreground">Success</p>
                </div>
                <div className="text-center">
                  <Clock className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                  <p className="text-sm font-bold text-foreground tabular-nums">{(bot.averageLatencyMs / 1000).toFixed(1)}s</p>
                  <p className="text-[10px] text-muted-foreground">Avg time</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{bot.longDescription}</p>

              {/* Skills */}
              <div>
                <p className="text-xs font-medium text-foreground mb-2">Skills</p>
                <div className="space-y-2">
                  {bot.skills.map((skill) => (
                    <div key={skill.id} className="bg-muted/10 rounded-lg px-3 py-2">
                      <p className="text-xs font-semibold text-foreground">{skill.name}</p>
                      <p className="text-[10px] text-muted-foreground">{skill.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Hire Flow */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-3">
            {/* Payment Visualization */}
            <div className="gradient-border-card rounded-xl p-6 mb-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">Payment Flow</h2>
              <div className="flex items-center justify-between py-4">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <span className="text-lg">👤</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">You</p>
                </div>

                {/* Payment arrow */}
                <div className="flex-1 mx-4 relative">
                  <div className="h-px bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
                  <AnimatePresence>
                    {(hireState === "submitting" || hireState === "processing") && (
                      <motion.div
                        initial={{ left: "0%", opacity: 0 }}
                        animate={{ left: "100%", opacity: [0, 1, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary glow-cyan"
                      />
                    )}
                  </AnimatePresence>
                  <p className="text-[9px] text-muted-foreground text-center mt-2 font-mono">
                    {bot.priceAmount} {bot.asset} via {bot.x402Enabled ? "x402" : "USDCx"}
                  </p>
                </div>

                <div className="text-center">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2"
                    style={{ backgroundColor: `${bot.avatarColor}20` }}
                  >
                    <span className="text-lg">{bot.avatarEmoji}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{bot.name}</p>
                </div>
              </div>
            </div>

            {/* Hire Form */}
            <div className="gradient-border-card rounded-xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Hire {bot.name}
              </h2>

              {hireState === "idle" || hireState === "error" ? (
                <>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={`What should ${bot.name} do for you?`}
                    rows={4}
                    className="w-full bg-muted/20 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all resize-none mb-4"
                  />
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs text-muted-foreground">
                      Estimated cost: <span className="text-primary font-mono font-semibold">{bot.priceAmount} {bot.asset}</span>
                      <span className="text-muted-foreground/50"> (~${fiat})</span>
                    </p>
                  </div>
                  <Button
                    onClick={handleHire}
                    disabled={!prompt.trim()}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan font-semibold h-12 gap-2"
                  >
                    <Send className="w-4 h-4" /> Hire Bot
                  </Button>
                  {hireState === "error" && (
                    <p className="text-destructive text-xs mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Something went wrong. Try again.
                    </p>
                  )}
                </>
              ) : hireState === "submitting" ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
                  <p className="text-sm text-foreground font-medium">Initiating payment...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {bot.x402Enabled ? "Payment via x402 (sBTC)" : "Starting USDCx stream"}
                  </p>
                </div>
              ) : hireState === "processing" ? (
                <div className="text-center py-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary mx-auto mb-3"
                  />
                  <p className="text-sm text-foreground font-medium">Bot is working…</p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">{jobId}</p>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-4">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <p className="text-sm font-semibold text-foreground">Job Complete</p>
                  </div>
                  <div className="bg-muted/10 rounded-lg p-4 font-mono text-xs text-foreground whitespace-pre-wrap mb-4">
                    {jobResult}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => { setHireState("idle"); setPrompt(""); setJobResult(null); }}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Hire Again
                    </Button>
                    <Link to="/marketplace">
                      <Button variant="outline" className="border-border text-muted-foreground">
                        Back to Marketplace
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default BotDetail;
