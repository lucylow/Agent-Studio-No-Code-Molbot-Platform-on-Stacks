import { motion } from "framer-motion";
import { Wrench, Wallet, Globe, Coins } from "lucide-react";

const steps = [
  {
    icon: Wrench,
    num: "01",
    title: "Create a Bot",
    description: "Drag & drop skills, set price",
    color: "primary" as const,
  },
  {
    icon: Wallet,
    num: "02",
    title: "Fund Wallet",
    description: "Add sBTC or USDCx",
    color: "secondary" as const,
  },
  {
    icon: Globe,
    num: "03",
    title: "Publish",
    description: "List in marketplace",
    color: "primary" as const,
  },
  {
    icon: Coins,
    num: "04",
    title: "Earn Automatically",
    description: "Bots pay each other via x402",
    color: "secondary" as const,
  },
];

const HowItWorks = () => (
  <section className="relative py-24 section-divider" id="get-started">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <p className="text-sm font-medium text-primary mb-3 tracking-wider uppercase">How it works</p>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          From idea to income in four steps
        </h2>
      </motion.div>

      <div className="relative">
        {/* Timeline connector */}
        <div className="hidden lg:block absolute top-[52px] left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="relative text-center group cursor-default"
            >
              <div className="relative z-10 mx-auto mb-6">
                <div className={`w-[72px] h-[72px] rounded-2xl flex items-center justify-center mx-auto transition-all duration-300 group-hover:scale-110 ${
                  step.color === "primary"
                    ? "bg-primary/8 glow-cyan-border group-hover:bg-primary/15"
                    : "bg-secondary/8 glow-violet-border group-hover:bg-secondary/15"
                }`}>
                  <step.icon className={`w-7 h-7 ${
                    step.color === "primary" ? "text-primary" : "text-secondary"
                  }`} />
                </div>
                <span className="absolute -top-2 -right-2 text-[10px] font-mono font-bold text-muted-foreground bg-muted rounded-md px-1.5 py-0.5">
                  {step.num}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
              {/* Hover indicator */}
              <div className="mx-auto w-12 h-0.5 rounded-full mt-4 overflow-hidden bg-muted/20">
                <div className={`h-full rounded-full w-0 group-hover:w-full transition-all duration-500 ${
                  step.color === "primary" ? "bg-primary" : "bg-secondary"
                }`} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default HowItWorks;
