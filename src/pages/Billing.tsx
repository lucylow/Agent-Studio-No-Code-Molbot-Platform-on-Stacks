import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { Link } from "react-router-dom";

const Billing = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background pt-24 pb-16 px-4">
      <div className="container mx-auto max-w-3xl">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-foreground">Billing</h1>
          <p className="text-muted-foreground text-lg mt-2">
            Fireblocks MPC + credits integration is coming soon.
          </p>
        </div>

        {!user ? (
          <div className="glass-card rounded-xl p-6">
            <p className="text-sm text-muted-foreground mb-4">
              Sign in to view wallet-linked billing and usage.
            </p>
            <Link to="/auth">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan gap-2">
                <Wallet className="w-4 h-4" />
                Connect Stacks
              </Button>
            </Link>
          </div>
        ) : (
          <div className="glass-card rounded-xl p-6">
            <p className="text-sm text-muted-foreground mb-2">What you can expect:</p>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
              <li>Credits-based bot execution</li>
              <li>On-chain/off-chain usage tracking</li>
              <li>Fireblocks MPC payment flows</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Billing;

