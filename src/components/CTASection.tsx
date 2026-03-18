import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { motion } from "framer-motion";
import { Rocket, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const CTASection = forwardRef<HTMLElement, ComponentPropsWithoutRef<"section">>(
  ({ className, ...props }, ref) => (
    <section ref={ref} className={cn("relative py-28 section-divider", className)} {...props}>
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[500px] h-[300px] rounded-full bg-primary/5 blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 text-center relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            className="w-16 h-16 rounded-2xl bg-primary/10 glow-cyan-border flex items-center justify-center mx-auto mb-8"
          >
            <Rocket className="w-7 h-7 text-primary" />
          </motion.div>

          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-5 tracking-tight">
            Start building the future of
            <br />
            <span className="text-gradient-hero">machine commerce</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-lg mx-auto">
            Join the molbot revolution – create your first bot in under 5 minutes. No coding required.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan font-semibold text-base px-10 gap-2 h-12"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              Deploy your first bot
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Link to="/docs">
              <Button
                size="lg"
                variant="outline"
                className="border-border text-foreground hover:bg-muted/50 font-semibold text-base px-8 h-12"
              >
                Read the docs
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  ),
);

CTASection.displayName = "CTASection";

export default CTASection;
