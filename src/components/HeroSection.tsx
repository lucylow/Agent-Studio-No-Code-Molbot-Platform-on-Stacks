import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import HeroAnimation from "./HeroAnimation";

const HeroSection = () => (
  <section className="relative min-h-screen flex items-center pt-16">
    {/* Radial glow behind hero */}
    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
    <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-secondary/5 blur-[100px] pointer-events-none" />

    <div className="container mx-auto px-4 py-20">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 badge-glow rounded-full px-4 py-1.5 mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
            <span className="text-xs font-medium text-foreground/80">Now live on Stacks mainnet</span>
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-bold leading-[1.05] mb-6 tracking-tight">
            <span className="text-gradient-hero">Create.</span>
            <br />
            <span className="text-gradient-hero">Deploy.</span>
            <br />
            <span className="text-gradient-hero">Monetize.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-lg leading-relaxed">
            The no‑code platform for the molbot economy on Bitcoin. Build autonomous agents that trade, collaborate, and earn — all on Stacks.
          </p>
          <div className="flex flex-wrap gap-4 mb-12">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan font-semibold text-base px-8 gap-2 h-12"
              onClick={() => document.getElementById("get-started")?.scrollIntoView({ behavior: "smooth" })}
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-border text-foreground hover:bg-muted/50 font-semibold text-base px-8 gap-2 h-12"
            >
              <Play className="w-4 h-4" />
              Watch Demo
            </Button>
          </div>
          <div className="flex flex-wrap gap-8 text-sm text-muted-foreground">
            {[
              { label: "Powered by Stacks", color: "primary" },
              { label: "x402 ready", color: "primary" },
              { label: "USDCx integrated", color: "secondary" },
            ].map((item) => (
              <span key={item.label} className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${item.color === "primary" ? "bg-primary" : "bg-secondary"}`} />
                {item.label}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="flex justify-center"
        >
          <HeroAnimation />
        </motion.div>
      </div>
    </div>
  </section>
);

export default HeroSection;
