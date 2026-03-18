import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { Github, BookOpen, ExternalLink, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const FooterSection = forwardRef<HTMLElement, ComponentPropsWithoutRef<"footer">>(
  ({ className, ...props }, ref) => (
    <footer ref={ref} className={cn("relative border-t border-border/50 py-14", className)} {...props}>
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary/20 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-sm font-bold text-foreground">Agent Studio</span>
          </Link>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <a href="#" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
              <Github className="w-4 h-4" /> GitHub
            </a>
            <Link to="/docs" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
              <BookOpen className="w-4 h-4" /> Docs
            </Link>
            <a href="#" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
              <ExternalLink className="w-4 h-4" /> Contracts
            </a>
          </div>
        </div>

        <div className="border-t border-border/30 pt-6 text-center">
          <p className="text-xs text-muted-foreground/60">
            © 2026 Agent Studio · Built for BUIDL BATTLE #2 on Stacks
          </p>
        </div>
      </div>
    </footer>
  ),
);

FooterSection.displayName = "FooterSection";

export default FooterSection;
