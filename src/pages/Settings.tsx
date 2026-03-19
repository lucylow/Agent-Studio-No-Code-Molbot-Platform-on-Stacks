import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Settings as SettingsIcon,
  Sparkles,
  Users,
  Layers,
  FileText,
  Shield,
  Globe,
  BadgeDollarSign,
} from "lucide-react";

const settingsLinks = [
  { to: "/marketplace", label: "Marketplace", icon: Sparkles },
  { to: "/swarms", label: "Swarms", icon: Users },
  { to: "/nfts", label: "NFTs", icon: Layers },
  { to: "/bounties", label: "Bounties", icon: BadgeDollarSign },
  { to: "/impact", label: "Impact", icon: Zap },
  { to: "/docs", label: "Docs", icon: FileText },
  { to: "/api", label: "API Explorer", icon: Shield },
  { to: "/architecture", label: "Architecture", icon: Globe },
  { to: "/tokenomics", label: "Tokenomics", icon: SettingsIcon },
  { to: "/roadmap", label: "Roadmap", icon: Layers },
  { to: "/governance", label: "Governance (DAO)", icon: Users },
];

const Settings = () => {
  return (
    <div className="min-h-screen bg-background pt-24 pb-16 px-4">
      <div className="container mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-10 text-center"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5">
            <SettingsIcon className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono text-primary">SETTINGS & LIBRARY</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mt-4">Everything else</h1>
          <p className="text-muted-foreground text-lg mt-3">
            Technical details, experiments, and ecosystem pages.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-4">
          {settingsLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="glass-card rounded-xl p-6 flex items-start gap-3 hover:border-primary/30 transition-colors"
              >
                <Icon className="w-5 h-5 text-primary mt-1" />
                <div className="min-w-0">
                  <div className="font-semibold text-foreground">{item.label}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Open {item.label.toLowerCase()}.
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Link to="/studio">
            <Button variant="outline" className="border-border hover:bg-muted/50">
              Back to Studio
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Settings;

