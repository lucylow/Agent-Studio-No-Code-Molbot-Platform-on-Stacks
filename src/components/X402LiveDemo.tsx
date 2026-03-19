import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ArrowRight, Bot, Play, RotateCcw, CheckCircle, Clock, DollarSign, Shield, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type Phase = "idle" | "discover" | "negotiate" | "sign" | "settle" | "complete";

interface BotState {
  id: string;
  name: string;
  emoji: string;
  balance: number;
  asset: "sBTC" | "USDCx";
  x: number;
  y: number;
}

const INITIAL_BOTS: BotState[] = [
  { id: "requester", name: "DataCruncher", emoji: "📊", balance: 0.05, asset: "sBTC", x: 15, y: 50 },
  { id: "provider", name: "ImageGen", emoji: "🎨", balance: 0.02, asset: "sBTC", x: 85, y: 50 },
];

const PAYMENT_AMOUNT = 0.003;

const phaseConfig: Record<Phase, { label: string; description: string; icon: typeof Zap; color: string }> = {
  idle: { label: "Ready", description: "Click Start to initiate an x402 payment between two bots", icon: Play, color: "text-muted-foreground" },
  discover: { label: "1 — Discovery", description: "DataCruncher requests ImageGen's API. Server returns HTTP 402 with payment headers.", icon: Bot, color: "text-primary" },
  negotiate: { label: "2 — Negotiate", description: "ImageGen responds with X-Payment headers: amount, asset, receiver address, contract.", icon: DollarSign, color: "text-secondary" },
  sign: { label: "3 — Sign & Pay", description: "DataCruncher's wallet signs the sBTC transaction and broadcasts to Stacks.", icon: Shield, color: "text-primary" },
  settle: { label: "4 — On-Chain Settlement", description: "Transaction confirmed on Stacks L2, secured by Bitcoin. 2% burn applied.", icon: Clock, color: "text-secondary" },
  complete: { label: "5 — Service Delivered", description: "ImageGen verifies payment proof, unlocks the API response. Task complete!", icon: CheckCircle, color: "text-green-400" },
};

const PHASE_ORDER: Phase[] = ["idle", "discover", "negotiate", "sign", "settle", "complete"];

const X402LiveDemo = () => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [bots, setBots] = useState<BotState[]>(INITIAL_BOTS);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [txHash, setTxHash] = useState("");
  const logsRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight;
  }, [logs]);

  const generateTxHash = () =>
    "0x" + Array.from({ length: 12 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

  const advancePhase = useCallback(async () => {
    const currentIdx = PHASE_ORDER.indexOf(phase);
    if (currentIdx >= PHASE_ORDER.length - 1) return;

    const nextPhase = PHASE_ORDER[currentIdx + 1];
    setIsAnimating(true);
    setPhase(nextPhase);

    // Simulate phase progress
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(r => setTimeout(r, 40));
      setProgress(i);
    }

    switch (nextPhase) {
      case "discover":
        addLog("GET /api/generate-chart → HTTP 402 Payment Required");
        addLog("X-Payment-Required: true");
        break;
      case "negotiate":
        addLog("X-Payment-Amount: 0.003 sBTC");
        addLog("X-Payment-Asset: sBTC (SIP-010)");
        addLog("X-Payment-Receiver: SP2...ImageGen");
        addLog("X-Payment-Contract: payment-router.clar");
        break;
      case "sign": {
        const hash = generateTxHash();
        setTxHash(hash);
        addLog(`Wallet signing tx: ${hash}`);
        addLog("Broadcasting to Stacks mempool...");
        break;
      }
      case "settle":
        addLog(`Tx confirmed in block #148,291`);
        addLog(`Burn: ${(PAYMENT_AMOUNT * 0.02).toFixed(6)} sBTC (2% deflationary)`);
        addLog(`Net to ImageGen: ${(PAYMENT_AMOUNT * 0.98).toFixed(6)} sBTC`);
        setBots(prev => [
          { ...prev[0], balance: +(prev[0].balance - PAYMENT_AMOUNT).toFixed(6) },
          { ...prev[1], balance: +(prev[1].balance + PAYMENT_AMOUNT * 0.98).toFixed(6) },
        ]);
        break;
      case "complete":
        addLog("Payment proof verified ✓");
        addLog("API response unlocked: chart_v2.png (1.2MB)");
        addLog("Task complete. Service delivered.");
        break;
    }

    setProgress(0);
    setIsAnimating(false);
  }, [phase, addLog]);

  const reset = () => {
    setPhase("idle");
    setBots(INITIAL_BOTS);
    setProgress(0);
    setLogs([]);
    setTxHash("");
    setIsAnimating(false);
  };

  const phaseIdx = PHASE_ORDER.indexOf(phase);
  const config = phaseConfig[phase];
  const Icon = config.icon;

  return (
    <section className="relative py-24 overflow-hidden" id="x402-demo">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-4">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-mono text-primary">INTERACTIVE x402 DEMO</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Simulate a Bot-to-Bot <span className="text-primary">Payment</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Step through the full x402 protocol — from HTTP 402 discovery to on-chain settlement on Stacks.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto grid md:grid-cols-5 gap-6">
          {/* Left: Visual + Controls (3 cols) */}
          <div className="md:col-span-3 space-y-5">
            {/* Bot Arena */}
            <div className="relative bg-card border border-border rounded-2xl p-6 min-h-[220px] overflow-hidden">
              {/* Connection beam */}
              {phase !== "idle" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute top-1/2 left-[20%] right-[20%] h-[2px] -translate-y-1/2"
                >
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-primary via-secondary to-primary"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.6 }}
                    style={{ transformOrigin: phase === "sign" || phase === "settle" ? "left" : "right" }}
                  />
                  {/* Traveling particle */}
                  {(phase === "sign" || phase === "settle") && (
                    <motion.div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]"
                      animate={{ left: ["0%", "100%"] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    />
                  )}
                  {phase === "complete" && (
                    <motion.div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-green-400 shadow-[0_0_12px_#4ade80]"
                      animate={{ right: ["0%", "100%"] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    />
                  )}
                </motion.div>
              )}

              {/* Bots */}
              {bots.map((bot, i) => (
                <motion.div
                  key={bot.id}
                  className="absolute top-1/2 -translate-y-1/2"
                  style={{ left: `${bot.x}%`, transform: "translate(-50%, -50%)" }}
                  animate={{
                    scale: (phase === "sign" && i === 0) || (phase === "complete" && i === 1) ? [1, 1.08, 1] : 1,
                  }}
                  transition={{ duration: 0.8, repeat: (phase === "sign" && i === 0) || (phase === "complete" && i === 1) ? Infinity : 0 }}
                >
                  <div className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center text-3xl transition-all duration-300 ${
                    phase !== "idle"
                      ? i === 0
                        ? "border-destructive/50 bg-destructive/10 shadow-[0_0_20px_hsl(0,84%,60%,0.15)]"
                        : "border-primary/50 bg-primary/10 shadow-[0_0_20px_hsl(var(--primary)/0.15)]"
                      : "border-border bg-muted/30"
                  }`}>
                    {bot.emoji}
                  </div>
                  <p className="text-center text-xs font-semibold text-foreground mt-2">{bot.name}</p>
                  <p className="text-center text-[10px] font-mono text-muted-foreground">
                    {bot.balance.toFixed(4)} {bot.asset}
                  </p>
                </motion.div>
              ))}

              {/* Phase label overlay */}
              {phase !== "idle" && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-3 left-1/2 -translate-x-1/2"
                >
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full bg-card border border-border text-xs font-mono ${config.color}`}>
                    <Icon className="w-3 h-3" />
                    {config.label}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Phase description */}
            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="bg-card/50 border border-border rounded-xl px-5 py-4"
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${config.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{config.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
                    {txHash && (phase === "sign" || phase === "settle" || phase === "complete") && (
                      <p className="text-[10px] font-mono text-primary/70 mt-1">tx: {txHash}</p>
                    )}
                  </div>
                </div>
                {isAnimating && <Progress value={progress} className="mt-3 h-1" />}
              </motion.div>
            </AnimatePresence>

            {/* Step progress dots */}
            <div className="flex items-center justify-center gap-2">
              {PHASE_ORDER.slice(1).map((p, i) => (
                <div
                  key={p}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    i + 1 < phaseIdx ? "bg-primary" : i + 1 === phaseIdx ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))]" : "bg-muted"
                  }`}
                />
              ))}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
              {phase === "complete" ? (
                <Button onClick={reset} variant="outline" className="gap-2">
                  <RotateCcw className="w-4 h-4" /> Reset Demo
                </Button>
              ) : (
                <Button
                  onClick={advancePhase}
                  disabled={isAnimating}
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {phase === "idle" ? (
                    <>
                      <Play className="w-4 h-4" /> Start x402 Flow
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Next Step
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Right: Live Log (2 cols) */}
          <div className="md:col-span-2">
            <div className="bg-card border border-border rounded-2xl h-full flex flex-col">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                </div>
                <span className="text-[10px] font-mono text-muted-foreground ml-2">x402-protocol.log</span>
              </div>
              <div ref={logsRef} className="flex-1 overflow-y-auto p-4 max-h-[340px] min-h-[200px]">
                {logs.length === 0 ? (
                  <p className="text-xs text-muted-foreground/50 font-mono italic">
                    Waiting for x402 flow to start...
                  </p>
                ) : (
                  <div className="space-y-1">
                    {logs.map((log, i) => (
                      <motion.p
                        key={i}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`text-[11px] font-mono leading-relaxed ${
                          log.includes("✓") || log.includes("complete")
                            ? "text-green-400"
                            : log.includes("402") || log.includes("Burn")
                              ? "text-destructive"
                              : log.includes("X-Payment") || log.includes("sBTC")
                                ? "text-primary"
                                : "text-muted-foreground"
                        }`}
                      >
                        {log}
                      </motion.p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mt-10">
          <a href="/simulator" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 text-sm font-semibold transition-colors">
            <Bot className="w-4 h-4" />
            Launch Full Multi-Bot Simulator
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default X402LiveDemo;
