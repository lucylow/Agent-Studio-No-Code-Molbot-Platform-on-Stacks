import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Coins, Lock, TrendingUp, Users, Zap, Shield } from "lucide-react";

const tokenDistribution = [
  { name: "Ecosystem & Rewards", value: 35, color: "hsl(183, 100%, 50%)" },
  { name: "Development Fund", value: 20, color: "hsl(264, 97%, 58%)" },
  { name: "Community Treasury", value: 15, color: "hsl(183, 100%, 35%)" },
  { name: "Team & Advisors", value: 15, color: "hsl(264, 97%, 40%)" },
  { name: "Liquidity & Partnerships", value: 10, color: "hsl(210, 40%, 50%)" },
  { name: "Initial Sale", value: 5, color: "hsl(183, 60%, 60%)" },
];

const vestingSchedule = [
  { phase: "TGE", unlock: "10%", date: "Q3 2025", description: "Initial token generation event" },
  { phase: "Month 3", unlock: "15%", date: "Q4 2025", description: "First vesting cliff release" },
  { phase: "Month 6", unlock: "25%", date: "Q1 2026", description: "Linear unlock begins" },
  { phase: "Month 12", unlock: "50%", date: "Q3 2026", description: "Halfway vesting milestone" },
  { phase: "Month 18", unlock: "75%", date: "Q1 2027", description: "Major unlock event" },
  { phase: "Month 24", unlock: "100%", date: "Q3 2027", description: "Full vesting complete" },
];

const economicFeatures = [
  { icon: Zap, title: "x402 Micropayments", description: "Bots pay per-request fees using HTTP 402, creating real-time token velocity across the network." },
  { icon: Lock, title: "Staking Rewards", description: "Stake MOL tokens to earn from network fees. Higher stakes unlock premium bot capabilities." },
  { icon: TrendingUp, title: "Deflationary Burns", description: "2% of all transaction fees are permanently burned, reducing supply over time." },
  { icon: Users, title: "Referral Mining", description: "Earn tokens by onboarding new bot operators. Multi-tier rewards incentivize growth." },
  { icon: Shield, title: "sBTC Collateral", description: "Bots can post sBTC as collateral for premium service tiers, bridging Bitcoin security." },
  { icon: Coins, title: "USDCx Streaming", description: "Continuous payment streams via USDCx for subscription-based bot services." },
];

const Tokenomics = () => (
  <div className="min-h-screen pt-24 pb-16 px-4">
    <div className="max-w-6xl mx-auto space-y-20">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold">
          <span className="text-primary">MOL</span> <span className="text-foreground">Tokenomics</span>
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
          A deflationary utility token powering machine-to-machine commerce on Stacks & Bitcoin.
        </p>
        <div className="flex justify-center gap-6 pt-4">
          {[{ label: "Total Supply", value: "100M" }, { label: "Circulating", value: "~10M" }, { label: "Burn Rate", value: "2%/tx" }].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl px-6 py-3 text-center">
              <div className="text-2xl font-bold text-primary">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Distribution Chart */}
      <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="grid md:grid-cols-2 gap-8 items-center">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={tokenDistribution} cx="50%" cy="50%" outerRadius={120} innerRadius={60} dataKey="value" strokeWidth={2} stroke="hsl(228, 60%, 10%)">
                {tokenDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(228, 50%, 13%)", border: "1px solid hsl(228, 30%, 20%)", borderRadius: "8px", color: "hsl(210, 40%, 92%)" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-foreground mb-4">Token Distribution</h2>
          {tokenDistribution.map((item) => (
            <div key={item.name} className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-foreground flex-1">{item.name}</span>
              <span className="text-primary font-mono font-bold">{item.value}%</span>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Vesting */}
      <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="space-y-8">
        <h2 className="text-2xl font-bold text-foreground text-center">Vesting Schedule</h2>
        <div className="relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border hidden md:block" />
          <div className="space-y-6">
            {vestingSchedule.map((item, i) => (
              <motion.div key={item.phase} initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={`flex items-center gap-4 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}>
                <div className={`flex-1 bg-card border border-border rounded-xl p-4 ${i % 2 === 0 ? "md:text-right" : ""}`}>
                  <div className="text-primary font-mono font-bold">{item.unlock} Unlocked</div>
                  <div className="text-foreground font-semibold">{item.phase}</div>
                  <div className="text-muted-foreground text-sm">{item.description}</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center flex-shrink-0 z-10">
                  <span className="text-primary text-xs font-bold">{item.date.slice(-2)}</span>
                </div>
                <div className="flex-1 hidden md:block" />
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Economic Model */}
      <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="space-y-8">
        <h2 className="text-2xl font-bold text-foreground text-center">Economic Model</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {economicFeatures.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors group">
              <f.icon className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-foreground font-semibold mb-1">{f.title}</h3>
              <p className="text-muted-foreground text-sm">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </div>
  </div>
);

export default Tokenomics;
