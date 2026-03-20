import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { Github, BookOpen, ExternalLink, Zap, Twitter } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const FooterSection = forwardRef<HTMLElement, ComponentPropsWithoutRef<"footer">>(
  ({ className, ...props }, ref) => (
    <footer ref={ref} className={cn("relative border-t border-border/30 py-12", className)} {...props}>
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center">
                <Zap className="w-3 h-3 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">Agent Studio</span>
            </Link>
            <p className="text-xs text-muted-foreground/50 leading-relaxed max-w-[200px]">
              The no-code molbot economy on Bitcoin.
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-medium text-foreground/60 uppercase tracking-wider mb-3">Product</p>
            <div className="space-y-2">
              {[
                { to: "/studio", label: "Builder" },
                { to: "/marketplace", label: "Marketplace" },
                { to: "/wallet", label: "Wallet" },
                { to: "/impact", label: "Impact" },
              ].map((l) => (
                <Link key={l.to} to={l.to} className="block text-xs text-muted-foreground/60 hover:text-foreground transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Developers */}
          <div>
            <p className="text-xs font-medium text-foreground/60 uppercase tracking-wider mb-3">Developers</p>
            <div className="space-y-2">
              {[
                { to: "/docs", label: "Documentation" },
                { to: "/api", label: "API Explorer" },
                { to: "/x402", label: "x402 Protocol" },
                { to: "/architecture", label: "Architecture" },
              ].map((l) => (
                <Link key={l.to} to={l.to} className="block text-xs text-muted-foreground/60 hover:text-foreground transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Community */}
          <div>
            <p className="text-xs font-medium text-foreground/60 uppercase tracking-wider mb-3">Community</p>
            <div className="space-y-2">
              <a href="#" className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-foreground transition-colors">
                <Github className="w-3 h-3" /> GitHub
              </a>
              <a href="#" className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-foreground transition-colors">
                <Twitter className="w-3 h-3" /> Twitter
              </a>
              <a href="#" className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-foreground transition-colors">
                <ExternalLink className="w-3 h-3" /> Explorer
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-border/20 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground/40">© 2026 Agent Studio · BUIDL BATTLE #2</p>
          <p className="text-[11px] text-muted-foreground/30">Built on Stacks · Settled in sBTC</p>
        </div>
      </div>
    </footer>
  ),
);

FooterSection.displayName = "FooterSection";
export default FooterSection;
