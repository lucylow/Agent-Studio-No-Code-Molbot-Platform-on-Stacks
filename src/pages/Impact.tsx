import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import {
  TrendingUp, Users, Bot, Coins, Zap, Globe,
  ArrowUpRight, Shield, Code, Share2, Award, Target
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/* ── Animated Counter ─────────────────────────────────────── */
const Counter = ({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const steps = 50;
    const inc = target / steps;
    let cur = 0;
    const t = setInterval(() => {
      cur += inc;
      if (cur >= target) { setCount(target); clearInterval(t); }
      else setCount(Math.floor(cur));
    }, 30);
    return () => clearInterval(t);
  }, [inView, target]);

  const fmt = target >= 1000 ? count.toLocaleString() : target % 1 !== 0 ? count.toFixed(1) : count.toString();
  return <span ref={ref} className="tabular-nums">{prefix}{fmt}{suffix}</span>;
};

/* ── Growth Projections ───────────────────────────────────── */
const projections = [
  { period: "6 Months", wallets: "10,000", bots: "5,000", dau: "1,000", sbtc: "100 BTC", usdcx: "$500K", devs: "+200" },
  { period: "12 Months", wallets: "50,000", bots: "30,000", dau: "10,000", sbtc: "1,000 BTC", usdcx: "$5M", devs: "+1,000" },
  { period: "24 Months", wallets: "250,000", bots: "200,000", dau: "50,000", sbtc: "10,000 BTC", usdcx: "$50M", devs: "+5,000" },
];

/* ── Ecosystem Contributions ──────────────────────────────── */
const contributions = [
  { icon: Users, title: "New Users", desc: "Gamified onboarding and bot creation attract mainstream users to Stacks" },
  { icon: Code, title: "Developers", desc: "Templates, tutorials, and hackathons bootstrap a developer community on Clarity" },
  { icon: Coins, title: "Liquidity", desc: "Bot earnings deposited into Bitflow pools — bringing TVL to DeFi on Stacks" },
  { icon: Zap, title: "USDCx Adoption", desc: "Streaming payments showcase Circle's xReserve stablecoin technology on Stacks" },
  { icon: Share2, title: "Network Effects", desc: "Referral loops and viral templates create exponential organic growth" },
  { icon: Award, title: "Grant Pipeline", desc: "Top bot creators funneled to Stacks Foundation grants and accelerators" },
];

/* ── Viral Loops ──────────────────────────────────────────── */
const viralLoops = [
  { title: "Marketplace Referrals", desc: "0.5% of every bot hire goes to the referrer — creating cascading incentive chains", fee: "0.5%", color: "text-primary" },
  { title: "Shareable Bot Profiles", desc: "Unique URLs with referral tracking. Share → Hire → Earn commission on every transaction", fee: "1%", color: "text-secondary" },
  { title: "Template Royalties", desc: "Bot creators publish templates — earn 1% royalty on all bots spawned from their design", fee: "1%", color: "text-primary" },
];

const Impact = () => {
  const [liveStats, setLiveStats] = useState({ bots: 0, nfts: 0, swarms: 0, proposals: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const [b, n, s, p] = await Promise.all([
          supabase.from("bots").select("id", { count: "exact", head: true }),
          supabase.from("nft_tokens").select("id", { count: "exact", head: true }).eq("burned", false),
          supabase.from("swarms").select("id", { count: "exact", head: true }),
          supabase.from("dao_proposals").select("id", { count: "exact", head: true }),
        ]);
        setLiveStats({
          bots: b.count ?? 0,
          nfts: n.count ?? 0,
          swarms: s.count ?? 0,
          proposals: p.count ?? 0,
        });
      } catch (err) {
        console.error("Failed to load impact stats:", err);
      }
    };
    load();
  }, []);

  const heroStats = [
    { value: 1247 + liveStats.bots, suffix: "+", label: "Bots Deployed", icon: Bot },
    { value: 10340, suffix: "+", label: "New Stacks Wallets", icon: Users },
    { value: 142.5, suffix: " BTC", label: "sBTC Volume", icon: Coins },
    { value: 99.9, suffix: "%", label: "Protocol Uptime", icon: Shield },
  ];

  return (
    <div className="min-h-screen pt-20 pb-16">
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="container mx-auto px-4 py-16 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Badge className="bg-primary/10 text-primary border-primary/30 mb-4 text-sm">
            <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> Ecosystem Impact
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4 leading-tight">
            Scaling <span className="text-primary">Stacks</span> Through<br />
            Autonomous Agents
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Agent Studio isn't just an app — it's the leading user-acquisition engine for Stacks,
            onboarding thousands of wallets, developers, and liquidity onto Bitcoin L2.
          </p>
        </motion.div>

        {/* Live Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-12 max-w-4xl mx-auto">
          {heroStats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="bg-card/60 border border-border/50 rounded-xl p-5 backdrop-blur-sm"
            >
              <s.icon className="w-5 h-5 mx-auto mb-2 text-primary/70" />
              <div className="text-2xl md:text-3xl font-bold text-foreground">
                <Counter target={s.value} suffix={s.suffix} />
              </div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Live Platform Metrics ──────────────────────────── */}
      <section className="container mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            <Globe className="inline w-6 h-6 mr-2 text-primary" />
            Live Platform Metrics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { label: "Active Bots", value: liveStats.bots, icon: Bot },
              { label: "Minted NFTs", value: liveStats.nfts, icon: Zap },
              { label: "Active Swarms", value: liveStats.swarms, icon: Users },
              { label: "DAO Proposals", value: liveStats.proposals, icon: Target },
            ].map((m) => (
              <Card key={m.label} className="bg-card/40 border-border/50 text-center">
                <CardContent className="pt-5 pb-4">
                  <m.icon className="w-5 h-5 mx-auto mb-2 text-secondary" />
                  <div className="text-3xl font-bold text-foreground">{m.value}</div>
                  <div className="text-xs text-muted-foreground">{m.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Growth Projections Table ──────────────────────── */}
      <section className="container mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            📈 Projected Ecosystem Impact
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full max-w-4xl mx-auto text-sm border-collapse">
              <thead>
                <tr className="border-b border-border/50">
                  {["Timeline", "New Wallets", "Bots", "DAU", "sBTC Vol.", "USDCx", "Devs"].map((h) => (
                    <th key={h} className="text-left py-3 px-3 text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projections.map((row, i) => (
                  <motion.tr
                    key={row.period}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-3 px-3 font-semibold text-primary">{row.period}</td>
                    <td className="py-3 px-3 text-foreground">{row.wallets}</td>
                    <td className="py-3 px-3 text-foreground">{row.bots}</td>
                    <td className="py-3 px-3 text-foreground">{row.dau}</td>
                    <td className="py-3 px-3 text-foreground">{row.sbtc}</td>
                    <td className="py-3 px-3 text-foreground">{row.usdcx}</td>
                    <td className="py-3 px-3 text-secondary font-medium">{row.devs}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </section>

      {/* ── Viral Growth Loops ────────────────────────────── */}
      <section className="container mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-2xl font-bold text-foreground mb-2 text-center">🔁 Viral Growth Loops</h2>
          <p className="text-muted-foreground text-center mb-8 text-sm">Built-in network effects that drive exponential Stacks adoption</p>
          <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {viralLoops.map((loop, i) => (
              <motion.div
                key={loop.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="bg-card/40 border-border/50 h-full hover:border-primary/30 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base text-foreground">{loop.title}</CardTitle>
                      <Badge variant="outline" className={`${loop.color} border-current text-xs`}>{loop.fee} fee</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{loop.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Ecosystem Contributions ───────────────────────── */}
      <section className="container mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-2xl font-bold text-foreground mb-2 text-center">🤝 Ecosystem Contributions</h2>
          <p className="text-muted-foreground text-center mb-8 text-sm">How Agent Studio strengthens every layer of Stacks</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {contributions.map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Card className="bg-card/30 border-border/40 h-full">
                  <CardContent className="pt-5">
                    <c.icon className="w-6 h-6 text-primary mb-3" />
                    <h3 className="font-semibold text-foreground mb-1 text-sm">{c.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Protocol Fee Breakdown ────────────────────────── */}
      <section className="container mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-2xl mx-auto">
          <Card className="bg-card/50 border-primary/20">
            <CardHeader>
              <CardTitle className="text-foreground text-center">💸 Protocol Fee Structure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Total Protocol Fee</span>
                <Badge className="bg-primary/10 text-primary border-primary/30">0.5%</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">→ DAO Treasury</span>
                <span className="text-sm text-foreground font-medium">60% of fee (0.30%)</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">→ Ecosystem Fund</span>
                <span className="text-sm text-foreground font-medium">40% of fee (0.20%)</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Referral Bonus</span>
                <span className="text-sm text-secondary font-medium">+0.5% to referrer</span>
              </div>
              {/* Fee allocation bar */}
              <div className="mt-4">
                <div className="h-3 rounded-full overflow-hidden flex bg-muted">
                  <div className="bg-primary h-full" style={{ width: "60%" }} />
                  <div className="bg-secondary h-full" style={{ width: "40%" }} />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                  <span className="text-primary">DAO Treasury (60%)</span>
                  <span className="text-secondary">Ecosystem Fund (40%)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className="container mx-auto px-4 py-16 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Join the Movement
          </h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto text-sm">
            Every bot deployed, every transaction processed, every wallet created
            strengthens the entire Stacks ecosystem. Be part of it.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan gap-2"
              onClick={() => window.location.href = "/auth"}
            >
              <Zap className="w-4 h-4" /> Start Building
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-border text-foreground hover:bg-muted/50 gap-2"
              onClick={() => window.location.href = "/marketplace"}
            >
              <ArrowUpRight className="w-4 h-4" /> Explore Marketplace
            </Button>
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default Impact;
