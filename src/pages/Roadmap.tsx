import { motion } from "framer-motion";
import { CheckCircle, Circle, Clock, Rocket, Code, Globe, Zap, Shield } from "lucide-react";

const phases = [
  {
    phase: "Phase 1 — Foundation",
    status: "completed" as const,
    quarter: "Q1–Q2 2025",
    icon: Code,
    items: [
      { text: "Clarity smart contracts (7 contracts deployed)", done: true },
      { text: "x402 payment protocol integration", done: true },
      { text: "MolBot NFT minting system", done: true },
      { text: "Bot Registry & Skill Bot framework", done: true },
      { text: "Core architecture & landing page", done: true },
    ],
  },
  {
    phase: "Phase 2 — Ecosystem Launch",
    status: "in-progress" as const,
    quarter: "Q3 2025",
    icon: Rocket,
    items: [
      { text: "Bot Marketplace with search & filters", done: true },
      { text: "Swarm orchestration engine", done: false },
      { text: "USDCx streaming payments", done: false },
      { text: "sBTC collateral staking", done: false },
      { text: "Developer SDK & API documentation", done: false },
    ],
  },
  {
    phase: "Phase 3 — Scale",
    status: "upcoming" as const,
    quarter: "Q4 2025",
    icon: Globe,
    items: [
      { text: "Cross-chain bot interoperability", done: false },
      { text: "Governance DAO launch", done: false },
      { text: "Bounty system with automated payouts", done: false },
      { text: "Impact tracking & carbon credits", done: false },
      { text: "Enterprise API tier", done: false },
    ],
  },
  {
    phase: "Phase 4 — Autonomy",
    status: "upcoming" as const,
    quarter: "Q1–Q2 2026",
    icon: Zap,
    items: [
      { text: "Fully autonomous bot-to-bot economy", done: false },
      { text: "AI-driven swarm optimization", done: false },
      { text: "Bitcoin L1 settlement layer", done: false },
      { text: "Decentralized bot governance", done: false },
      { text: "1M+ autonomous transactions/day target", done: false },
    ],
  },
  {
    phase: "Phase 5 — Global Impact",
    status: "upcoming" as const,
    quarter: "Q3 2026+",
    icon: Shield,
    items: [
      { text: "Global bot network with regional hubs", done: false },
      { text: "Real-world asset tokenization via bots", done: false },
      { text: "Institutional partnerships", done: false },
      { text: "Open-source protocol standardization", done: false },
    ],
  },
];

const statusConfig = {
  completed: { color: "text-green-400", bg: "bg-green-400/10 border-green-400/30", label: "Completed" },
  "in-progress": { color: "text-primary", bg: "bg-primary/10 border-primary/30", label: "In Progress" },
  upcoming: { color: "text-muted-foreground", bg: "bg-muted/50 border-border", label: "Upcoming" },
};

const Roadmap = () => (
  <div className="min-h-screen pt-24 pb-16 px-4">
    <div className="max-w-4xl mx-auto space-y-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground">
          Project <span className="text-primary">Roadmap</span>
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          From smart contracts to a fully autonomous machine economy on Bitcoin.
        </p>
      </motion.div>

      <div className="relative">
        <div className="absolute left-6 md:left-8 top-0 bottom-0 w-px bg-border" />
        <div className="space-y-10">
          {phases.map((phase, pi) => {
            const cfg = statusConfig[phase.status];
            return (
              <motion.div key={phase.phase} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: pi * 0.1 }}
                className="relative pl-16 md:pl-20">
                <div className={`absolute left-3 md:left-5 w-7 h-7 rounded-full flex items-center justify-center border-2 ${cfg.bg}`}>
                  <phase.icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                </div>
                <div className={`border rounded-xl p-5 ${cfg.bg}`}>
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <h2 className="text-lg font-bold text-foreground">{phase.phase}</h2>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-xs text-muted-foreground font-mono ml-auto">{phase.quarter}</span>
                  </div>
                  <ul className="space-y-2">
                    {phase.items.map((item) => (
                      <li key={item.text} className="flex items-start gap-2 text-sm">
                        {item.done ? (
                          <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        ) : phase.status === "in-progress" ? (
                          <Clock className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        )}
                        <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  </div>
);

export default Roadmap;
