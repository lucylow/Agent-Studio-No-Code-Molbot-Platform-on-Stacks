import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, DollarSign, FileText, Loader2, Copy, Check } from "lucide-react";

interface SkillBotCardProps {
  bot?: {
    id: number;
    name: string;
    price_amount: number;
    price_asset: string;
  };
}

const SkillBotCard = ({ bot }: SkillBotCardProps) => {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ content: string; contentType: string; payment: any } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!user) {
      toast.error("Please sign in first");
      return;
    }
    if (!prompt.trim()) {
      toast.error("Enter a prompt");
      return;
    }
    if (prompt.length > 1000) {
      toast.error("Prompt must be under 1000 characters");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const session = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/skill-bot?action=generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "idempotency-key": crypto.randomUUID(),
          },
          body: JSON.stringify({
            botId: bot?.id,
            prompt: prompt.trim(),
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setResult(data);
      toast.success("Content generated!", {
        description: `Paid ${data.payment.amount} ${data.payment.asset} via x402`,
      });
    } catch (err: any) {
      toast.error(err.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const copyContent = () => {
    if (result?.content) {
      navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const price = bot?.price_amount ?? 0.5;
  const asset = bot?.price_asset ?? "USDCx";

  return (
    <div className="gradient-border-card rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {bot?.name ?? "Content Generator"}
              </h3>
              <p className="text-xs text-muted-foreground">x402-powered skill bot</p>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2 py-1 rounded-md bg-secondary/10 text-secondary border border-secondary/15">
            x402
          </span>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Generate blog posts, social content, emails, and summaries. Every request is paid via USDCx through the x402 protocol.
        </p>

        {/* Price */}
        <div className="flex items-center gap-2 mb-4 py-2 px-3 rounded-lg bg-muted/20 border border-border/30">
          <DollarSign className="w-4 h-4 text-secondary" />
          <span className="font-mono text-sm text-secondary font-semibold">{price} {asset}</span>
          <span className="text-xs text-muted-foreground">per request</span>
        </div>

        {/* Prompt Input */}
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder='Try: "Write a blog post about autonomous AI agents on Bitcoin"'
          maxLength={1000}
          rows={3}
          className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 resize-none"
        />
        <div className="flex items-center justify-between mt-1 mb-3">
          <p className="text-[10px] text-muted-foreground">
            blog • tweet • email • summary
          </p>
          <p className="text-[10px] text-muted-foreground">{prompt.length}/1000</p>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Generating & Paying...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> Generate ({price} {asset})
            </>
          )}
        </Button>
      </div>

      {/* Result */}
      {result && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="border-t border-border/30"
        >
          <div className="p-6 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-foreground">
                  {result.contentType.replace('_', ' ')}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyContent}
                className="text-muted-foreground hover:text-foreground h-7 px-2 gap-1"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>

            <div className="bg-background/50 rounded-lg p-4 border border-border/30 max-h-64 overflow-y-auto">
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {result.content}
              </p>
            </div>

            {/* Payment receipt */}
            <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground/60 font-mono">
              <span>x402 tx: {result.payment.txId.slice(0, 16)}...</span>
              <span>•</span>
              <span>{result.payment.amount} {result.payment.asset}</span>
              <span>•</span>
              <span>confirmed</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default SkillBotCard;
