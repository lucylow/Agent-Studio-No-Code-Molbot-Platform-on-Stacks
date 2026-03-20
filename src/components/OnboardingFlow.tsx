import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Wallet, Zap, Bot, CheckCircle2, ArrowRight, Shield } from "lucide-react";

const steps = [
  {
    icon: Wallet,
    title: "Create your free account",
    description: "No credit card required. Sign up with email — we handle the rest.",
    cta: "Get Started",
  },
  {
    icon: Zap,
    title: "Get free test funds",
    description: "We'll airdrop 0.01 sBTC to your wallet so you can start right away.",
    cta: "Claim Funds",
  },
  {
    icon: Bot,
    title: "Build your first bot",
    description: "Name it, add skills, set a price — your bot goes live in seconds.",
    cta: "Go to Dashboard",
  },
];

const OnboardingFlow = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (user) setCurrentStep(1);
  }, [user]);

  const handleAction = async () => {
    if (currentStep === 0) {
      navigate("/auth");
    } else if (currentStep === 1) {
      setClaiming(true);
      // Simulate faucet airdrop
      await new Promise((r) => setTimeout(r, 1500));
      setClaimed(true);
      setClaiming(false);
      setTimeout(() => setCurrentStep(2), 800);
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <section className="py-16" aria-label="Get started with Molbot Studio">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <p className="text-sm font-medium text-secondary mb-2 tracking-wider uppercase">Zero to Hero</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Start in 60 seconds
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            No crypto knowledge needed. We handle wallets, gas, and complexity.
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center justify-center gap-2 mb-8" role="progressbar" aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={3}>
          {steps.map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                i < currentStep ? "bg-primary text-primary-foreground" :
                i === currentStep ? "bg-primary/20 text-primary border-2 border-primary" :
                "bg-muted text-muted-foreground"
              }`}>
                {i < currentStep ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-12 h-0.5 rounded ${i < currentStep ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Active step card */}
        <div className="max-w-lg mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="gradient-border-card rounded-2xl p-8 text-center"
            >
              {(() => {
                const StepIcon = steps[currentStep].icon;
                return (
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <StepIcon className="w-7 h-7 text-primary" />
                  </div>
                );
              })()}
              <h3 className="text-xl font-bold text-foreground mb-2">{steps[currentStep].title}</h3>
              <p className="text-muted-foreground mb-6">{steps[currentStep].description}</p>

              {currentStep === 1 && claimed ? (
                <div className="flex items-center justify-center gap-2 text-primary font-semibold">
                  <CheckCircle2 className="w-5 h-5" />
                  0.01 sBTC claimed!
                </div>
              ) : (
                <Button
                  onClick={handleAction}
                  disabled={claiming}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan font-semibold gap-2 px-8"
                  aria-label={steps[currentStep].cta}
                >
                  {claiming ? "Claiming..." : steps[currentStep].cta}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </motion.div>
          </AnimatePresence>

          <p className="text-center text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" />
            Non-custodial — you always own your keys
          </p>
        </div>
      </div>
    </section>
  );
};

export default OnboardingFlow;
