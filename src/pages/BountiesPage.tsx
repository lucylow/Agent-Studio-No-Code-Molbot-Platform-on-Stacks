import { motion } from "framer-motion";
import { Zap, DollarSign, Trophy, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const bounties = [
  {
    icon: Zap,
    title: "x402 Bounty",
    prize: "$3,000",
    description: "Build the most innovative molbot that uses x402 micropayments. Bonus for creative use cases.",
    deadline: "March 20",
    color: "primary" as const,
  },
  {
    icon: DollarSign,
    title: "USDCx Bounty",
    prize: "$3,000",
    description: "Best use of USDCx – streaming subscriptions, cross-chain, or programmable payments.",
    deadline: "March 20",
    color: "secondary" as const,
  },
  {
    icon: Trophy,
    title: "Main Hackathon",
    prize: "$11,000",
    description: "Overall best project – innovation, UX, and Stacks alignment.",
    deadline: "March 20",
    color: "primary" as const,
  },
];

const BountiesPage = () => (
  <div className="min-h-screen bg-background pt-24 pb-16">
    <div className="container mx-auto px-4 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
        <p className="text-sm font-medium text-primary mb-3 tracking-wider uppercase">Rewards</p>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Active Bounties</h1>
        <p className="text-lg text-muted-foreground">
          Earn rewards by building on Agent Studio.
        </p>
      </motion.div>

      {/* Total prize pool */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-xl p-6 text-center mb-8"
      >
        <p className="text-sm text-muted-foreground mb-1">Total Prize Pool</p>
        <p className="text-4xl font-bold text-gradient-hero">$17,000</p>
      </motion.div>

      <div className="space-y-5">
        {bounties.map((b, i) => (
          <motion.div
            key={b.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
            className="gradient-border-card rounded-xl p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  b.color === "primary" ? "bg-primary/10" : "bg-secondary/10"
                }`}>
                  <b.icon className={`w-5 h-5 ${b.color === "primary" ? "text-primary" : "text-secondary"}`} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{b.title}</h2>
                </div>
              </div>
              <span className={`text-2xl font-bold font-mono ${
                b.color === "primary" ? "text-primary" : "text-secondary"
              }`}>
                {b.prize}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{b.description}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
              <Clock className="w-3 h-3" />
              <span className="font-mono">deadline: {b.deadline}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-center mt-10">
        <Link to="/docs">
          <Button variant="outline" className="border-border text-foreground hover:bg-muted/50">
            Read the docs to get started →
          </Button>
        </Link>
      </motion.div>
    </div>
  </div>
);

export default BountiesPage;
