import { motion } from "framer-motion";
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
  { to: "/studio", label: "New Agent" },
  { to: "/marketplace", label: "Templates" },
  { to: "/demo-wallet", label: "Wallet Demo" },
  { to: "/agents?filter=paused", label: "My Drafts" },
  { to: "/docs", label: "Import Flow" },
];

const deployDropdown = [
  { to: "/deploy", label: "Stacks Testnet" },
  { to: "/deploy?network=mainnet", label: "Stacks Mainnet" },
  { to: "/billing", label: "Fireblocks MPC" },
  { to: "/api", label: "Custom Endpoint" },
];

const agentsDropdown = [
  { to: "/agents?filter=active", label: "Live Molbots" },
  { to: "/agents?filter=paused", label: "Paused Molbots" },
  { to: "/studio", label: "+ Create New" },
];

const pathBase = (href: string) => href.split("?")[0];

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<DropdownKey | null>(null);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) => {
    const [base, query = ""] = href.split("?");
    const hasQuery = query.length > 0;

    if (base === "/") {
      if (!hasQuery) return location.pathname === "/";
      return location.pathname === "/" && location.search === `?${query}`;
    }

    if (hasQuery) {
      return location.pathname === base && location.search === `?${query}`;
    }

    return location.pathname === base || location.pathname.startsWith(base + "/");
  };

  useEffect(() => {
    if (!openDropdown) return;

    const handler = (e: MouseEvent) => {
      if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openDropdown]);

  const navLinkClass = (href: string) =>
    isActive(href)
      ? "text-primary bg-primary/10 font-semibold underline underline-offset-4 decoration-primary"
      : "text-muted-foreground hover:text-foreground hover:bg-muted/50";

  const desktopTopItems = NAV_ITEMS.filter((i) => ["dashboard", "studio", "deploy", "agents", "billing", "settings"].includes(i.id));
  const mobileTop = desktopTopItems.slice(0, 4); // Dashboard, Studio, Deploy, Agents
  const mobileMore = desktopTopItems.slice(4); // Billing, Settings

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-xl bg-background/80"
    >
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link
          to="/"
          className="flex items-center gap-2"
          onClick={() => {
            setMobileOpen(false);
            setMobileMoreOpen(false);
            setOpenDropdown(null);
          }}
        >
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center glow-cyan">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <span className="text-lg font-bold text-foreground">Agent Studio</span>
        </Link>

        <div ref={dropdownContainerRef} className="hidden lg:flex items-center gap-1">
          {desktopTopItems.map((item) => {
            if (item.kind === "link") {
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  className={`px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${navLinkClass(item.to)}`}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            }

            if (item.id === "studio") {
              return (
                <div
                  key={item.id}
                  className="relative"
                  onMouseEnter={() => setOpenDropdown("studio")}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  <button
                    type="button"
                    onClick={() => navigate("/studio")}
                    className={`px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${navLinkClass(item.to)}`}
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    <span>{item.label}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openDropdown === "studio" ? "rotate-180" : ""}`} />
                  </button>
                  {openDropdown === "studio" && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute top-full left-0 mt-1 w-56 bg-card border border-border rounded-xl shadow-lg py-1 overflow-hidden"
                    >
                      {studioDropdown.map((link) => (
                        <Link
                          key={link.to}
                          to={link.to}
                          onClick={() => setOpenDropdown(null)}
                          className={`block px-4 py-2 text-sm transition-colors ${
                            isActive(link.to)
                              ? "text-primary bg-primary/10 font-semibold underline underline-offset-4 decoration-primary"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          }`}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </div>
              );
            }

            if (item.id === "deploy") {
              return (
                <div
                  key={item.id}
                  className="relative"
                  onMouseEnter={() => setOpenDropdown("deploy")}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  <button
                    type="button"
                    onClick={() => navigate("/deploy")}
                    className={`px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${navLinkClass(item.to)}`}
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    <span>{item.label}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openDropdown === "deploy" ? "rotate-180" : ""}`} />
                  </button>
                  {openDropdown === "deploy" && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute top-full left-0 mt-1 w-56 bg-card border border-border rounded-xl shadow-lg py-1 overflow-hidden"
                    >
                      {deployDropdown.map((link) => (
                        <Link
                          key={link.to}
                          to={link.to}
                          onClick={() => setOpenDropdown(null)}
                          className={`block px-4 py-2 text-sm transition-colors ${
                            isActive(link.to)
                              ? "text-primary bg-primary/10 font-semibold underline underline-offset-4 decoration-primary"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          }`}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </div>
              );
            }

            if (item.id === "agents") {
              return (
                <div
                  key={item.id}
                  className="relative"
                  onMouseEnter={() => setOpenDropdown("agents")}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  <button
                    type="button"
                    onClick={() => navigate("/agents")}
                    className={`px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${navLinkClass(item.to)}`}
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    <span>{item.label}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openDropdown === "agents" ? "rotate-180" : ""}`} />
                  </button>
                  {openDropdown === "agents" && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute top-full left-0 mt-1 w-56 bg-card border border-border rounded-xl shadow-lg py-1 overflow-hidden"
                    >
                      {agentsDropdown.map((link) => (
                        <Link
                          key={link.to}
                          to={link.to}
                          onClick={() => setOpenDropdown(null)}
                          className={`block px-4 py-2 text-sm transition-colors ${
                            isActive(link.to)
                              ? "text-primary bg-primary/10 font-semibold underline underline-offset-4 decoration-primary"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          }`}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </div>
              );
            }

            return null;
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-2">
            <NetworkStatus />
          </div>

          {user ? (
            <div className="flex items-center gap-2">
              <WalletConnect />
              <Button
                variant="outline"
                className="border-border text-muted-foreground hover:text-foreground text-sm"
                onClick={async () => {
                  await signOut();
                  navigate("/");
                }}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Link to="/auth" onClick={() => setMobileOpen(false)}>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan font-semibold text-sm gap-2">
                <Wallet className="w-4 h-4" />
                <span className="hidden sm:inline">Connect</span>
              </Button>
            </Link>
          )}

          <button
            className="lg:hidden text-foreground p-2"
            onClick={() => {
              setMobileOpen(!mobileOpen);
              setMobileMoreOpen(false);
              setOpenDropdown(null);
            }}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl"
        >
          <div className="px-2 py-2">
            {mobileTop.map((item) => (
              <Link
                key={item.id}
                to={item.to}
                onClick={() => {
                  setMobileOpen(false);
                  setMobileMoreOpen(false);
                }}
                className={`block px-6 py-3 text-sm transition-colors rounded-md flex items-center gap-2 ${
                  isActive(item.to)
                    ? "text-primary bg-primary/10 font-semibold underline underline-offset-4 decoration-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}

            <div className="mt-1 border-t border-border/50">
              <button
                type="button"
                className={`w-full flex items-center justify-between px-6 py-3 text-sm transition-colors ${
                  isActive("/billing") || isActive("/settings")
                    ? "text-primary font-semibold underline underline-offset-4 decoration-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setMobileMoreOpen(!mobileMoreOpen)}
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden="true">+ </span>
                  <span>More</span>
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${mobileMoreOpen ? "rotate-180" : ""}`} />
              </button>

              {mobileMoreOpen && (
                <div className="pb-2">
                  {mobileMore.map((item) => (
                    <Link
                      key={item.id}
                      to={item.to}
                      onClick={() => {
                        setMobileOpen(false);
                        setMobileMoreOpen(false);
                      }}
                      className={`block px-6 py-3 text-sm transition-colors ${
                        isActive(item.to)
                          ? "text-primary bg-primary/10 font-semibold underline underline-offset-4 decoration-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span aria-hidden="true">{item.icon}</span>
                        <span>{item.label}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;

