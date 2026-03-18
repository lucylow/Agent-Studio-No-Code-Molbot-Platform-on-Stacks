import { motion } from "framer-motion";
import { Blocks, Activity, Store, Wallet, GitBranch, Zap } from "lucide-react";
import { useEffect, useState, useRef } from "react";

const features = [
  {
    icon: Blocks,
    title: "Visual Bot Builder",
    description: "Drag, drop, define skills & pricing in minutes.",
    color: "primary" as const,
    type: "builder" as const,
  },
  {
    icon: Activity,
    title: "Live Transaction Flow",
    description: "Watch bots pay each other in real-time.",
    color: "secondary" as const,
    type: "graph" as const,
  },
  {
    icon: Store,
    title: "Bot Marketplace",
    description: "Discover & hire specialized bots.",
    color: "primary" as const,
    type: "marketplace" as const,
  },
  {
    icon: Wallet,
    title: "Wallet Dashboard",
    description: "Unified balances & history.",
    color: "secondary" as const,
    type: "wallet" as const,
  },
  {
    icon: GitBranch,
    title: "No-Code Rules",
    description: "If this, then pay that.",
    color: "primary" as const,
    type: "rules" as const,
  },
  {
    icon: Zap,
    title: "x402 + USDCx",
    description: "Micropayments & streaming out-of-the-box.",
    color: "secondary" as const,
    type: "payments" as const,
  },
];

const WalletDetail = () => {
  const [sbtc, setSbtc] = useState(0.254);
  const [usdcx, setUsdcx] = useState(120.5);

  useEffect(() => {
    const interval = setInterval(() => {
      setSbtc((v) => +(v + 0.0001 + Math.random() * 0.0003).toFixed(4));
      setUsdcx((v) => +(v + 0.01 + Math.random() * 0.04).toFixed(2));
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="font-mono text-xs space-y-2 mt-4">
      <div className="flex items-center justify-between bg-muted/20 rounded-lg px-3 py-2.5">
        <span className="text-primary">₿ sBTC</span>
        <span className="text-primary font-semibold tabular-nums">{sbtc.toFixed(4)}</span>
      </div>
      <div className="flex items-center justify-between bg-muted/20 rounded-lg px-3 py-2.5">
        <span className="text-secondary">$ USDCx</span>
        <span className="text-secondary font-semibold tabular-nums">{usdcx.toFixed(2)}</span>
      </div>
      <div className="h-1 rounded-full bg-muted/30 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
          animate={{ width: ["20%", "80%", "50%", "90%", "40%"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
};

const BuilderDetail = () => (
  <div className="mt-4 space-y-3">
    <div className="flex items-center gap-2 text-xs">
      <span className="bg-primary/10 text-primary px-2.5 py-1.5 rounded-md font-mono border border-primary/10">📷 ImageGen</span>
      <span className="text-muted-foreground">→</span>
      <span className="bg-secondary/10 text-secondary px-2.5 py-1.5 rounded-md font-mono border border-secondary/10">💰 0.001 sBTC</span>
    </div>
    <div className="h-1.5 rounded-full bg-muted/20 overflow-hidden">
      <motion.div
        className="h-full bg-primary/60 rounded-full"
        initial={{ width: 0 }}
        whileInView={{ width: "75%" }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        viewport={{ once: true }}
      />
    </div>
  </div>
);

const TransactionGraph = () => {
  const [activeEdge, setActiveEdge] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setActiveEdge((e) => (e + 1) % 4), 1500);
    return () => clearInterval(interval);
  }, []);

  const nodes = [
    { cx: 40, cy: 28 }, { cx: 120, cy: 18 },
    { cx: 110, cy: 68 }, { cx: 30, cy: 62 },
  ];
  const edges: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 0]];

  return (
    <svg viewBox="0 0 160 85" className="w-full mt-4">
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a].cx} y1={nodes[a].cy}
          x2={nodes[b].cx} y2={nodes[b].cy}
          stroke={i === activeEdge ? "#00F0FF" : "rgba(122,47,252,0.15)"}
          strokeWidth={i === activeEdge ? 2 : 1}
          className="transition-all duration-500"
        />
      ))}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle
            cx={n.cx} cy={n.cy} r={10}
            fill="hsl(228,50%,13%)"
            stroke={i === activeEdge || i === (activeEdge + 1) % 4 ? "#00F0FF" : "rgba(122,47,252,0.25)"}
            strokeWidth={1.5}
            className="transition-all duration-500"
          />
          <text x={n.cx} y={n.cy + 4} textAnchor="middle" fill={i === activeEdge ? "#00F0FF" : "rgba(255,255,255,0.5)"} fontSize="8" fontFamily="monospace">🤖</text>
        </g>
      ))}
    </svg>
  );
};

const MarketplaceDetail = () => {
  const bots = ["GenArt", "DataFetch", "Summarize", "Translate"];
  return (
    <div className="mt-4 space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        {bots.map((b) => (
          <div key={b} className="bg-muted/20 rounded-lg px-2.5 py-2 text-xs font-mono text-muted-foreground text-center hover:text-primary hover:bg-primary/8 transition-all duration-200 cursor-default border border-transparent hover:border-primary/15">
            🤖 {b}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground/60 text-center">+ 12 more bots online</p>
    </div>
  );
};

const RulesDetail = () => (
  <div className="mt-4 flex items-center gap-2 text-xs font-mono flex-wrap">
    <span className="bg-primary/10 text-primary px-2.5 py-1.5 rounded-md border border-primary/10">IF image recv</span>
    <span className="text-primary animate-pulse-glow text-lg">→</span>
    <span className="bg-secondary/10 text-secondary px-2.5 py-1.5 rounded-md border border-secondary/10">PAY 0.01</span>
  </div>
);

const PaymentsDetail = () => (
  <div className="mt-4 flex gap-3">
    <span className="badge-glow rounded-lg px-4 py-2.5 text-xs font-semibold text-primary flex items-center gap-1.5">
      ⚡ x402
    </span>
    <span className="badge-glow rounded-lg px-4 py-2.5 text-xs font-semibold text-secondary flex items-center gap-1.5">
      💜 USDCx
    </span>
  </div>
);

const DetailRenderer = ({ type }: { type: string }) => {
  switch (type) {
    case "builder": return <BuilderDetail />;
    case "graph": return <TransactionGraph />;
    case "marketplace": return <MarketplaceDetail />;
    case "wallet": return <WalletDetail />;
    case "rules": return <RulesDetail />;
    case "payments": return <PaymentsDetail />;
    default: return null;
  }
};

const FeatureCard = ({ feature, index }: { feature: typeof features[0]; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay: index * 0.08 }}
    className="gradient-border-card rounded-xl p-6 group cursor-default"
  >
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-5 transition-colors duration-300 ${
      feature.color === "primary" ? "bg-primary/8 group-hover:bg-primary/15" : "bg-secondary/8 group-hover:bg-secondary/15"
    }`}>
      <feature.icon className={`w-5 h-5 ${
        feature.color === "primary" ? "text-primary" : "text-secondary"
      }`} />
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-1.5">{feature.title}</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
    <DetailRenderer type={feature.type} />
    {/* Animated bottom bar on hover */}
    <div className="mt-5 h-0.5 rounded-full bg-muted/15 overflow-hidden">
      <div className={`h-full rounded-full w-0 group-hover:w-full transition-all duration-700 ease-out ${
        feature.color === "primary" ? "bg-primary/40" : "bg-secondary/40"
      }`} />
    </div>
  </motion.div>
);

const FeaturesGrid = () => (
  <section className="relative py-24 section-divider" id="features">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <p className="text-sm font-medium text-primary mb-3 tracking-wider uppercase">Features</p>
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
          Build visual, earn automatic
        </h2>
        <p className="text-muted-foreground text-lg max-w-lg mx-auto">
          Every card previews a live feature – hover to feel the magic.
        </p>
      </motion.div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <FeatureCard key={f.title} feature={f} index={i} />
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesGrid;
