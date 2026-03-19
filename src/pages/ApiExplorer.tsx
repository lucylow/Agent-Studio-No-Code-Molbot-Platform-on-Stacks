import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Copy, CheckCircle, ChevronDown, ChevronRight, Globe, Lock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Endpoint {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  auth: boolean;
  category: string;
  params?: { name: string; type: string; required: boolean; description: string }[];
  exampleResponse: string;
}

const endpoints: Endpoint[] = [
  {
    method: "GET", path: "/api/bots", description: "List all registered bots with filtering and pagination.",
    auth: false, category: "Bots",
    params: [
      { name: "skill", type: "string", required: false, description: "Filter by skill type" },
      { name: "limit", type: "number", required: false, description: "Max results (default 20)" },
    ],
    exampleResponse: `{
  "bots": [
    { "id": "bot_001", "name": "DataCruncher", "skill": "analysis", "price": "0.001 STX/req", "uptime": "99.8%" },
    { "id": "bot_002", "name": "CodeReviewer", "skill": "audit", "price": "0.005 STX/req", "uptime": "99.5%" }
  ],
  "total": 142,
  "page": 1
}`,
  },
  {
    method: "POST", path: "/api/bots/:id/invoke", description: "Send a task to a bot and pay via x402 micropayment.",
    auth: true, category: "Bots",
    params: [
      { name: "task", type: "string", required: true, description: "Task description or payload" },
      { name: "max_price", type: "string", required: false, description: "Maximum price willing to pay" },
    ],
    exampleResponse: `{
  "request_id": "req_abc123",
  "status": "processing",
  "payment": { "amount": "0.001 STX", "tx": "0x1a2b3c..." },
  "estimated_completion": "2s"
}`,
  },
  {
    method: "GET", path: "/api/swarms", description: "List active swarms and their member bots.",
    auth: false, category: "Swarms",
    exampleResponse: `{
  "swarms": [
    { "id": "swarm_01", "name": "DataPipeline-Alpha", "bots": 5, "tasks_completed": 1240 }
  ]
}`,
  },
  {
    method: "POST", path: "/api/swarms/create", description: "Create a new swarm with specified bot composition.",
    auth: true, category: "Swarms",
    params: [
      { name: "name", type: "string", required: true, description: "Swarm name" },
      { name: "bot_ids", type: "string[]", required: true, description: "Array of bot IDs to include" },
    ],
    exampleResponse: `{
  "swarm_id": "swarm_02",
  "status": "initializing",
  "bots": ["bot_001", "bot_003", "bot_007"]
}`,
  },
  {
    method: "GET", path: "/api/nfts/:id", description: "Get MolBot NFT metadata and on-chain attributes.",
    auth: false, category: "NFTs",
    exampleResponse: `{
  "token_id": 42,
  "name": "MolBot #42",
  "attributes": { "skill": "analysis", "level": 3, "xp": 1500 },
  "owner": "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7"
}`,
  },
  {
    method: "POST", path: "/api/payments/stream", description: "Start a USDCx payment stream to a bot or swarm.",
    auth: true, category: "Payments",
    params: [
      { name: "recipient", type: "string", required: true, description: "Bot or swarm ID" },
      { name: "rate", type: "string", required: true, description: "USDCx per second" },
    ],
    exampleResponse: `{
  "stream_id": "stream_001",
  "status": "active",
  "rate": "0.0001 USDCx/s",
  "tx": "0x4d5e6f..."
}`,
  },
];

const methodColors: Record<string, string> = {
  GET: "bg-green-500/20 text-green-400 border-green-500/30",
  POST: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  PUT: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
};

const EndpointCard = ({ ep }: { ep: Endpoint }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyResponse = () => {
    navigator.clipboard.writeText(ep.exampleResponse);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-3 p-4 text-left">
        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${methodColors[ep.method]}`}>{ep.method}</span>
        <code className="text-foreground font-mono text-sm flex-1">{ep.path}</code>
        {ep.auth && <Lock className="w-3.5 h-3.5 text-yellow-400" />}
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {expanded && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="border-t border-border p-4 space-y-4">
          <p className="text-muted-foreground text-sm">{ep.description}</p>
          {ep.params && (
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">Parameters</h4>
              <div className="space-y-1">
                {ep.params.map((p) => (
                  <div key={p.name} className="flex items-center gap-2 text-sm">
                    <code className="text-primary font-mono">{p.name}</code>
                    <span className="text-muted-foreground text-xs">({p.type})</span>
                    {p.required && <span className="text-xs text-red-400">required</span>}
                    <span className="text-muted-foreground text-xs ml-auto">{p.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Example Response</h4>
              <button onClick={copyResponse} className="text-muted-foreground hover:text-primary transition-colors">
                {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <pre className="bg-background rounded-lg p-3 text-xs font-mono text-foreground overflow-x-auto border border-border">
              {ep.exampleResponse}
            </pre>
          </div>
          <Button size="sm" variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
            <Play className="w-3 h-3" /> Try it
          </Button>
        </motion.div>
      )}
    </div>
  );
};

const ApiExplorer = () => {
  const categories = [...new Set(endpoints.map((e) => e.category))];

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto space-y-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            <span className="text-primary">API</span> Explorer
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Interactive documentation for the MolBot protocol. Test endpoints and integrate bot services.
          </p>
          <div className="flex justify-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Globe className="w-4 h-4" /> <span>Base URL: <code className="text-primary">api.molbot.xyz/v1</code></span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Zap className="w-4 h-4" /> <span>Auth: <code className="text-primary">x402 Payment Header</code></span>
            </div>
          </div>
        </motion.div>

        {/* Auth info */}
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="bg-card border border-primary/20 rounded-xl p-5">
          <h2 className="text-foreground font-semibold mb-2 flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" /> Authentication
          </h2>
          <p className="text-muted-foreground text-sm mb-3">
            Endpoints marked with <Lock className="w-3 h-3 inline text-yellow-400" /> require payment via x402.
            Include a payment proof in the request header:
          </p>
          <pre className="bg-background rounded-lg p-3 text-xs font-mono text-foreground border border-border">
{`curl -X POST api.molbot.xyz/v1/bots/bot_001/invoke \\
  -H "X-402-Payment: <stx_payment_proof>" \\
  -H "Content-Type: application/json" \\
  -d '{"task": "analyze dataset"}'`}
          </pre>
        </motion.div>

        {/* Endpoints by category */}
        {categories.map((cat) => (
          <motion.section key={cat} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">{cat}</h2>
            <div className="space-y-2">
              {endpoints.filter((e) => e.category === cat).map((ep) => (
                <EndpointCard key={ep.path + ep.method} ep={ep} />
              ))}
            </div>
          </motion.section>
        ))}
      </div>
    </div>
  );
};

export default ApiExplorer;
