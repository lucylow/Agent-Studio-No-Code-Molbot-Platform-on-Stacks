import { motion } from "framer-motion";
import { Zap, CircleDollarSign, Trophy } from "lucide-react";

const bounties = [
  {
    icon: Zap,
    title: "x402 Bounty",
    description: "Every bot-to-bot payment uses x402 micropayments in sBTC.",
    color: "primary" as const,
  },
  {
    icon: CircleDollarSign,
    title: "USDCx Bounty",
    description: "Stable pricing & programmable streams with USDCx.",
    color: "secondary" as const,
  },
  {
    icon: Trophy,
    title: "Main Prize",
    description: "Complete, innovative platform growing the Stacks ecosystem.",
    color: "primary" as const,
  },
];

const BountiesSection = () => (
  <section className="relative py-20 section-divider" id="bounties">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="glass-card rounded-2xl p-8 md:p-12"
      >
        <p className="text-sm font-medium text-primary mb-3 tracking-wider uppercase">Competition</p>
        <h3 className="text-2xl font-bold text-foreground mb-8 flex items-center gap-3">
          🏅 This project competes for
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          {bounties.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="badge-glow rounded-xl p-5 cursor-default"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  b.color === "primary" ? "bg-primary/15" : "bg-secondary/15"
                }`}>
                  <b.icon className={`w-4 h-4 ${b.color === "primary" ? "text-primary" : "text-secondary"}`} />
                </div>
                <span className="font-semibold text-foreground">{b.title}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{b.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  </section>
);

export default BountiesSection;
