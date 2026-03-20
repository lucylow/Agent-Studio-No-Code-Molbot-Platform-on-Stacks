import { motion } from "framer-motion";
import { useState } from "react";
import {
  Zap, DollarSign, Shield, Layers, Activity, Key, GitBranch, Globe,
  ArrowRight, Check
} from "lucide-react";
import { Link } from "react-router-dom";

interface StacksTech {
  id: string;
  icon: any;
  name: string;
  tagline: string;
  detail: string;
  usage: string;
  color: "primary" | "secondary";
}

const stacksTech: StacksTech[] = [
  {
    id: "clarity",
    icon: GitBranch,
    name: "Clarity",
    tagline: "Decidable smart contracts",
    detail: "7 production contracts: bot-registry, payment-router, fee-collector, bot-swarm, molbot-nft, usdcx-stream, referral-system.",
    usage: "All on-chain logic — bot creation, payments, swarms, NFTs, governance",
    color: "primary",
  },
  {
    id: "sbtc",
    icon: Zap,
    name: "sBTC",
    tagline: "Trust-minimized Bitcoin peg",
    detail: "Every bot-to-bot payment flows through sBTC — the 1:1 Bitcoin peg on Stacks — enabling true Bitcoin-native machine commerce.",
    usage: "Bot hiring, swarm bonding, NFT minting, DAO treasury",
    color: "primary",
  },
  {
    id: "x402",
    icon: Globe,
    name: "x402 Protocol",
    tagline: "HTTP-native micropayments",
    detail: "The x402 protocol enables bots to pay each other natively via HTTP headers — no separate payment gateway needed.",
    usage: "All fixed-price bot-to-bot transactions",
    color: "secondary",
  },
  {
    id: "usdcx",
    icon: DollarSign,
    name: "USDCx / Circle xReserve",
    tagline: "Institutional stablecoin streaming",
    detail: "Per-second USDCx streams for time-based services — built on Circle's xReserve infrastructure for institutional-grade stability.",
    usage: "Streaming payments, continuous services, subscriptions",
    color: "secondary",
  },
  {
    id: "pox",
    icon: Shield,
    name: "Proof of Transfer",
    tagline: "Bitcoin-anchored finality",
    detail: "Every Molbot Studio transaction ultimately settles on Bitcoin L1 via PoX consensus — inheriting Bitcoin's security model.",
    usage: "Transaction finality, payment verification, security proofs",
    color: "primary",
  },
  {
    id: "bitflow",
    icon: Layers,
    name: "Bitflow Protocol",
    tagline: "DeFi yield for bot earnings",
    detail: "Bots can automatically deposit idle earnings into Bitflow liquidity pools and HODLMM concentrated positions.",
    usage: "Yield optimization, liquidity provision, HODLMM positions",
    color: "secondary",
  },
  {
    id: "chainhooks",
    icon: Activity,
    name: "Chainhooks",
    tagline: "Real-time blockchain events",
    detail: "Chainhook predicates watch for payment events, job completions, and swarm activities — pushing instant updates to the frontend.",
    usage: "Live transaction feeds, payment notifications, dashboard updates",
    color: "primary",
  },
  {
    id: "clarity4",
    icon: Key,
    name: "Clarity 4 + Passkeys",
    tagline: "Next-gen auth & verification",
    detail: "Native secp256r1 support enables mobile-friendly passkey authentication. Enhanced post-conditions for safer transactions.",
    usage: "Passwordless login, mobile wallet, transaction safety",
    color: "secondary",
  },
];

const StacksShowcase = () => {
  const [activeTech, setActiveTech] = useState<StacksTech>(stacksTech[0]);

  return (
    <section className="relative py-24 section-divider" id="stacks-tech">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p className="text-sm font-medium text-secondary mb-3 tracking-wider uppercase">Deep Integration</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Built on <span className="text-gradient-hero">every layer</span> of Stacks
          </h2>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto">
            8 Stacks technologies. 7 Clarity contracts. One unified platform.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-[320px_1fr] gap-6 max-w-5xl mx-auto">
          {/* Tech list */}
          <div className="space-y-1.5">
            {stacksTech.map((tech, i) => (
              <motion.button
                key={tech.id}
                initial={{ opacity: 0, x: -15 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setActiveTech(tech)}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                  activeTech.id === tech.id
                    ? "bg-primary/10 border border-primary/25 shadow-lg shadow-primary/5"
                    : "hover:bg-muted/20 border border-transparent"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  tech.color === "primary" ? "bg-primary/10" : "bg-secondary/10"
                }`}>
                  <tech.icon className={`w-4 h-4 ${
                    tech.color === "primary" ? "text-primary" : "text-secondary"
                  }`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{tech.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{tech.tagline}</p>
                </div>
                {activeTech.id === tech.id && (
                  <Check className="w-4 h-4 text-primary ml-auto flex-shrink-0" />
                )}
              </motion.button>
            ))}
          </div>

          {/* Detail panel */}
          <motion.div
            key={activeTech.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="gradient-border-card rounded-2xl p-8"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                activeTech.color === "primary" ? "bg-primary/15" : "bg-secondary/15"
              }`}>
                <activeTech.icon className={`w-6 h-6 ${
                  activeTech.color === "primary" ? "text-primary" : "text-secondary"
                }`} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground">{activeTech.name}</h3>
                <p className="text-sm text-muted-foreground">{activeTech.tagline}</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed mb-6">{activeTech.detail}</p>

            <div className="bg-muted/10 rounded-xl p-4 border border-border/30">
              <p className="text-[11px] font-medium text-primary mb-1.5 uppercase tracking-wider">How we use it</p>
              <p className="text-sm text-foreground/80">{activeTech.usage}</p>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <Link
                to="/docs"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                View implementation <ArrowRight className="w-3 h-3" />
              </Link>
              <Link
                to="/architecture"
                className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-secondary/80 transition-colors"
              >
                Architecture diagram <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default StacksShowcase;
