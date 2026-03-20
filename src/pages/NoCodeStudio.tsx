import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Play, Trash2, RotateCcw, Zap, ChevronRight, GripVertical,
  CheckCircle2, Loader2, ArrowRight,
} from "lucide-react";

// ─── Component Definitions ───

interface MolbotPort {
  id: string;
  label: string;
  direction: "in" | "out";
}

interface MolbotComponentDef {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
  ports: MolbotPort[];
  category: "wallet" | "payment" | "display" | "logic";
}

const COMPONENT_DEFS: MolbotComponentDef[] = [
  {
    id: "wallet-connector-v1",
    label: "Wallet Connector",
    icon: "🔗",
    color: "hsl(var(--primary))",
    description: "Connects Bitcoin/Stacks wallet",
    category: "wallet",
    ports: [
      { id: "trigger", label: "Trigger", direction: "in" },
      { id: "walletAddress", label: "Address", direction: "out" },
      { id: "balances", label: "Balances", direction: "out" },
    ],
  },
  {
    id: "sbtc-x402-payment-v1",
    label: "sBTC Payment",
    icon: "⚡",
    color: "hsl(30, 100%, 50%)",
    description: "x402 micropayment via sBTC",
    category: "payment",
    ports: [
      { id: "trigger", label: "Trigger", direction: "in" },
      { id: "toAddress", label: "To Address", direction: "in" },
      { id: "amount", label: "Amount", direction: "in" },
      { id: "txid", label: "TxID", direction: "out" },
      { id: "status", label: "Status", direction: "out" },
    ],
  },
  {
    id: "usdcx-stream-v1",
    label: "USDCx Stream",
    icon: "⟳",
    color: "hsl(160, 100%, 42%)",
    description: "Streaming payments for long tasks",
    category: "payment",
    ports: [
      { id: "trigger", label: "Trigger", direction: "in" },
      { id: "botAddress", label: "Bot Address", direction: "in" },
      { id: "rate", label: "Rate/sec", direction: "in" },
      { id: "streamId", label: "Stream ID", direction: "out" },
      { id: "streamStatus", label: "Status", direction: "out" },
    ],
  },
  {
    id: "balance-cards-v1",
    label: "Balance Display",
    icon: "💰",
    color: "hsl(45, 100%, 50%)",
    description: "Shows sBTC/USDCx balances",
    category: "display",
    ports: [
      { id: "walletAddress", label: "Address", direction: "in" },
    ],
  },
  {
    id: "transaction-feed-v1",
    label: "Transaction Feed",
    icon: "📊",
    color: "hsl(var(--secondary))",
    description: "Live transaction activity",
    category: "display",
    ports: [
      { id: "txid", label: "New Tx", direction: "in" },
    ],
  },
  {
    id: "bot-registry-v1",
    label: "Bot Registry",
    icon: "📋",
    color: "hsl(200, 80%, 55%)",
    description: "Lookup bot details & pricing",
    category: "logic",
    ports: [
      { id: "botId", label: "Bot ID", direction: "in" },
      { id: "ownerAddress", label: "Owner", direction: "out" },
      { id: "price", label: "Price", direction: "out" },
    ],
  },
  {
    id: "payment-notification-v1",
    label: "Notifications",
    icon: "🔔",
    color: "hsl(0, 80%, 60%)",
    description: "Payment status alerts",
    category: "display",
    ports: [
      { id: "status", label: "Status", direction: "in" },
    ],
  },
];

// ─── Canvas Node ───

interface CanvasNode {
  instanceId: string;
  defId: string;
  x: number;
  y: number;
}

interface Wire {
  id: string;
  fromNode: string;
  fromPort: string;
  toNode: string;
  toPort: string;
}

// ─── Templates ───

interface FlowTemplate {
  name: string;
  description: string;
  nodes: Omit<CanvasNode, "instanceId">[];
  wires: { fromDefIdx: number; fromPort: string; toDefIdx: number; toPort: string }[];
}

const TEMPLATES: FlowTemplate[] = [
  {
    name: "Molbot Marketplace Wallet",
    description: "Complete wallet with balances, x402 payment, and live feed",
    nodes: [
      { defId: "wallet-connector-v1", x: 60, y: 40 },
      { defId: "balance-cards-v1", x: 380, y: 40 },
      { defId: "bot-registry-v1", x: 60, y: 220 },
      { defId: "sbtc-x402-payment-v1", x: 380, y: 220 },
      { defId: "transaction-feed-v1", x: 220, y: 400 },
      { defId: "payment-notification-v1", x: 520, y: 400 },
    ],
    wires: [
      { fromDefIdx: 0, fromPort: "balances", toDefIdx: 1, toPort: "walletAddress" },
      { fromDefIdx: 2, fromPort: "ownerAddress", toDefIdx: 3, toPort: "toAddress" },
      { fromDefIdx: 2, fromPort: "price", toDefIdx: 3, toPort: "amount" },
      { fromDefIdx: 3, fromPort: "txid", toDefIdx: 4, toPort: "txid" },
      { fromDefIdx: 3, fromPort: "status", toDefIdx: 5, toPort: "status" },
    ],
  },
  {
    name: "x402 Micro-Payment Flow",
    description: "Minimal sBTC payment with wallet check",
    nodes: [
      { defId: "wallet-connector-v1", x: 60, y: 120 },
      { defId: "sbtc-x402-payment-v1", x: 380, y: 120 },
      { defId: "payment-notification-v1", x: 380, y: 300 },
    ],
    wires: [
      { fromDefIdx: 0, fromPort: "walletAddress", toDefIdx: 1, toPort: "toAddress" },
      { fromDefIdx: 1, fromPort: "status", toDefIdx: 2, toPort: "status" },
    ],
  },
  {
    name: "USDCx Streaming Setup",
    description: "Stream payments for long-running bot tasks",
    nodes: [
      { defId: "wallet-connector-v1", x: 60, y: 80 },
      { defId: "bot-registry-v1", x: 60, y: 260 },
      { defId: "usdcx-stream-v1", x: 380, y: 160 },
      { defId: "transaction-feed-v1", x: 380, y: 360 },
    ],
    wires: [
      { fromDefIdx: 0, fromPort: "balances", toDefIdx: 2, toPort: "trigger" },
      { fromDefIdx: 1, fromPort: "ownerAddress", toDefIdx: 2, toPort: "botAddress" },
      { fromDefIdx: 2, fromPort: "streamId", toDefIdx: 3, toPort: "txid" },
    ],
  },
];

// ─── Main Component ───

const NoCodeStudio = () => {
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoStep, setDemoStep] = useState(-1);
  const [wiringFrom, setWiringFrom] = useState<{ nodeId: string; portId: string } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const getDef = (defId: string) => COMPONENT_DEFS.find((d) => d.id === defId)!;

  // Drag from palette
  const handlePaletteDragStart = (defId: string, e: React.DragEvent) => {
    e.dataTransfer.setData("defId", defId);
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const defId = e.dataTransfer.getData("defId");
    if (!defId) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left - 100;
    const y = e.clientY - rect.top - 40;
    setNodes((prev) => [
      ...prev,
      { instanceId: `${defId}-${Date.now()}`, defId, x: Math.max(0, x), y: Math.max(0, y) },
    ]);
  };

  // Move nodes on canvas
  const handleNodeMouseDown = (instanceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const node = nodes.find((n) => n.instanceId === instanceId);
    if (!node) return;
    setDragging(instanceId);
    setSelectedNode(instanceId);
    setDragOffset({ x: e.clientX - node.x, y: e.clientY - node.y });
  };

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left - dragOffset.x + rect.left;
      const y = e.clientY - rect.top - dragOffset.y + rect.top;
      setNodes((prev) =>
        prev.map((n) => (n.instanceId === dragging ? { ...n, x: Math.max(0, x), y: Math.max(0, y) } : n))
      );
    },
    [dragging, dragOffset]
  );

  const handleCanvasMouseUp = () => setDragging(null);

  // Wiring
  const handlePortClick = (nodeId: string, portId: string, direction: "in" | "out") => {
    if (direction === "out") {
      setWiringFrom({ nodeId, portId });
    } else if (wiringFrom) {
      // Complete wire
      if (wiringFrom.nodeId !== nodeId) {
        setWires((prev) => [
          ...prev,
          {
            id: `wire-${Date.now()}`,
            fromNode: wiringFrom.nodeId,
            fromPort: wiringFrom.portId,
            toNode: nodeId,
            toPort: portId,
          },
        ]);
      }
      setWiringFrom(null);
    }
  };

  const deleteNode = (instanceId: string) => {
    setNodes((prev) => prev.filter((n) => n.instanceId !== instanceId));
    setWires((prev) => prev.filter((w) => w.fromNode !== instanceId && w.toNode !== instanceId));
    setSelectedNode(null);
  };

  const clearCanvas = () => {
    setNodes([]);
    setWires([]);
    setSelectedNode(null);
    setWiringFrom(null);
  };

  const loadTemplate = (template: FlowTemplate) => {
    const newNodes: CanvasNode[] = template.nodes.map((n, i) => ({
      instanceId: `${n.defId}-tmpl-${i}`,
      defId: n.defId,
      x: n.x,
      y: n.y,
    }));
    const newWires: Wire[] = template.wires.map((w, i) => ({
      id: `wire-tmpl-${i}`,
      fromNode: newNodes[w.fromDefIdx].instanceId,
      fromPort: w.fromPort,
      toNode: newNodes[w.toDefIdx].instanceId,
      toPort: w.toPort,
    }));
    setNodes(newNodes);
    setWires(newWires);
    setSelectedNode(null);
    toast.success(`Loaded "${template.name}"`);
  };

  // Demo execution
  const runDemo = async () => {
    if (nodes.length === 0) {
      toast.error("Drop some components first!");
      return;
    }
    setDemoRunning(true);
    const steps = nodes.length;
    for (let i = 0; i < steps; i++) {
      setDemoStep(i);
      await new Promise((r) => setTimeout(r, 1200));
    }
    setDemoStep(-1);
    setDemoRunning(false);
    toast.success("Demo flow completed!", { description: "All molbot components executed successfully" });
  };

  // Compute wire SVG paths
  const getPortPosition = (nodeId: string, portId: string, direction: "in" | "out") => {
    const node = nodes.find((n) => n.instanceId === nodeId);
    if (!node) return { x: 0, y: 0 };
    const def = getDef(node.defId);
    const ports = def.ports.filter((p) => p.direction === direction);
    const idx = ports.findIndex((p) => p.id === portId);
    const nodeW = 220;
    const headerH = 58;
    const portSpacing = 24;
    const x = direction === "out" ? node.x + nodeW : node.x;
    const y = node.y + headerH + 12 + idx * portSpacing;
    return { x, y };
  };

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="flex h-[calc(100vh-64px)]">
        {/* Left: Component Palette */}
        <div className="w-64 border-r border-border/50 bg-card/50 flex flex-col overflow-hidden flex-shrink-0">
          <div className="p-4 border-b border-border/30">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Molbot Palette
            </h2>
            <p className="text-[10px] text-muted-foreground mt-1">
              Drag components to canvas
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {(["wallet", "payment", "display", "logic"] as const).map((cat) => (
              <div key={cat}>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-1.5 px-1">
                  {cat}
                </p>
                {COMPONENT_DEFS.filter((d) => d.category === cat).map((def) => (
                  <div
                    key={def.id}
                    draggable
                    onDragStart={(e) => handlePaletteDragStart(def.id, e)}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg cursor-grab active:cursor-grabbing border border-transparent hover:border-border/50 hover:bg-muted/10 transition-all group"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                      style={{ backgroundColor: `${def.color}15`, border: `1px solid ${def.color}30` }}
                    >
                      {def.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{def.label}</p>
                      <p className="text-[9px] text-muted-foreground truncate">{def.description}</p>
                    </div>
                    <GripVertical className="w-3 h-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 ml-auto flex-shrink-0" />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Templates */}
          <div className="border-t border-border/30 p-3">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-2 px-1">
              Templates
            </p>
            <div className="space-y-1.5">
              {TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.name}
                  onClick={() => loadTemplate(tmpl)}
                  className="w-full text-left p-2 rounded-lg hover:bg-muted/10 border border-transparent hover:border-border/30 transition-all"
                >
                  <p className="text-[11px] font-medium text-foreground">{tmpl.name}</p>
                  <p className="text-[9px] text-muted-foreground">{tmpl.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="h-12 border-b border-border/30 bg-card/30 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono">
                {nodes.length} components · {wires.length} wires
              </span>
              {wiringFrom && (
                <span className="text-[10px] text-primary animate-pulse font-mono">
                  Click an input port to connect…
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={clearCanvas}
                disabled={nodes.length === 0}
                className="h-7 text-[11px] border-border text-muted-foreground gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Clear
              </Button>
              <Button
                size="sm"
                onClick={runDemo}
                disabled={demoRunning || nodes.length === 0}
                className="h-7 text-[11px] bg-primary text-primary-foreground hover:bg-primary/90 gap-1"
              >
                {demoRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                {demoRunning ? "Running…" : "Run Demo"}
              </Button>
            </div>
          </div>

          {/* Canvas area */}
          <div
            ref={canvasRef}
            className="flex-1 relative overflow-auto"
            style={{
              backgroundImage:
                "radial-gradient(circle, hsl(var(--border) / 0.3) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleCanvasDrop}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onClick={() => {
              setSelectedNode(null);
              setWiringFrom(null);
            }}
          >
            {/* Empty state */}
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-4xl mb-3">🧩</p>
                  <p className="text-sm text-muted-foreground font-medium">
                    Drag molbot components here
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    Or load a template from the sidebar
                  </p>
                </div>
              </div>
            )}

            {/* Wire SVGs */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minWidth: 900, minHeight: 600 }}>
              {wires.map((wire) => {
                const from = getPortPosition(wire.fromNode, wire.fromPort, "out");
                const to = getPortPosition(wire.toNode, wire.toPort, "in");
                const dx = Math.abs(to.x - from.x) * 0.4;
                const isActive = demoRunning && demoStep >= 0;
                return (
                  <g key={wire.id}>
                    <path
                      d={`M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`}
                      fill="none"
                      stroke="hsl(var(--primary) / 0.3)"
                      strokeWidth="2"
                    />
                    {isActive && (
                      <circle r="4" fill="hsl(var(--primary))">
                        <animateMotion
                          dur="1.5s"
                          repeatCount="indefinite"
                          path={`M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`}
                        />
                      </circle>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Nodes */}
            {nodes.map((node, idx) => {
              const def = getDef(node.defId);
              const isSelected = selectedNode === node.instanceId;
              const isActiveStep = demoRunning && demoStep === idx;
              const isCompleted = demoRunning && demoStep > idx;

              return (
                <motion.div
                  key={node.instanceId}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{
                    opacity: 1,
                    scale: isActiveStep ? 1.03 : 1,
                  }}
                  style={{
                    position: "absolute",
                    left: node.x,
                    top: node.y,
                    width: 220,
                  }}
                  onMouseDown={(e) => handleNodeMouseDown(node.instanceId, e)}
                  onClick={(e) => e.stopPropagation()}
                  className={`rounded-xl border transition-all cursor-move select-none ${
                    isSelected
                      ? "border-primary/60 shadow-[0_0_16px_hsl(var(--primary)/0.2)]"
                      : isActiveStep
                      ? "border-primary shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
                      : isCompleted
                      ? "border-emerald-500/40"
                      : "border-border/50"
                  }`}
                  style={{
                    position: "absolute",
                    left: node.x,
                    top: node.y,
                    width: 220,
                    background: "linear-gradient(145deg, hsl(var(--space-surface)), hsl(var(--space-deep) / 0.9))",
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/30">
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center text-sm"
                      style={{ backgroundColor: `${def.color}15`, border: `1px solid ${def.color}30` }}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : isActiveStep ? (
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      ) : (
                        def.icon
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-foreground truncate">{def.label}</p>
                      <p className="text-[8px] text-muted-foreground/60 font-mono">{def.id}</p>
                    </div>
                    {isSelected && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteNode(node.instanceId); }}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Ports */}
                  <div className="px-2 py-1.5">
                    {def.ports.filter((p) => p.direction === "in").length > 0 && (
                      <div className="mb-1">
                        {def.ports
                          .filter((p) => p.direction === "in")
                          .map((port) => (
                            <button
                              key={port.id}
                              onClick={(e) => { e.stopPropagation(); handlePortClick(node.instanceId, port.id, "in"); }}
                              className={`flex items-center gap-1.5 w-full px-1.5 py-1 rounded text-left hover:bg-muted/15 transition-colors ${
                                wiringFrom ? "ring-1 ring-primary/30" : ""
                              }`}
                            >
                              <span className="w-2 h-2 rounded-full bg-primary/40 flex-shrink-0" />
                              <span className="text-[9px] text-muted-foreground">{port.label}</span>
                              <ArrowRight className="w-2.5 h-2.5 text-muted-foreground/30 ml-auto" />
                            </button>
                          ))}
                      </div>
                    )}
                    {def.ports.filter((p) => p.direction === "out").length > 0 && (
                      <div>
                        {def.ports
                          .filter((p) => p.direction === "out")
                          .map((port) => (
                            <button
                              key={port.id}
                              onClick={(e) => { e.stopPropagation(); handlePortClick(node.instanceId, port.id, "out"); }}
                              className="flex items-center gap-1.5 w-full px-1.5 py-1 rounded text-left hover:bg-muted/15 transition-colors"
                            >
                              <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/30" />
                              <span className="text-[9px] text-foreground/80">{port.label}</span>
                              <span
                                className="w-2 h-2 rounded-full ml-auto flex-shrink-0"
                                style={{ backgroundColor: def.color + "80" }}
                              />
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right: Properties */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-l border-border/50 bg-card/50 overflow-hidden flex-shrink-0"
            >
              {(() => {
                const node = nodes.find((n) => n.instanceId === selectedNode);
                if (!node) return null;
                const def = getDef(node.defId);
                const nodeWires = wires.filter(
                  (w) => w.fromNode === node.instanceId || w.toNode === node.instanceId
                );
                return (
                  <div className="w-[280px] p-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                        style={{ backgroundColor: `${def.color}15`, border: `1px solid ${def.color}30` }}
                      >
                        {def.icon}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{def.label}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{def.id}</p>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">{def.description}</p>

                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-2">
                        Ports
                      </p>
                      <div className="space-y-1">
                        {def.ports.map((port) => (
                          <div
                            key={port.id}
                            className="flex items-center justify-between px-2 py-1.5 rounded bg-muted/10"
                          >
                            <span className="text-[10px] text-foreground">{port.label}</span>
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                                port.direction === "in"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-secondary/10 text-secondary"
                              }`}
                            >
                              {port.direction}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {nodeWires.length > 0 && (
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-2">
                          Connections ({nodeWires.length})
                        </p>
                        <div className="space-y-1">
                          {nodeWires.map((w) => {
                            const otherNodeId = w.fromNode === node.instanceId ? w.toNode : w.fromNode;
                            const otherNode = nodes.find((n) => n.instanceId === otherNodeId);
                            const otherDef = otherNode ? getDef(otherNode.defId) : null;
                            return (
                              <div key={w.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/10">
                                <span className="text-[10px]">{otherDef?.icon}</span>
                                <span className="text-[10px] text-foreground truncate">
                                  {otherDef?.label ?? "Unknown"}
                                </span>
                                <button
                                  onClick={() => setWires((prev) => prev.filter((x) => x.id !== w.id))}
                                  className="text-muted-foreground hover:text-destructive ml-auto"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Mock config */}
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-2">
                        Config (JSON)
                      </p>
                      <pre className="text-[9px] font-mono text-foreground/60 bg-muted/10 rounded-lg p-3 overflow-x-auto max-h-40">
{JSON.stringify(
  {
    component: def.id,
    version: "v1",
    visual: { icon: def.icon, color: def.color },
    ports: def.ports.map((p) => ({ id: p.id, direction: p.direction })),
  },
  null,
  2
)}
                      </pre>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteNode(node.instanceId)}
                      className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 gap-1 text-[11px]"
                    >
                      <Trash2 className="w-3 h-3" /> Remove Component
                    </Button>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default NoCodeStudio;
