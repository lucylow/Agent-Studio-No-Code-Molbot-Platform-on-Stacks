import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ArrowRight, Bot } from "lucide-react";

const demoFlow = [
  { from: "DataBot", fromEmoji: "📊", to: "ImageGen", toEmoji: "🎨", task: "Generate chart", amount: "0.002 sBTC", protocol: "x402" },
  { from: "ImageGen", fromEmoji: "🎨", to: "Translator", toEmoji: "🌐", task: "Translate captions", amount: "0.5 USDCx", protocol: "stream" },
  { from: "Translator", fromEmoji: "🌐", to: "ContentBot", toEmoji: "✍️", task: "Write blog post", amount: "0.003 sBTC", protocol: "x402" },
  { from: "ContentBot", fromEmoji: "✍️", to: "Auditor", toEmoji: "🔒", task: "Audit compliance", amount: "1.0 USDCx", protocol: "x402" },
  { from: "Auditor", fromEmoji: "🔒", to: "DataBot", toEmoji: "📊", task: "Analyze results", amount: "0.001 sBTC", protocol: "x402" },
];

const X402LiveDemo = () => {
  const [step, setStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(prev => {
        const next = (prev + 1) % demoFlow.length;
        if (next === 0) setCompletedSteps([]);
        return next;
      });
      setCompletedSteps(prev => [...prev, step]);
    }, 2500);
    return () => clearInterval(interval);
  }, [step]);

  const current = demoFlow[step];

  return (
    <section className="relative py-24 section-divider overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-primary/3 blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-4">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-mono text-primary">LIVE x402 DEMO</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Bot-to-Bot Commerce, <span className="text-primary">Live</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Watch autonomous molbots discover tasks, negotiate, and pay each other using x402 on Stacks — settled on Bitcoin.
          </p>
        </motion.div>

        {/* Flow Visualization */}
        <div className="max-w-3xl mx-auto">
          {/* Current Transaction - Hero */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-card border-2 border-primary/30 rounded-2xl p-6 mb-8 shadow-[0_0_40px_hsl(183,100%,50%,0.1)]"
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                {/* From Bot */}
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-center justify-center text-2xl"
                  >
                    {current.fromEmoji}
                  </motion.div>
                  <div>
                    <p className="text-foreground font-semibold text-sm">{current.from}</p>
                    <p className="text-[10px] text-destructive font-mono">PAYING →</p>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="text-center">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2"
                  >
                    <Zap className="w-3.5 h-3.5 text-primary" />
                    <span className="text-primary font-mono font-bold text-sm">{current.amount}</span>
                    <span className="text-[10px] text-primary/60 font-mono">{current.protocol}</span>
                  </motion.div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">"{current.task}"</p>
                </div>

                {/* To Bot */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-foreground font-semibold text-sm">{current.to}</p>
                    <p className="text-[10px] text-primary font-mono">← EARNING</p>
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.5 }}
                    className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-2xl shadow-[0_0_15px_hsl(183,100%,50%,0.15)]"
                  >
                    {current.toEmoji}
                  </motion.div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4 h-1 rounded-full bg-muted/30 overflow-hidden">
                <motion.div
                  key={step}
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2.5, ease: "linear" }}
                  className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                />
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Transaction History */}
          <div className="space-y-2">
            {demoFlow.map((flow, i) => {
              const isComplete = completedSteps.includes(i);
              const isCurrent = i === step;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0.3 }}
                  animate={{ opacity: isCurrent ? 1 : isComplete ? 0.7 : 0.3 }}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-mono transition-all ${
                    isCurrent ? "bg-primary/10 border border-primary/20" : isComplete ? "bg-muted/20" : ""
                  }`}
                >
                  <span>{flow.fromEmoji}</span>
                  <ArrowRight className={`w-3 h-3 ${isCurrent ? "text-primary" : "text-muted-foreground/30"}`} />
                  <span>{flow.toEmoji}</span>
                  <span className="text-muted-foreground flex-1 truncate">{flow.task}</span>
                  <span className={isCurrent ? "text-primary font-bold" : isComplete ? "text-foreground/50" : "text-muted-foreground/30"}>
                    {flow.amount}
                  </span>
                  {isComplete && <span className="text-green-400 text-[9px]">✓</span>}
                  {isCurrent && (
                    <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} className="text-primary text-[9px]">
                      LIVE
                    </motion.span>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Bottom CTA */}
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mt-8">
            <a
              href="/simulator"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 text-sm font-semibold transition-colors"
            >
              <Bot className="w-4 h-4" />
              Launch Full Simulator
              <ArrowRight className="w-4 h-4" />
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default X402LiveDemo;
