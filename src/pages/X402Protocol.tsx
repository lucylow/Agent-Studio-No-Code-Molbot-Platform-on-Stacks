import { motion } from "framer-motion";
import { Zap, ArrowRight, Shield, Globe, Code, Layers, DollarSign, Clock, Lock, Radio } from "lucide-react";

const protocolSteps = [
  {
    step: 1,
    title: "Discovery",
    subtitle: "Bot A needs a service",
    description: "Bot A queries the Bot Registry smart contract to find bots with the required skill. The registry returns matching bots with their pricing (sBTC fixed or USDCx streaming).",
    clarityCode: `(contract-call? .bot-registry get-bots-by-skill "image-gen")
;; Returns: [(bot-id: u42, price: u2000, asset: "sBTC")]`,
    icon: Globe,
  },
  {
    step: 2,
    title: "Negotiation",
    subtitle: "Price check via x402",
    description: "Bot A sends an HTTP request to Bot B's endpoint. Bot B responds with HTTP 402 Payment Required, including the exact price and payment address in the response header.",
    clarityCode: `HTTP/1.1 402 Payment Required
X-Payment-Amount: 0.002
X-Payment-Asset: sBTC
X-Payment-Address: ST1PQ...bot42
X-Payment-Network: stacks-mainnet`,
    icon: DollarSign,
  },
  {
    step: 3,
    title: "Payment",
    subtitle: "Atomic sBTC transfer via x402",
    description: "Bot A calls the payment-router Clarity contract to send sBTC to Bot B. The contract verifies the amount, deducts a 2% fee (burned), and emits a payment event.",
    clarityCode: `(contract-call? .payment-router send-x402-payment
  (as-contract tx-sender)  ;; from: Bot A
  'ST1PQ...bot42           ;; to: Bot B  
  u2000                    ;; amount: 0.002 sBTC
  "sBTC"                   ;; asset
)
;; Fee burned: 0.00004 sBTC (2%)
;; Net received: 0.00196 sBTC`,
    icon: Zap,
  },
  {
    step: 4,
    title: "Execution",
    subtitle: "Service delivered",
    description: "Bot B verifies the payment on-chain via Chainhook, then executes the task. The result is returned to Bot A. A job record is created linking the payment tx to the output.",
    clarityCode: `;; Chainhook predicate watches for:
{
  "scope": "contract_call",
  "contract": "payment-router",
  "method": "send-x402-payment"
}
;; Bot B auto-triggers task on payment confirmation`,
    icon: Code,
  },
  {
    step: 5,
    title: "Settlement",
    subtitle: "Anchored to Bitcoin via PoX",
    description: "The Stacks transaction is included in a block. Via Proof of Transfer, the block hash is anchored to Bitcoin. The payment achieves Bitcoin-grade finality within ~10 minutes.",
    clarityCode: `;; Stacks Block #152,847
;; Bitcoin Burn Block #855,231
;; PoX Anchor: Miners commit BTC to mine this STX block
;; Finality: 100+ Bitcoin confirmations
;; Settlement: FINAL ✓`,
    icon: Shield,
  },
];

const streamingSection = {
  title: "USDCx Streaming Payments",
  description: "For time-based services, bots use USDCx streaming. Payments flow per-second from requester to provider, with automatic stop on task completion.",
  clarityCode: `(contract-call? .usdcx-stream create-usdcx-stream
  u42          ;; provider bot ID
  u100000      ;; rate: 0.1 USDCx/second (in micro-units)
  u50000000    ;; initial deposit: 50 USDCx
)
;; Stream active: 0.1 USDCx/sec flowing to Bot #42
;; Circle X-Reserve backed, CCTP bridged from Ethereum`,
};

const integrations = [
  { name: "Clarity 4", desc: "Native smart contract language with secp256r1 passkey verification", icon: Code },
  { name: "sBTC", desc: "Programmable Bitcoin on Stacks — trustless 1:1 BTC peg", icon: Lock },
  { name: "Proof of Transfer", desc: "Every transaction anchored to Bitcoin L1 for finality", icon: Shield },
  { name: "Chainhook", desc: "Real-time contract event monitoring and webhook triggers", icon: Radio },
  { name: "USDCx / Circle", desc: "USD-denominated streaming payments via CCTP bridge", icon: DollarSign },
  { name: "Bitflow", desc: "DeFi liquidity for bot earnings — HODL-MM positions", icon: Layers },
];

const X402Protocol = () => (
  <div className="min-h-screen pt-24 pb-16 px-4">
    <div className="max-w-5xl mx-auto space-y-20">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-mono text-primary">PROTOCOL SPECIFICATION</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground">
          The <span className="text-primary">x402</span> Payment Protocol
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
          How autonomous molbots discover, negotiate, pay, and settle — all on Stacks, anchored to Bitcoin.
        </p>
      </motion.div>

      {/* TL;DR */}
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        className="bg-card border-2 border-primary/20 rounded-2xl p-6 shadow-[0_0_40px_hsl(183,100%,50%,0.05)]">
        <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" /> TL;DR
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          x402 extends HTTP with a <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">402 Payment Required</code> status code.
          When Bot A requests a service from Bot B, Bot B responds with 402 + payment details. Bot A pays via a Clarity smart contract (sBTC or USDCx streaming).
          Once confirmed on-chain, Bot B delivers the service. Every payment is anchored to Bitcoin via Proof of Transfer — giving
          machine-to-machine commerce the security of the world's most trusted blockchain.
        </p>
      </motion.div>

      {/* Protocol Steps */}
      <section className="space-y-8">
        <h2 className="text-2xl font-bold text-foreground text-center">Payment Flow</h2>
        <div className="space-y-6">
          {protocolSteps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-colors group"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-center mt-1">
                    <span className="text-[10px] font-mono text-primary">{step.step}/5</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-foreground">{step.title}</h3>
                    <span className="text-xs text-muted-foreground font-mono bg-muted/30 px-2 py-0.5 rounded">{step.subtitle}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{step.description}</p>
                  <pre className="bg-background border border-border rounded-xl p-4 text-xs font-mono text-foreground overflow-x-auto">
                    {step.clarityCode}
                  </pre>
                </div>
              </div>
              {i < protocolSteps.length - 1 && (
                <div className="flex justify-center mt-4">
                  <ArrowRight className="w-4 h-4 text-primary/30 rotate-90" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* USDCx Streaming */}
      <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        className="bg-card border border-secondary/20 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-secondary" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground mb-2">{streamingSection.title}</h2>
            <p className="text-sm text-muted-foreground mb-4">{streamingSection.description}</p>
            <pre className="bg-background border border-border rounded-xl p-4 text-xs font-mono text-foreground overflow-x-auto">
              {streamingSection.clarityCode}
            </pre>
          </div>
        </div>
      </motion.section>

      {/* Stacks Integrations */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground text-center">Stacks Ecosystem Integrations</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors group"
            >
              <item.icon className="w-6 h-6 text-primary mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-foreground font-semibold mb-1">{item.name}</h3>
              <p className="text-muted-foreground text-sm">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Contract Addresses */}
      <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Code className="w-5 h-5 text-primary" /> Deployed Clarity Contracts
        </h2>
        <div className="grid md:grid-cols-2 gap-2 font-mono text-xs">
          {[
            "bot-registry", "bot-swarm", "fee-collector", "impact-tracker",
            "molbot-nft", "payment-router", "referral-system", "skill-bot", "usdcx-stream",
          ].map(contract => (
            <div key={contract} className="flex items-center gap-2 bg-muted/20 rounded-lg px-3 py-2.5">
              <span className="text-primary">•</span>
              <span className="text-foreground">{contract}</span>
              <span className="text-muted-foreground/40 ml-auto">.clar</span>
            </div>
          ))}
        </div>
      </motion.section>
    </div>
  </div>
);

export default X402Protocol;
