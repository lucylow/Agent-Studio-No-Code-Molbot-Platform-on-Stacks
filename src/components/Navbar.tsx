import { motion } from "framer-motion";
import { Zap, Wallet, Menu, X, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import WalletConnect from "@/components/WalletConnect";
import NetworkStatus from "@/components/NetworkStatus";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/marketplace", label: "Marketplace" },
  { to: "/swarms", label: "Swarms" },
  { to: "/nfts", label: "NFTs" },
  { to: "/architecture", label: "Architecture" },
  { to: "/docs", label: "Docs" },
  { to: "/bounties", label: "Bounties" },
  { to: "/governance", label: "DAO" },
  { to: "/impact", label: "Impact" },
];

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-xl bg-background/80"
    >
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center glow-cyan">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <span className="text-lg font-bold text-foreground">Agent Studio</span>
        </Link>

        <div className="hidden lg:flex items-center gap-0.5">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${
                location.pathname === link.to
                  ? "text-primary bg-primary/10 font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {user && (
            <Link
              to="/dashboard"
              className={`px-3 py-2 text-sm rounded-md transition-colors ${
                location.pathname === "/dashboard"
                  ? "text-primary bg-primary/10 font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              Dashboard
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              <WalletConnect />
              <Link to="/dashboard">
                <Button variant="outline" className="border-border text-foreground hover:bg-muted/50 text-sm gap-2 hidden sm:flex">
                  <User className="w-4 h-4" />
                  Dashboard
                </Button>
              </Link>
              <Button
                variant="outline"
                className="border-border text-muted-foreground hover:text-foreground text-sm"
                onClick={async () => { await signOut(); navigate("/"); }}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Link to="/auth">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan font-semibold text-sm gap-2">
                <Wallet className="w-4 h-4" />
                <span className="hidden sm:inline">Connect</span>
              </Button>
            </Link>
          )}

          <button className="lg:hidden text-foreground p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="lg:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)}
              className={`block px-6 py-3 text-sm transition-colors ${location.pathname === link.to ? "text-primary bg-primary/10 font-semibold" : "text-muted-foreground hover:text-foreground"}`}>
              {link.label}
            </Link>
          ))}
          {user && (
            <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="block px-6 py-3 text-sm text-muted-foreground hover:text-foreground">Dashboard</Link>
          )}
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;
