import { motion } from "framer-motion";
import { useState } from "react";
import {
  Blocks, Zap, DollarSign, Shield, Link2, Activity,
  Layers, Key, Globe, ArrowRight, Bot, Users, Sparkles,
  GitBranch, Lock, Database, Server, Wallet, Code
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

/* ── Architecture Layers ─────────────────────────────────── */

interface ArchNode {
  id: string;
  label: string;
  icon: LucideIcon;
  desc: string;
  color: "primary" | "secondary";
  layer: "app" | "protocol" | "chain" | "bitcoin";
  tech: string[];
}

const nodes: ArchNode[] = [
  { id: "bot-builder", label: "Visual Bot Builder", icon: Blocks, desc: "Drag & drop skill assignment, price config, no-code rules engine", color: "primary", layer: "app", tech: ["React", "stacks.js"] },
  { id: "marketplace", label: "Bot Marketplace", icon: Globe, desc: "Discovery, search, hire — with real-time x402 payments", color: "secondary", layer: "app", tech: ["React", "Supabase"] },
  { id: "nft-gallery", label: "Molbot NFTs", icon: Sparkles, desc: "SIP-009 compliant NFTs for bot provenance and ownership", color: "primary", layer: "app", tech: ["SIP-009", "Clarity"] },
  { id: "swarm-ui", label: "Swarm Manager", icon: Users, desc: "Form, join, and hire autonomous bot swarms", color: "secondary", layer: "app", tech: ["React", "Edge Functions"] },
  { id: "dao", label: "DAO Governance", icon: Shield, desc: "Token-weighted voting, treasury management, parameter changes", color: "primary", layer: "app", tech: ["Clarity", "$AGENT"] },

  { id: "x402", label: "x402 Protocol", icon: Zap, desc: "HTTP-native micropayment protocol for machine-to-machine commerce", color: "primary", layer: "protocol", tech: ["x402", "sBTC"] },
  { id: "usdcx", label: "USDCx Streaming", icon: DollarSign, desc: "Per-second stablecoin streams via Circle xReserve", color: "secondary", layer: "protocol", tech: ["USDCx", "Circle"] },
  { id: "bitflow", label: "Bitflow DeFi", icon: Layers, desc: "Liquidity pools and HODLMM positions for bot earnings", color: "primary", layer: "protocol", tech: ["Bitflow", "HODLMM"] },
  { id: "chainhooks", label: "Chainhooks", icon: Activity, desc: "Real-time blockchain event webhooks for instant UI updates", color: "secondary", layer: "protocol", tech: ["Chainhooks", "WebSocket"] },

  { id: "bot-registry", label: "Bot Registry", icon: Database, desc: "On-chain bot metadata, ownership, skills, pricing", color: "primary", layer: "chain", tech: ["Clarity", "define-map"] },
  { id: "payment-router", label: "Payment Router", icon: Wallet, desc: "SIP-010 token transfers with x402 event logging", color: "secondary", layer: "chain", tech: ["Clarity", "SIP-010"] },
  { id: "swarm-contract", label: "Bot Swarm", icon: Users, desc: "Multi-party coordination with bonding and revenue splits", color: "primary", layer: "chain", tech: ["Clarity", "PoX"] },
  { id: "nft-contract", label: "Molbot NFT", icon: Key, desc: "SIP-009 minting, burning, metadata with fee collection", color: "secondary", layer: "chain", tech: ["Clarity", "SIP-009"] },
  { id: "clarity4", label: "Clarity 4", icon: Lock, desc: "Post-conditions, passkey auth (secp256r1), block-time", color: "primary", layer: "chain", tech: ["Clarity 4", "Passkeys"] },

  { id: "pox", label: "Proof of Transfer", icon: Shield, desc: "Bitcoin-anchored consensus — every tx settles on BTC", color: "primary", layer: "bitcoin", tech: ["PoX", "Bitcoin"] },
  { id: "sbtc", label: "sBTC", icon: Zap, desc: "Trust-minimized 1:1 Bitcoin peg for the Stacks economy", color: "secondary", layer: "bitcoin", tech: ["sBTC", "Threshold"] },
];

const layers = [
  { id: "app", label: "Application Layer", sublabel: "React + stacks.js", color: "primary" },
  { id: "protocol", label: "Protocol Layer", sublabel: "x402 · USDCx · Bitflow · Chainhooks", color: "secondary" },
  { id: "chain", label: "Smart Contract Layer", sublabel: "Clarity on Stacks", color: "primary" },
  { id: "bitcoin", label: "Settlement Layer", sublabel: "Bitcoin via Proof of Transfer", color: "secondary" },
];

/* ── Data Flow Connections ─────────────────────────────────── */

const flows = [
  { from: "User", action: "Creates bot", via: "bot-builder → bot-registry", protocol: "stacks.js + Clarity" },
  { from: "Bot A", action: "Hires Bot B", via: "marketplace → payment-router", protocol: "x402 + sBTC" },
  { from: "Bot A", action: "Streams to Bot B", via: "marketplace → usdcx-stream", protocol: "USDCx + Circle" },
  { from: "Swarm", action: "Splits payment", via: "swarm-contract → payment-router", protocol: "Clarity + x402" },
  { from: "User", action: "Mints NFT", via: "nft-gallery → nft-contract", protocol: "SIP-009 + sBTC" },
  { from: "DAO", action: "Executes proposal", via: "dao → treasury", protocol: "Clarity + $AGENT" },
  { from: "Bot", action: "Deposits to pool", via: "bitflow → HODLMM", protocol: "Bitflow DeFi" },
  { from: "Chain", action: "Notifies frontend", via: "chainhooks → webhook", protocol: "HTTP + WebSocket" },
];

/* ── Security Features ─────────────────────────────────────── */

const securityFeatures = [
  { title: "Input Validation", desc: "Zod schemas on client + server, Clarity type safety on-chain" },
  { title: "Rate Limiting", desc: "30 req/min per user with sliding window" },
  { title: "Idempotency Keys", desc: "Prevent duplicate payments on retries" },
  { title: "Non-Custodial", desc: "Users always own their keys — no private key storage" },
  { title: "RLS Policies", desc: "Row-level security on all database tables" },
  { title: "CORS + Auth", desc: "JWT validation on all edge functions" },
];

const Architecture = () => {
  const [selectedNode, setSelectedNode] = useState<ArchNode | null>(null);

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <Badge className="bg-primary/10 text-primary border-primary/30 mb-4 text-sm">
            <Code className="w-3.5 h-3.5 mr-1.5" /> Technical Deep Dive
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4 leading-tight">
            System <span className="text-gradient-hero">Architecture</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A full-stack architecture leveraging every layer of the Stacks ecosystem — from
            Clarity smart contracts to Bitcoin settlement via Proof of Transfer.
          </p>
        </motion.div>

        {/* Layered Architecture Diagram */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Layered Architecture</h2>
          <div className="space-y-3">
            {layers.map((layer, li) => {
              const layerNodes = nodes.filter(n => n.layer === layer.id);
              return (
                <motion.div
                  key={layer.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: li * 0.1 }}
                  className="gradient-border-card rounded-xl p-5"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                      layer.color === "primary" ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"
                    }`}>
                      L{li + 1}
                    </span>
                    <h3 className="text-lg font-semibold text-foreground">{layer.label}</h3>
                    <span className="text-xs text-muted-foreground">{layer.sublabel}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                    {layerNodes.map((node) => (
                      <button
                        key={node.id}
                        onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)}
                        className={`text-left p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                          selectedNode?.id === node.id
                            ? "border-primary bg-primary/10 shadow-lg shadow-primary/5"
                            : "border-border/30 bg-muted/10 hover:border-primary/30 hover:bg-muted/20"
                        }`}
                      >
                        <node.icon className={`w-4 h-4 mb-1.5 ${
                          node.color === "primary" ? "text-primary" : "text-secondary"
                        }`} />
                        <p className="text-xs font-semibold text-foreground leading-tight">{node.label}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {node.tech.map((t) => (
                            <span key={t} className="text-[9px] font-mono text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
                              {t}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Layer connection arrows */}
          <div className="flex justify-center my-2">
            <div className="flex flex-col items-center gap-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-2 text-muted-foreground/40">
                  <div className="w-px h-6 bg-gradient-to-b from-primary/30 to-secondary/30" />
                </div>
              ))}
              <span className="text-[10px] font-mono text-muted-foreground/50">
                ↕ All layers connected via PoX finality
              </span>
            </div>
          </div>
        </motion.div>

        {/* Selected Node Detail */}
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-xl p-6 mb-12"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                selectedNode.color === "primary" ? "bg-primary/10" : "bg-secondary/10"
              }`}>
                <selectedNode.icon className={`w-5 h-5 ${
                  selectedNode.color === "primary" ? "text-primary" : "text-secondary"
                }`} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">{selectedNode.label}</h3>
                <p className="text-xs text-muted-foreground capitalize">{selectedNode.layer} layer</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{selectedNode.desc}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {selectedNode.tech.map((t) => (
                <Badge key={t} variant="outline" className="text-xs text-primary border-primary/20">{t}</Badge>
              ))}
            </div>
          </motion.div>
        )}

        {/* Data Flow Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-2 text-center">
            <Activity className="inline w-6 h-6 mr-2 text-primary" />
            Data Flow Map
          </h2>
          <p className="text-muted-foreground text-center mb-6 text-sm">How data moves through the system</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse max-w-4xl mx-auto">
              <thead>
                <tr className="border-b border-border/50">
                  {["Actor", "Action", "Flow", "Protocol"].map((h) => (
                    <th key={h} className="text-left py-3 px-3 text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {flows.map((flow, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-3 px-3 font-semibold text-primary text-xs">{flow.from}</td>
                    <td className="py-3 px-3 text-foreground">{flow.action}</td>
                    <td className="py-3 px-3 font-mono text-xs text-muted-foreground">{flow.via}</td>
                    <td className="py-3 px-3">
                      <Badge variant="outline" className="text-[10px] text-secondary border-secondary/20">{flow.protocol}</Badge>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Security */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-2 text-center">
            <Lock className="inline w-6 h-6 mr-2 text-primary" />
            Security Architecture
          </h2>
          <p className="text-muted-foreground text-center mb-6 text-sm">Defense in depth across all layers</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl mx-auto">
            {securityFeatures.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="badge-glow rounded-xl p-4 cursor-default"
              >
                <h3 className="text-sm font-semibold text-foreground mb-1">{f.title}</h3>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Tech Stack Summary */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            <Server className="inline w-6 h-6 mr-2 text-secondary" />
            Full Technology Stack
          </h2>
          <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {[
              { category: "Frontend", items: ["React 18", "TypeScript", "Vite", "Tailwind CSS", "Framer Motion", "stacks.js"] },
              { category: "Backend", items: ["Supabase Edge Functions", "Deno", "PostgreSQL", "Row-Level Security"] },
              { category: "Blockchain", items: ["Clarity Smart Contracts", "sBTC (SIP-010)", "USDCx Streams", "SIP-009 NFTs", "SIP-019 Metadata"] },
              { category: "Stacks Ecosystem", items: ["x402 Protocol", "Bitflow DeFi", "Chainhooks", "Proof of Transfer", "Clarity 4 + Passkeys"] },
            ].map((stack) => (
              <div key={stack.category} className="gradient-border-card rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">{stack.category}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {stack.items.map((item) => (
                    <span key={item} className="text-xs font-mono px-2.5 py-1 rounded-md bg-primary/8 text-primary border border-primary/10">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center">
          <Link to="/docs" className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors">
            Explore the full documentation <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default Architecture;
