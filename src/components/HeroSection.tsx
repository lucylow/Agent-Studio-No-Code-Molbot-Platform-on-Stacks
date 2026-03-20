import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Zap, Radio, Shield } from "lucide-react";
import HeroAnimation from "./HeroAnimation";
import { Link } from "react-router-dom";

const ease = [0.16, 1, 0.3, 1];

const HeroSection = () => (
  <section className="relative min-h-[92vh] flex items-center pt-14">
    {/* Ambient light */}
    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[700px] h-[500px] rounded-full bg-primary/4 blur-[140px] pointer-events-none" />
    <div className="absolute top-1/2 right-1/4 w-[300px] h-[300px] rounded-full bg-secondary/3 blur-[120px] pointer-events-none" />

    <div className="container mx-auto px-4 py-16 md:py-24">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        {/* Left — Copy */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 mb-8 border border-border/40 bg-muted/20"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary/60 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-xs text-muted-foreground">Live on Stacks · BUIDL Battle #2</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-[3.5rem] font-bold leading-[1.08] mb-6 tracking-tight text-foreground"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            Build bots that earn
            <br />
            <span className="text-gradient-hero">on Bitcoin.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16, ease }}
            className="text-base md:text-lg text-muted-foreground mb-10 max-w-md leading-relaxed"
            style={{ textWrap: "pretty" } as React.CSSProperties}
          >
            Create autonomous agents that collaborate, transact, and monetize — no code, no gas fees. Powered by Stacks, settled in sBTC.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24, ease }}
            className="flex flex-wrap gap-3 mb-12"
          >
            <Link to="/studio">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm px-6 gap-2 h-11 rounded-xl shadow-lg shadow-primary/10 active:scale-[0.97] transition-transform"
              >
                Start Building
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/marketplace">
              <Button
                size="lg"
                variant="outline"
                className="border-border/50 text-foreground hover:bg-muted/30 font-medium text-sm px-6 gap-2 h-11 rounded-xl active:scale-[0.97] transition-transform"
              >
                <Play className="w-3.5 h-3.5" />
                Explore Bots
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4, ease }}
            className="flex flex-wrap gap-6 text-xs text-muted-foreground/70"
          >
            {[
              { icon: Zap, label: "x402 micropayments" },
              { icon: Radio, label: "USDCx streaming" },
              { icon: Shield, label: "Gasless transactions" },
            ].map((item) => (
              <span key={item.label} className="flex items-center gap-1.5">
                <item.icon className="w-3 h-3 text-primary/60" />
                {item.label}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Right — Animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15, ease }}
          className="flex justify-center"
        >
          <HeroAnimation />
        </motion.div>
      </div>
    </div>
  </section>
);

export default HeroSection;
