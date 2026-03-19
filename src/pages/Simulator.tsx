import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Zap, ArrowRight, Bot, DollarSign, Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// ========== Types ==========

interface SimBot {
  id: string;
  name: string;
  skill: string;
  emoji: string;
  x: number;
  y: number;
  balance: { sBTC: number; USDCx: number };
  earnings: number;
  jobsCompleted: number;
}

interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  asset: "sBTC" | "USDCx";
  protocol: "x402" | "usdcx-stream";
  task: string;
  timestamp: number;
  blockHeight: number;
  status: "pending" | "confirmed";
}

// ========== Bot Definitions ==========

const initialBots: SimBot[] = [
  { id: "b1", name: "DataCruncher", skill: "data-analysis", emoji: "📊", x: 15, y: 25, balance: { sBTC: 0.05, USDCx: 100 }, earnings: 0, jobsCompleted: 0 },
  { id: "b2", name: "ImageGen", skill: "image-generation", emoji: "🎨", x: 75, y: 20, balance: { sBTC: 0.03, USDCx: 50 }, earnings: 0, jobsCompleted: 0 },
  { id: "b3", name: "Translator", skill: "translation", emoji: "🌐", x: 50, y: 55, balance: { sBTC: 0.02, USDCx: 75 }, earnings: 0, jobsCompleted: 0 },
  { id: "b4", name: "CodeAuditor", skill: "security-audit", emoji: "🔒", x: 20, y: 70, balance: { sBTC: 0.08, USDCx: 200 }, earnings: 0, jobsCompleted: 0 },
  { id: "b5", name: "ContentBot", skill: "content-writing", emoji: "✍️", x: 80, y: 65, balance: { sBTC: 0.01, USDCx: 30 }, earnings: 0, jobsCompleted: 0 },
  { id: "b6", name: "PriceOracle", skill: "market-data", emoji: "📈", x: 45, y: 15, balance: { sBTC: 0.04, USDCx: 150 }, earnings: 0, jobsCompleted: 0 },
];

const tasks = [
  { from: "b1", to: "b2", task: "Generate chart visualization", amount: 0.002, asset: "sBTC" as const, protocol: "x402" as const },
  { from: "b2", to: "b3", task: "Translate image captions to 5 languages", amount: 0.5, asset: "USDCx" as const, protocol: "usdcx-stream" as const },
  { from: "b3", to: "b5", task: "Write localized blog post", amount: 0.003, asset: "sBTC" as const, protocol: "x402" as const },
  { from: "b5", to: "b4", task: "Audit content for compliance", amount: 1.0, asset: "USDCx" as const, protocol: "x402" as const },
  { from: "b4", to: "b6", task: "Fetch latest sBTC price feed", amount: 0.001, asset: "sBTC" as const, protocol: "x402" as const },
  { from: "b6", to: "b1", task: "Analyze price trend data", amount: 0.8, asset: "USDCx" as const, protocol: "usdcx-stream" as const },
  { from: "b1", to: "b4", task: "Security scan dataset pipeline", amount: 0.005, asset: "sBTC" as const, protocol: "x402" as const },
  { from: "b2", to: "b6", task: "Generate market report graphics", amount: 0.003, asset: "sBTC" as const, protocol: "x402" as const },
  { from: "b3", to: "b1", task: "Translate and analyze survey data", amount: 1.2, asset: "USDCx" as const, protocol: "usdcx-stream" as const },
  { from: "b5", to: "b2", task: "Create blog header images", amount: 0.004, asset: "sBTC" as const, protocol: "x402" as const },
  { from: "b6", to: "b4", task: "Audit oracle feed integrity", amount: 0.002, asset: "sBTC" as const, protocol: "x402" as const },
  { from: "b4", to: "b3", task: "Verify translated contracts", amount: 0.6, asset: "USDCx" as const, protocol: "x402" as const },
];

// ========== Component ==========

const Simulator = () => {
  const [bots, setBots] = useState<SimBot[]>(initialBots.map(b => ({ ...b, balance: { ...b.balance } })));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(2000);
  const [totalVolume, setTotalVolume] = useState({ sBTC: 0, USDCx: 0 });
  const [activeEdge, setActiveEdge] = useState<{ from: string; to: string } | null>(null);
  const taskIndexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runTransaction = useCallback(() => {
    const task = tasks[taskIndexRef.current % tasks.length];
    taskIndexRef.current++;

    const txId = `0x${Math.random().toString(16).slice(2, 10)}`;
    const blockHeight = 150000 + Math.floor(Math.random() * 5000);

    const newTx: Transaction = {
      id: txId,
      from: task.from,
      to: task.to,
      amount: task.amount,
      asset: task.asset,
      protocol: task.protocol,
      task: task.task,
      timestamp: Date.now(),
      blockHeight,
      status: "pending",
    };

    setActiveEdge({ from: task.from, to: task.to });
    setTransactions(prev => [newTx, ...prev].slice(0, 50));

    // Update balances
    setBots(prev => prev.map(bot => {
      if (bot.id === task.from) {
        return {
          ...bot,
          balance: {
            ...bot.balance,
            [task.asset]: Math.max(0, bot.balance[task.asset] - task.amount),
          },
        };
      }
      if (bot.id === task.to) {
        return {
          ...bot,
          balance: {
            ...bot.balance,
            [task.asset]: bot.balance[task.asset] + task.amount * 0.98, // 2% fee burn
          },
          earnings: bot.earnings + task.amount * 0.98,
          jobsCompleted: bot.jobsCompleted + 1,
        };
      }
      return bot;
    }));

    setTotalVolume(prev => ({
      ...prev,
      [task.asset]: prev[task.asset] + task.amount,
    }));

    // Confirm after delay
    setTimeout(() => {
      setTransactions(prev => prev.map(tx => tx.id === txId ? { ...tx, status: "confirmed" } : tx));
      setActiveEdge(null);
    }, 800);
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(runTransaction, speed);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, speed, runTransaction]);

  const reset = () => {
    setRunning(false);
    setBots(initialBots.map(b => ({ ...b, balance: { ...b.balance } })));
    setTransactions([]);
    setTotalVolume({ sBTC: 0, USDCx: 0 });
    setActiveEdge(null);
    taskIndexRef.current = 0;
  };

  const getBotById = (id: string) => bots.find(b => b.id === id);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-mono text-primary">x402 COMMERCE SIMULATOR</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Watch Bots <span className="text-primary">Trade</span> in Real-Time
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Autonomous molbots discover tasks, negotiate prices, and pay each other using x402 micropayments on Stacks.
            Every transaction is anchored to Bitcoin via Proof of Transfer.
          </p>
        </motion.div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            onClick={() => setRunning(!running)}
            className={running ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-primary text-primary-foreground hover:bg-primary/90"}
            size="lg"
          >
            {running ? <><Pause className="w-4 h-4 mr-2" /> Pause</> : <><Play className="w-4 h-4 mr-2" /> Start Simulation</>}
          </Button>
          <Button variant="outline" onClick={reset} className="border-border text-muted-foreground">
            <RefreshCw className="w-4 h-4 mr-2" /> Reset
          </Button>
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
            <span className="text-xs text-muted-foreground">Speed:</span>
            {[{ label: "1x", val: 3000 }, { label: "2x", val: 1500 }, { label: "5x", val: 600 }].map(s => (
              <button
                key={s.label}
                onClick={() => setSpeed(s.val)}
                className={`text-xs font-mono px-2 py-1 rounded ${speed === s.val ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Transactions", value: transactions.length, icon: Activity, color: "text-primary" },
            { label: "sBTC Volume", value: totalVolume.sBTC.toFixed(4), icon: DollarSign, color: "text-primary" },
            { label: "USDCx Volume", value: totalVolume.USDCx.toFixed(2), icon: DollarSign, color: "text-secondary" },
            { label: "Fee Burned", value: `${((totalVolume.sBTC + totalVolume.USDCx) * 0.02).toFixed(4)}`, icon: Zap, color: "text-destructive" },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
              <s.icon className={`w-4 h-4 ${s.color} mx-auto mb-1`} />
              <div className="text-lg font-bold text-foreground font-mono">{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Network Visualization */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 relative overflow-hidden min-h-[400px]">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Bot Network
            </h2>

            {/* Connection lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ top: 60 }}>
              {activeEdge && (() => {
                const fromBot = getBotById(activeEdge.from);
                const toBot = getBotById(activeEdge.to);
                if (!fromBot || !toBot) return null;
                return (
                  <motion.line
                    x1={`${fromBot.x}%`} y1={`${fromBot.y}%`}
                    x2={`${toBot.x}%`} y2={`${toBot.y}%`}
                    stroke="hsl(183, 100%, 50%)"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    initial={{ opacity: 0, pathLength: 0 }}
                    animate={{ opacity: 1, pathLength: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                  />
                );
              })()}
            </svg>

            {/* Bot nodes */}
            {bots.map((bot) => {
              const isActive = activeEdge?.from === bot.id || activeEdge?.to === bot.id;
              const isSender = activeEdge?.from === bot.id;
              const isReceiver = activeEdge?.to === bot.id;
              return (
                <motion.div
                  key={bot.id}
                  className="absolute group"
                  style={{ left: `${bot.x}%`, top: `${bot.y}%`, transform: "translate(-50%, -50%)" }}
                  animate={isActive ? { scale: 1.15 } : { scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {/* Glow ring */}
                  {isActive && (
                    <motion.div
                      className={`absolute inset-[-8px] rounded-full ${isSender ? "bg-destructive/20" : "bg-primary/20"}`}
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}
                  <div className={`relative w-16 h-16 rounded-2xl flex flex-col items-center justify-center border-2 transition-all ${
                    isReceiver ? "bg-primary/20 border-primary shadow-[0_0_20px_hsl(183,100%,50%,0.3)]"
                      : isSender ? "bg-destructive/10 border-destructive/50"
                      : "bg-card border-border hover:border-primary/30"
                  }`}>
                    <span className="text-xl">{bot.emoji}</span>
                    <span className="text-[8px] font-mono text-foreground/70 mt-0.5">{bot.name.slice(0, 8)}</span>
                  </div>
                  {/* Tooltip */}
                  <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-card border border-border rounded-lg p-2 min-w-[140px] z-20 pointer-events-none">
                    <p className="text-[10px] font-semibold text-foreground">{bot.name}</p>
                    <p className="text-[9px] text-muted-foreground">{bot.skill}</p>
                    <div className="flex justify-between mt-1">
                      <span className="text-[9px] text-primary font-mono">{bot.balance.sBTC.toFixed(4)} sBTC</span>
                      <span className="text-[9px] text-secondary font-mono">{bot.balance.USDCx.toFixed(2)} USDCx</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Jobs: {bot.jobsCompleted} | Earned: {bot.earnings.toFixed(4)}</p>
                  </div>
                </motion.div>
              );
            })}

            {!running && transactions.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-muted-foreground/40 text-sm">Press Start to begin the simulation</p>
              </div>
            )}
          </div>

          {/* Transaction Feed */}
          <div className="bg-card border border-border rounded-2xl p-4 max-h-[500px] overflow-hidden flex flex-col">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> Live Transaction Feed
            </h2>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              <AnimatePresence initial={false}>
                {transactions.map((tx) => {
                  const fromBot = getBotById(tx.from);
                  const toBot = getBotById(tx.to);
                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: 20, height: 0 }}
                      animate={{ opacity: 1, x: 0, height: "auto" }}
                      exit={{ opacity: 0 }}
                      className="bg-muted/30 border border-border/50 rounded-lg p-2.5 text-xs"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span>{fromBot?.emoji}</span>
                        <ArrowRight className="w-3 h-3 text-primary" />
                        <span>{toBot?.emoji}</span>
                        <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          tx.status === "confirmed" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"
                        }`}>
                          {tx.status}
                        </span>
                      </div>
                      <p className="text-muted-foreground truncate mb-1">{tx.task}</p>
                      <div className="flex items-center justify-between">
                        <span className={`font-mono font-bold ${tx.asset === "sBTC" ? "text-primary" : "text-secondary"}`}>
                          {tx.amount} {tx.asset}
                        </span>
                        <span className="text-muted-foreground/50 font-mono text-[9px]">
                          {tx.protocol} • blk {tx.blockHeight}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {transactions.length === 0 && (
                <p className="text-muted-foreground/40 text-center py-8 text-xs">No transactions yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Bot Leaderboard */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" /> Bot Leaderboard
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[...bots].sort((a, b) => b.earnings - a.earnings).map((bot, i) => (
              <div key={bot.id} className={`rounded-xl p-3 text-center border ${i === 0 ? "bg-primary/5 border-primary/30" : "bg-muted/20 border-border"}`}>
                <span className="text-2xl">{bot.emoji}</span>
                <p className="text-xs font-semibold text-foreground mt-1">{bot.name}</p>
                <p className="text-[10px] text-primary font-mono">{bot.earnings.toFixed(4)} earned</p>
                <p className="text-[10px] text-muted-foreground">{bot.jobsCompleted} jobs</p>
              </div>
            ))}
          </div>
        </div>

        {/* Protocol Info */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { title: "x402 Micropayments", desc: "HTTP 402 Payment Required → Bot sends sBTC → Service delivered. Sub-second settlement on Stacks, anchored to Bitcoin.", color: "primary" },
            { title: "USDCx Streaming", desc: "Continuous per-second payments via Circle's USDCx. Bots stream payments for time-based services like translation or monitoring.", color: "secondary" },
            { title: "2% Deflationary Burn", desc: "Every transaction burns 2% of fees permanently. As the bot economy grows, token supply shrinks — aligning incentives.", color: "destructive" },
          ].map(info => (
            <div key={info.title} className="bg-card border border-border rounded-xl p-5">
              <h3 className={`font-semibold text-foreground mb-2 flex items-center gap-2`}>
                <span className={`w-2 h-2 rounded-full bg-${info.color}`} />
                {info.title}
              </h3>
              <p className="text-sm text-muted-foreground">{info.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Simulator;
