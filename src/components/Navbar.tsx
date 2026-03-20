import { motion, useScroll, useTransform } from "framer-motion";
import { Zap, Wallet, Menu, X, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import WalletConnect from "@/components/WalletConnect";
import NetworkStatus from "@/components/NetworkStatus";

type DropdownKey = "studio" | "deploy" | "agents";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", to: "/", icon: "📱", kind: "link" as const },
  { id: "studio", label: "Studio", to: "/studio", icon: "🔨", kind: "dropdown" as const },
  { id: "deploy", label: "Deploy", to: "/deploy", icon: "🚀", kind: "dropdown" as const },
  { id: "agents", label: "Agents", to: "/agents", icon: "📊", kind: "dropdown" as const },
  { id: "billing", label: "Billing", to: "/billing", icon: "💰", kind: "link" as const },
  { id: "settings", label: "Settings", to: "/settings", icon: "⚙️", kind: "link" as const },
];

const studioDropdown = [
  { to: "/studio", label: "No-Code Builder", desc: "Visual bot canvas" },
  { to: "/marketplace", label: "Templates", desc: "Pre-built flows" },
  { to: "/wallet", label: "Wallet", desc: "Assets & balances" },
  { to: "/demo-wallet", label: "Wallet Demo", desc: "Try the wallet" },
  { to: "/docs", label: "Import Flow", desc: "From JSON/API" },
];

const deployDropdown = [
  { to: "/deploy", label: "Stacks Testnet", desc: "Test environment" },
  { to: "/deploy?network=mainnet", label: "Stacks Mainnet", desc: "Production deploy" },
  { to: "/billing", label: "Fireblocks MPC", desc: "Custody solution" },
  { to: "/api", label: "Custom Endpoint", desc: "API integration" },
];

const agentsDropdown = [
  { to: "/agents?filter=active", label: "Live Molbots", desc: "Currently running" },
  { to: "/agents?filter=paused", label: "Paused Molbots", desc: "Inactive bots" },
  { to: "/studio", label: "+ Create New", desc: "Build from scratch" },
];

const dropdownMap: Record<string, typeof studioDropdown> = {
  studio: studioDropdown,
  deploy: deployDropdown,
  agents: agentsDropdown,
};

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<DropdownKey | null>(null);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const headerBg = useTransform(scrollY, [0, 60], [0, 1]);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const unsub = headerBg.on("change", (v) => setScrolled(v > 0.5));
    return unsub;
  }, [headerBg]);

  const isActive = (href: string) => {
    const [base, query = ""] = href.split("?");
    if (base === "/") return query ? location.pathname === "/" && location.search === `?${query}` : location.pathname === "/";
    return query
      ? location.pathname === base && location.search === `?${query}`
      : location.pathname === base || location.pathname.startsWith(base + "/");
  };

  useEffect(() => {
    if (!openDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(e.target as Node)) setOpenDropdown(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openDropdown]);

  useEffect(() => {
    setMobileOpen(false);
    setOpenDropdown(null);
  }, [location.pathname]);

  const navLinkClass = (href: string) =>
    isActive(href)
      ? "text-foreground bg-muted/60 font-medium"
      : "text-muted-foreground hover:text-foreground hover:bg-muted/30";

  const renderDropdown = (key: DropdownKey) => {
    const items = dropdownMap[key];
    const navItem = NAV_ITEMS.find((n) => n.id === key)!;
    return (
      <div
        key={key}
        className="relative"
        onMouseEnter={() => setOpenDropdown(key)}
        onMouseLeave={() => setOpenDropdown(null)}
      >
        <button
          type="button"
          onClick={() => navigate(navItem.to)}
          className={`px-3 py-1.5 text-[13px] rounded-lg transition-all duration-200 flex items-center gap-1.5 ${navLinkClass(navItem.to)}`}
        >
          <span>{navItem.label}</span>
          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${openDropdown === key ? "rotate-180" : ""}`} />
        </button>
        {openDropdown === key && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full left-0 mt-2 w-60 bg-card/95 backdrop-blur-xl border border-border/60 rounded-xl shadow-xl shadow-background/40 py-2 overflow-hidden"
          >
            {items.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpenDropdown(null)}
                className={`flex flex-col px-4 py-2.5 transition-colors ${
                  isActive(link.to) ? "bg-primary/8 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                <span className="text-[13px] font-medium">{link.label}</span>
                <span className="text-[11px] text-muted-foreground/60">{link.desc}</span>
              </Link>
            ))}
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "border-b border-border/40 bg-background/90 backdrop-blur-2xl" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between h-14 px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center transition-all duration-200 group-hover:bg-primary/25 group-active:scale-95">
            <Zap className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-[15px] font-semibold text-foreground tracking-tight">Molbot Studio</span>
        </Link>

        {/* Desktop Nav */}
        <div ref={dropdownContainerRef} className="hidden lg:flex items-center gap-0.5">
          {NAV_ITEMS.map((item) =>
            item.kind === "dropdown" ? (
              renderDropdown(item.id as DropdownKey)
            ) : (
              <Link
                key={item.id}
                to={item.to}
                className={`px-3 py-1.5 text-[13px] rounded-lg transition-all duration-200 ${navLinkClass(item.to)}`}
              >
                {item.label}
              </Link>
            )
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <div className="hidden lg:block">
            <NetworkStatus />
          </div>

          {user ? (
            <div className="flex items-center gap-1.5">
              <WalletConnect />
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
                onClick={async () => { await signOut(); navigate("/"); }}
              >
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-[13px] gap-1.5 h-8 px-4 rounded-lg">
                <Wallet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Connect</span>
              </Button>
            </Link>
          )}

          <button
            className="lg:hidden text-foreground p-1.5 rounded-lg hover:bg-muted/30 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="lg:hidden border-t border-border/30 bg-background/98 backdrop-blur-2xl"
        >
          <div className="container mx-auto px-4 py-3 space-y-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.id}
                to={item.to}
                className={`block px-4 py-2.5 text-[13px] rounded-lg transition-colors ${navLinkClass(item.to)}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;
