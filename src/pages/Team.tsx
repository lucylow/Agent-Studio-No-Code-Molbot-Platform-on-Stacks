import { motion } from "framer-motion";
import { Github, Twitter, Globe, Bot, Brain, Shield, Cpu, Code, Layers } from "lucide-react";

const team = [
  { name: "Alex Chen", role: "Founder & Protocol Lead", bio: "Ex-Blockstack engineer. 8 years in Bitcoin L2 development. Designed the x402 payment integration.", icon: Brain, links: { github: "#", twitter: "#" } },
  { name: "Maya Rodriguez", role: "Smart Contract Architect", bio: "Clarity expert. Built 50+ production contracts. Former auditor at a leading blockchain security firm.", icon: Code, links: { github: "#", twitter: "#" } },
  { name: "James Park", role: "AI & Swarm Systems", bio: "PhD in multi-agent systems. Led autonomous robotics research before pivoting to decentralized AI.", icon: Cpu, links: { github: "#" } },
  { name: "Sarah Kim", role: "Product & UX Lead", bio: "Designed onboarding flows for 3 top-50 DeFi protocols. Passionate about crypto accessibility.", icon: Layers, links: { twitter: "#" } },
  { name: "Omar Hassan", role: "Security & DevOps", bio: "Former pen-tester turned protocol security engineer. Runs our bug bounty and audit programs.", icon: Shield, links: { github: "#" } },
  { name: "Luna Wei", role: "Ecosystem & Partnerships", bio: "Connected the dots between Bitflow, USDCx, and our payment rails. Deep Stacks ecosystem knowledge.", icon: Globe, links: { twitter: "#" } },
];

const advisors = [
  { name: "Dr. Nakamura", role: "Bitcoin Economics Advisor", org: "Stanford DeFi Lab" },
  { name: "Elena Volkov", role: "Tokenomics Advisor", org: "Former Hiro Systems" },
  { name: "Marcus Thompson", role: "Enterprise Strategy", org: "Web3 Ventures" },
];

const values = [
  { title: "Bitcoin-First", description: "Every transaction settles on Bitcoin via Stacks. No compromises on security." },
  { title: "Open Source", description: "All contracts and core protocols are public. Transparency builds trust." },
  { title: "Bot Autonomy", description: "Machines should transact freely. We build infrastructure, not gatekeepers." },
  { title: "Impact-Driven", description: "Track and optimize for real-world outcomes, not just TVL." },
];

const Team = () => (
  <div className="min-h-screen pt-24 pb-16 px-4">
    <div className="max-w-6xl mx-auto space-y-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground">
          Meet the <span className="text-primary">Team</span>
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Engineers, researchers, and builders creating the autonomous machine economy.
        </p>
      </motion.div>

      {/* Mission */}
      <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        className="bg-card border border-border rounded-2xl p-8 text-center max-w-3xl mx-auto">
        <Bot className="w-12 h-12 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-3">Our Mission</h2>
        <p className="text-muted-foreground leading-relaxed">
          We're building the infrastructure for machine-to-machine commerce on Bitcoin. MolBot enables autonomous agents
          to discover, negotiate, and pay each other — creating a self-sustaining digital economy secured by the most
          trusted blockchain in the world.
        </p>
      </motion.section>

      {/* Team Grid */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground text-center">Core Team</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {team.map((member, i) => (
            <motion.div key={member.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors group">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <member.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-foreground font-semibold">{member.name}</h3>
                  <p className="text-primary text-xs font-mono">{member.role}</p>
                </div>
              </div>
              <p className="text-muted-foreground text-sm mb-3">{member.bio}</p>
              <div className="flex gap-2">
                {member.links.github && <a href={member.links.github} className="text-muted-foreground hover:text-primary transition-colors"><Github className="w-4 h-4" /></a>}
                {member.links.twitter && <a href={member.links.twitter} className="text-muted-foreground hover:text-primary transition-colors"><Twitter className="w-4 h-4" /></a>}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Advisors */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground text-center">Advisors</h2>
        <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {advisors.map((a, i) => (
            <motion.div key={a.name} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="bg-card border border-border rounded-xl p-4 text-center">
              <h3 className="text-foreground font-semibold">{a.name}</h3>
              <p className="text-primary text-xs font-mono">{a.role}</p>
              <p className="text-muted-foreground text-xs mt-1">{a.org}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground text-center">Our Values</h2>
        <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {values.map((v, i) => (
            <motion.div key={v.title} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-primary font-semibold mb-1">{v.title}</h3>
              <p className="text-muted-foreground text-sm">{v.description}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  </div>
);

export default Team;
